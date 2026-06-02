import { appConfig } from '../../config/app.config'

/** Groq on_demand llama-3.1-8b-instant: ~6000 tokens per request (input + completion budget). */
export const GROQ_ON_DEMAND_REQUEST_TOKEN_LIMIT = 6000

export function trimForLlm(text: string, maxChars: number): string {
  const t = text.trim()
  if (t.length <= maxChars) return t
  return `${t.slice(0, maxChars)}\n\n...[input truncated for model token limit]`
}

/** Rough token estimate for English JSON prompts (~3.5 chars/token). */
export function estimatePromptTokens(text: string): number {
  return Math.ceil(text.length / 3.5)
}

export function getProfileSnippetLimit(forGroq: boolean): number {
  if (forGroq) {
    return appConfig.llm.groqMaxProfileChars ?? 2800
  }
  return appConfig.llm.maxProfileChars ?? 8000
}

export type TrimGroqOptions = {
  /** Second pass after Groq 413 — tighter caps */
  aggressive?: boolean
}

/**
 * Cap Groq system + user so input tokens + max_completion stay under on_demand TPM (~6000).
 * Previously used 5k+6k chars (~3k+ tokens each) plus max_tokens=4096 → 6498+ token requests.
 */
export function trimGroqPrompts(
  system: string,
  user: string,
  options?: TrimGroqOptions,
): { system: string; user: string } {
  const aggressive = options?.aggressive ?? false
  const llm = appConfig.llm

  const completionBudget = aggressive
    ? (llm.groqMaxCompletionTokensAggressive ?? 1024)
    : (llm.groqMaxCompletionTokens ?? 1200)

  const inputTokenBudget = Math.min(
    aggressive ? (llm.groqMaxInputTokensAggressive ?? 3200) : (llm.groqMaxInputTokens ?? 4200),
    GROQ_ON_DEMAND_REQUEST_TOKEN_LIMIT - completionBudget - 200,
  )

  const charBudget = Math.floor(inputTokenBudget * 3.5)
  const maxSystem = Math.min(
    aggressive ? 1800 : (llm.groqMaxSystemChars ?? 2400),
    Math.floor(charBudget * 0.38),
  )
  const maxUser = Math.min(
    aggressive ? 2200 : (llm.groqMaxUserChars ?? 2800),
    charBudget - maxSystem,
  )

  let trimmedSystem = trimForLlm(system, maxSystem)
  let trimmedUser = trimForLlm(user, maxUser)

  let totalTokens = estimatePromptTokens(trimmedSystem) + estimatePromptTokens(trimmedUser)
  if (totalTokens > inputTokenBudget) {
    const ratio = inputTokenBudget / totalTokens
    trimmedSystem = trimForLlm(trimmedSystem, Math.floor(trimmedSystem.length * ratio))
    trimmedUser = trimForLlm(trimmedUser, Math.floor(trimmedUser.length * ratio))
  }

  return { system: trimmedSystem, user: trimmedUser }
}

export function isGroqRequestTooLargeError(message: string): boolean {
  return /413|too large|tokens per minute|TPM/i.test(message)
}

export function isLikelyGoogleAiStudioKey(key: string): boolean {
  const k = key.trim()
  return k.startsWith('AIza') && k.length >= 20
}

export function geminiKeySetupHint(): string {
  return 'Set VITE_GEMINI_API_KEY to a valid Google AI Studio key (starts with AIza) — https://aistudio.google.com/apikey'
}

export function groqKeySetupHint(): string {
  return 'Set VITE_GROQ_API_KEY to your Groq key (starts with gsk_) — https://console.groq.com'
}

export function validateGeminiApiKey(key: string): void {
  const k = key.trim()
  if (!k) throw new Error(`Gemini API key missing. ${geminiKeySetupHint()}`)
  if (k.startsWith('AQ.')) {
    throw new Error(
      `Invalid Gemini key (AQ.* is not AI Studio). ${geminiKeySetupHint()}`,
    )
  }
  if (!isLikelyGoogleAiStudioKey(k)) {
    console.warn(`Gemini key may be invalid (expected AIza…). ${geminiKeySetupHint()}`)
  }
}
