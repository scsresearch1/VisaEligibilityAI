import { appConfig } from '../../../config/app.config'
import { buildInsightsSystemPrompt, buildInsightsUserPrompt } from '../prompt'
import { trimGroqPrompts } from '../trim-prompt'

export async function callGroqWithPrompts(
  systemInstruction: string,
  userText: string,
): Promise<string> {
  const key = appConfig.llm.groqApiKey.trim()
  if (!key) throw new Error('Groq API key missing — add groqApiKey in src/config/app.config.ts')

  const trimmed = trimGroqPrompts(systemInstruction, userText)

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
      max_tokens: 4096,
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

export async function callGroq(
  profileContext: string,
  eligibilityRulesBlock?: string,
): Promise<string> {
  const key = appConfig.llm.groqApiKey.trim()
  if (!key) throw new Error('Groq API key missing — add groqApiKey in src/config/app.config.ts')

  return callGroqWithPrompts(
    buildInsightsSystemPrompt(eligibilityRulesBlock),
    buildInsightsUserPrompt(profileContext),
  )
}
