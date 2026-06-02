import { appConfig } from '../../../config/app.config'
import { buildInsightsSystemPrompt, buildInsightsUserPrompt } from '../prompt'
import {
  groqKeySetupHint,
  isGroqRequestTooLargeError,
  trimGroqPrompts,
  type TrimGroqOptions,
} from '../trim-prompt'

/** Groq request profile — balances 6000 token/request cap vs JSON size. */
export type GroqPromptSize = 'default' | 'full-analysis' | 'roadmap-only'

function groqMaxCompletionTokens(aggressive: boolean, size: GroqPromptSize): number {
  const llm = appConfig.llm
  if (size === 'full-analysis') {
    return aggressive
      ? (llm.groqMaxCompletionTokensAggressive ?? 1536)
      : (llm.groqMaxCompletionTokensLargeJson ?? 2048)
  }
  if (size === 'roadmap-only') {
    return aggressive ? 1200 : (llm.groqMaxCompletionTokensRoadmap ?? 1600)
  }
  return aggressive
    ? (llm.groqMaxCompletionTokensAggressive ?? 1024)
    : (llm.groqMaxCompletionTokens ?? 1200)
}

function trimOptionsForSize(size: GroqPromptSize, aggressive: boolean): TrimGroqOptions {
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
    console.warn('[groq] Response hit max_tokens — JSON may be incomplete.')
  }
  return text
}

export async function callGroqWithPrompts(
  systemInstruction: string,
  userText: string,
  size: GroqPromptSize = 'default',
): Promise<string> {
  try {
    return await callGroqOnce(systemInstruction, userText, false, size)
  } catch (firstError) {
    const message = firstError instanceof Error ? firstError.message : String(firstError)
    if (!isGroqRequestTooLargeError(message)) {
      throw firstError
    }
    return callGroqOnce(systemInstruction, userText, true, size)
  }
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
