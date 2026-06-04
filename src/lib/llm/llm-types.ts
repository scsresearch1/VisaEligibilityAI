export type LlmPromptPair = { system: string; user: string }

export interface LlmTextResult {
  text: string
  provider: 'gemini' | 'groq'
  model: string
  note?: string
}
