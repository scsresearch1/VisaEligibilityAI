import { appConfig } from '../../../config/app.config'
import { buildInsightsSystemPrompt, buildInsightsUserPrompt } from '../prompt'
import {
  GeminiRateLimitError,
  geminiCooldownRemainingMs,
  isGeminiInCooldown,
  markGeminiRateLimited,
} from './gemini-rate-limit'
import { enqueueGeminiRequest } from './gemini-queue'
import { validateGeminiApiKey } from '../trim-prompt'

/** Retry same model on transient errors; try next model only on 404 / unsupported. */
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504])
const TRY_NEXT_MODEL_STATUS = new Set([404])

const MAX_ATTEMPTS_DEFAULT = 3
const MAX_ATTEMPTS_RATE_LIMIT = 2

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function parseRetryDelayMs(res: Response, attempt: number): number {
  const retryAfter = res.headers.get('retry-after')
  if (retryAfter) {
    const seconds = Number(retryAfter)
    if (!Number.isNaN(seconds)) return Math.min(seconds * 1000, 120_000)
  }
  return Math.min(4000 * 2 ** attempt, 45_000)
}

async function callGeminiModelRaw(
  model: string,
  systemInstruction: string,
  userText: string,
): Promise<string> {
  if (isGeminiInCooldown()) {
    const secs = Math.ceil(geminiCooldownRemainingMs() / 1000)
    throw new GeminiRateLimitError(
      `Gemini quota cooldown (${secs}s remaining). Using profile-based results.`,
    )
  }

  const key = appConfig.llm.geminiApiKey.trim()
  validateGeminiApiKey(key)

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`

  let lastError = 'Unknown error'
  let maxAttempts = MAX_ATTEMPTS_DEFAULT

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 120_000)

    let res: Response
    try {
      res = await fetch(url, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': key,
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemInstruction }] },
          contents: [{ role: 'user', parts: [{ text: userText }] }],
          generationConfig: {
            temperature: appConfig.llm.temperature ?? 0.2,
            topP: appConfig.llm.topP ?? 0.9,
            maxOutputTokens: 8192,
            responseMimeType: 'application/json',
          },
        }),
      })
    } catch (e) {
      clearTimeout(timeout)
      if (e instanceof Error && e.name === 'AbortError') {
        throw new Error('Gemini request timed out after 120s')
      }
      throw e
    } finally {
      clearTimeout(timeout)
    }

    if (res.ok) {
      const data = (await res.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[]
      }
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text
      if (!text) throw new Error('Empty response from Gemini')
      return text
    }

    const errBody = await res.text()
    lastError = `Gemini API ${res.status}: ${errBody.slice(0, 200)}`

    if (res.status === 429) {
      markGeminiRateLimited()
      maxAttempts = Math.min(maxAttempts, MAX_ATTEMPTS_RATE_LIMIT)
    }

    if (RETRYABLE_STATUS.has(res.status) && attempt < maxAttempts - 1) {
      const base = parseRetryDelayMs(res, attempt)
      const extra = res.status === 429 ? 6000 : res.status === 503 ? 3000 : 0
      await sleep(base + extra)
      continue
    }

    if (res.status === 429) {
      throw new GeminiRateLimitError(lastError)
    }

    if (TRY_NEXT_MODEL_STATUS.has(res.status) || RETRYABLE_STATUS.has(res.status)) {
      throw new Error(lastError)
    }

    throw new Error(lastError)
  }

  throw new Error(lastError)
}

async function callGeminiModel(
  model: string,
  profileContext: string,
  eligibilityRulesBlock?: string,
): Promise<string> {
  return callGeminiModelRaw(
    model,
    buildInsightsSystemPrompt(eligibilityRulesBlock),
    buildInsightsUserPrompt(profileContext),
  )
}

function shouldTryNextModel(err: Error): boolean {
  if (err instanceof GeminiRateLimitError) return false
  if (err.message.includes('429')) return false
  if (err.message.includes('404')) return true
  if (err.message.includes('not found') || err.message.includes('is not supported')) return true
  return false
}

async function callWithModelFallback(
  invoke: (model: string) => Promise<string>,
): Promise<{ text: string; modelUsed: string }> {
  const models = [
    appConfig.llm.geminiModel,
    ...appConfig.llm.geminiModelFallbacks.filter((m) => m !== appConfig.llm.geminiModel),
  ]

  let lastError: Error | null = null

  for (const model of models) {
    try {
      const text = await invoke(model)
      return { text, modelUsed: model }
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e))
      if (!shouldTryNextModel(lastError)) throw lastError
    }
  }

  throw lastError ?? new Error('Gemini request failed')
}

export async function callGemini(
  profileContext: string,
  eligibilityRulesBlock?: string,
): Promise<{ text: string; modelUsed: string }> {
  return enqueueGeminiRequest(() =>
    callWithModelFallback((model) =>
      callGeminiModel(model, profileContext, eligibilityRulesBlock),
    ),
  )
}

export async function callGeminiWithPrompts(
  systemInstruction: string,
  userText: string,
): Promise<{ text: string; modelUsed: string }> {
  return enqueueGeminiRequest(() =>
    callWithModelFallback((model) => callGeminiModelRaw(model, systemInstruction, userText)),
  )
}
