type EnvSource = Record<string, string | boolean | undefined>

function readEnv(key: string): string {
  const raw = (import.meta.env as EnvSource)[key]
  if (typeof raw === 'string') return raw.trim()
  if (typeof raw === 'boolean') return raw ? 'true' : 'false'
  return ''
}

export function envString(key: string, fallback = ''): string {
  const value = readEnv(key)
  return value.length > 0 ? value : fallback
}

export function envBool(key: string, fallback: boolean): boolean {
  const value = readEnv(key)
  if (!value) return fallback
  return value === 'true' || value === '1' || value === 'yes'
}

export function envNumber(key: string, fallback: number): number {
  const value = readEnv(key)
  if (!value) return fallback
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

export function envCsv(key: string): string[] {
  const value = readEnv(key)
  if (!value) return []
  return value.split(',').map((s) => s.trim()).filter(Boolean)
}

export type LlmProvider = 'hybrid' | 'gemini' | 'groq' | 'off'

export function envLlmProvider(key: string, fallback: LlmProvider = 'hybrid'): LlmProvider {
  const value = readEnv(key).toLowerCase()
  if (value === 'hybrid' || value === 'gemini' || value === 'groq' || value === 'off') {
    return value
  }
  return fallback
}
