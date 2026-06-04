import { appConfig } from '../../../config/app.config'
import { buildInsightsSystemPrompt, buildInsightsUserPrompt } from '../prompt'
import {
  groqKeySetupHint,
  isGroqRateLimitError,
  isGroqRequestTooLargeError,
  parseGroqRetryDelayMs,
  trimGroqPrompts,
  type TrimGroqOptions,
} from '../trim-prompt'
import { delayBetweenGroqCalls, enqueueGroqRequest } from './groq-queue'

/** Groq request profile — balances 6000 token/request cap vs JSON size. */
export type GroqPromptSize =
  | 'default'
  | 'full-analysis'
  | 'roadmap-only'
  | 'analysis-core'
  | 'compact-analysis'

export class GroqTruncatedError extends Error {
  constructor(message = 'Groq response truncated (max_tokens)') {
    super(message)
    this.name = 'GroqTruncatedError'
  }
}

function groqMaxCompletionTokens(aggressive: boolean, size: GroqPromptSize): number {
  const llm = appConfig.llm
  if (size === 'compact-analysis') {
    return 2800
  }
  if (size === 'analysis-core') {
    return aggressive ? 1400 : 2000
  }
  if (size === 'full-analysis') {
    return aggressive
      ? (llm.groqMaxCompletionTokensAggressive ?? 1536)
      : Math.min(2200, llm.groqMaxCompletionTokensLargeJson ?? 2000)
  }
  if (size === 'roadmap-only') {
    return aggressive ? 1024 : (llm.groqMaxCompletionTokensRoadmap ?? 1400)
  }
  return aggressive
    ? (llm.groqMaxCompletionTokensAggressive ?? 1024)
    : (llm.groqMaxCompletionTokens ?? 1200)
}

function trimOptionsForSize(size: GroqPromptSize, aggressive: boolean): TrimGroqOptions {
  if (size === 'compact-analysis') {
    return { aggressive: true, preferMaxCompletion: true }
  }
  if (size === 'analysis-core') {
    return { aggressive, preferCoreBudget: true }
  }
  if (size === 'full-analysis') {
    return { aggressive, preferLargeJsonBudget: true }
  }
  if (size === 'roadmap-only') {
    return { aggressive, preferRoadmapBudget: true }
  }
  return { aggressive }
}

async function callGroqOnce(
  systemInstruction: string,
  userText: string,
  aggressive: boolean,
  size: GroqPromptSize,
): Promise<string> {
  const key = appConfig.llm.groqApiKey.trim()
  if (!key || key.startsWith('YOUR_')) {
    throw new Error(`Groq API key missing. ${groqKeySetupHint()}`)
  }

  const trimmed = trimGroqPrompts(systemInstruction, userText, trimOptionsForSize(size, aggressive))
  const maxTokens = groqMaxCompletionTokens(aggressive, size)

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: appConfig.llm.groqModel,
      temperature: appConfig.llm.temperature ?? 0.2,
      top_p: appConfig.llm.topP ?? 0.9,
      max_tokens: maxTokens,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: trimmed.system },
        { role: 'user', content: trimmed.user },
      ],
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Groq API ${res.status}: ${err.slice(0, 300)}`)
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string }; finish_reason?: string }[]
  }
  const text = data.choices?.[0]?.message?.content
  if (!text) throw new Error('Empty response from Groq')

  if (data.choices?.[0]?.finish_reason === 'length') {
    if (size === 'full-analysis' && !aggressive) {
      return callGroqOnce(systemInstruction, userText, true, size)
    }
    if (size === 'full-analysis' && aggressive) {
      return callGroqOnce(systemInstruction, userText, true, 'compact-analysis')
    }
    throw new GroqTruncatedError(
      'Groq response truncated (max_tokens) — JSON incomplete.',
    )
  }

  return text
}

async function callGroqWithRetries(
  systemInstruction: string,
  userText: string,
  size: GroqPromptSize,
): Promise<string> {
  let lastError: unknown
  const maxAttempts = 5

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await callGroqOnce(systemInstruction, userText, false, size)
    } catch (error) {
      lastError = error
      const message = error instanceof Error ? error.message : String(error)

      if (isGroqRequestTooLargeError(message) && attempt < maxAttempts - 1) {
        try {
          return await callGroqOnce(systemInstruction, userText, true, size)
        } catch (inner) {
          lastError = inner
        }
        continue
      }

      if (isGroqRateLimitError(message) && attempt < maxAttempts - 1) {
        await new Promise((r) => setTimeout(r, parseGroqRetryDelayMs(message, attempt)))
        continue
      }

      if (
        (error instanceof GroqTruncatedError || /truncated|max_tokens/i.test(message)) &&
        attempt < maxAttempts - 1
      ) {
        continue
      }

      throw error
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError))
}

export async function callGroqWithPrompts(
  systemInstruction: string,
  userText: string,
  size: GroqPromptSize = 'default',
): Promise<string> {
  return enqueueGroqRequest(() => callGroqWithRetries(systemInstruction, userText, size))
}

export async function callGroq(
  profileContext: string,
  eligibilityRulesBlock?: string,
): Promise<string> {
  return callGroqWithPrompts(
    buildInsightsSystemPrompt(eligibilityRulesBlock),
    buildInsightsUserPrompt(profileContext),
    'default',
  )
}

export { delayBetweenGroqCalls }
