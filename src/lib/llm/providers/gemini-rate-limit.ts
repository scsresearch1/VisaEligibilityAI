const COOLDOWN_MS = 90_000
let cooldownUntil = 0

export function markGeminiRateLimited(): void {
  cooldownUntil = Date.now() + COOLDOWN_MS
}

export function isGeminiInCooldown(): boolean {
  return Date.now() < cooldownUntil
}

export function geminiCooldownRemainingMs(): number {
  return Math.max(0, cooldownUntil - Date.now())
}

export class GeminiRateLimitError extends Error {
  constructor(message = 'Gemini rate limit — try again in a minute or use heuristic mode.') {
    super(message)
    this.name = 'GeminiRateLimitError'
  }
}
