import { appConfig } from '../../config/app.config'

export function trimForLlm(text: string, maxChars: number): string {
  const t = text.trim()
  if (t.length <= maxChars) return t
  return `${t.slice(0, maxChars)}\n\n...[input truncated for model token limit]`
}

export function getProfileSnippetLimit(forGroq: boolean): number {
  if (forGroq) {
    return (appConfig.llm as { groqMaxProfileChars?: number }).groqMaxProfileChars ?? 4500
  }
  return appConfig.llm.maxProfileChars ?? 8000
}

/** Cap system + user payload for Groq on_demand TPM (≈12k tokens/min per request). */
export function trimGroqPrompts(system: string, user: string): { system: string; user: string } {
  const cfg = appConfig.llm as { groqMaxSystemChars?: number; groqMaxUserChars?: number }
  const maxSystem = cfg.groqMaxSystemChars ?? 5000
  const maxUser = cfg.groqMaxUserChars ?? 6500
  return {
    system: trimForLlm(system, maxSystem),
    user: trimForLlm(user, maxUser),
  }
}

export function isLikelyGoogleAiStudioKey(key: string): boolean {
  const k = key.trim()
  return k.startsWith('AIza') && k.length >= 20
}

export function validateGeminiApiKey(key: string): void {
  const k = key.trim()
  if (!k) throw new Error('Gemini API key missing — add geminiApiKey in src/config/app.config.ts')
  if (k.startsWith('AQ.')) {
    throw new Error(
      'Invalid Gemini key format (AQ.*). Create a Google AI Studio API key (starts with AIza) at https://aistudio.google.com/apikey and paste it into geminiApiKey.',
    )
  }
  if (!isLikelyGoogleAiStudioKey(k)) {
    console.warn(
      'Gemini key does not look like a Google AI Studio key (expected AIza...). If calls return 401, replace the key at https://aistudio.google.com/apikey',
    )
  }
}
