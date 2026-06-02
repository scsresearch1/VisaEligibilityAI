import { appConfig } from '../../../config/app.config'
import { buildInsightsSystemPrompt, buildInsightsUserPrompt } from '../prompt'
import {
  groqKeySetupHint,
  isGroqRequestTooLargeError,
  trimGroqPrompts,
} from '../trim-prompt'

function groqMaxCompletionTokens(aggressive: boolean): number {
  const llm = appConfig.llm
  return aggressive
    ? (llm.groqMaxCompletionTokensAggressive ?? 1024)
    : (llm.groqMaxCompletionTokens ?? 1200)
}

async function callGroqOnce(
  systemInstruction: string,
  userText: string,
  aggressive: boolean,
): Promise<string> {
  const key = appConfig.llm.groqApiKey.trim()
  if (!key || key.startsWith('YOUR_')) {
    throw new Error(`Groq API key missing. ${groqKeySetupHint()}`)
  }

  const trimmed = trimGroqPrompts(systemInstruction, userText, { aggressive })
  const maxTokens = groqMaxCompletionTokens(aggressive)

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
    choices?: { message?: { content?: string } }[]
  }
  const text = data.choices?.[0]?.message?.content
  if (!text) throw new Error('Empty response from Groq')
  return text
}

export async function callGroqWithPrompts(
  systemInstruction: string,
  userText: string,
): Promise<string> {
  try {
    return await callGroqOnce(systemInstruction, userText, false)
  } catch (firstError) {
    const message = firstError instanceof Error ? firstError.message : String(firstError)
    if (!isGroqRequestTooLargeError(message)) {
      throw firstError
    }
    return callGroqOnce(systemInstruction, userText, true)
  }
}

export async function callGroq(
  profileContext: string,
  eligibilityRulesBlock?: string,
): Promise<string> {
  return callGroqWithPrompts(
    buildInsightsSystemPrompt(eligibilityRulesBlock),
    buildInsightsUserPrompt(profileContext),
  )
}
