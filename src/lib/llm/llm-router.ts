import { appConfig } from '../../config/app.config'
import { callGemini, callGeminiWithPrompts } from './providers/gemini'
import { callGroq, callGroqWithPrompts } from './providers/groq'
import { isLikelyGoogleAiStudioKey } from './trim-prompt'
import { isLlmOutputRequired, LlmOutputRequiredError } from './llm-output-policy'

export type LlmPromptPair = { system: string; user: string }

export interface LlmTextResult {
  text: string
  provider: 'gemini' | 'groq'
  model: string
  note?: string
}

export function isGeminiReady(): boolean {
  return isLikelyGoogleAiStudioKey(appConfig.llm.geminiApiKey)
}

export function isGroqReady(): boolean {
  const k = appConfig.llm.groqApiKey.trim()
  return k.length > 0 && !k.startsWith('YOUR_')
}

export function usesHybridRouting(): boolean {
  return appConfig.llm.provider === 'hybrid'
}

export function isLlmConfigured(): boolean {
  const { provider } = appConfig.llm
  if (provider === 'off') return false
  if (provider === 'hybrid') return isGeminiReady() || isGroqReady()
  if (provider === 'gemini') return appConfig.llm.geminiApiKey.trim().length > 0 || isGroqReady()
  if (provider === 'groq') return isGroqReady()
  return false
}

async function tryGeminiPrompts(system: string, user: string): Promise<LlmTextResult> {
  if (!isGeminiReady()) {
    throw new Error(
      'Gemini unavailable — add a valid AIza… key from https://aistudio.google.com/apikey in geminiApiKey.',
    )
  }
  const res = await callGeminiWithPrompts(system, user)
  return { text: res.text, provider: 'gemini', model: res.modelUsed }
}

async function tryGroqPrompts(system: string, user: string): Promise<LlmTextResult> {
  if (!isGroqReady()) {
    throw new Error('Groq unavailable — add groqApiKey in src/config/app.config.ts')
  }
  const raw = await callGroqWithPrompts(system, user)
  return { text: raw, provider: 'groq', model: appConfig.llm.groqModel }
}

async function tryGeminiInsights(
  profileContext: string,
  eligibilityRules?: string,
): Promise<LlmTextResult> {
  const res = await callGemini(profileContext, eligibilityRules)
  return { text: res.text, provider: 'gemini', model: res.modelUsed }
}

async function tryGroqInsights(
  profileContext: string,
  eligibilityRules?: string,
): Promise<LlmTextResult> {
  const raw = await callGroq(profileContext, eligibilityRules)
  return { text: raw, provider: 'groq', model: appConfig.llm.groqModel }
}

async function withFallback(
  primary: () => Promise<LlmTextResult>,
  fallback: () => Promise<LlmTextResult>,
  primaryLabel: string,
  fallbackLabel: string,
): Promise<LlmTextResult> {
  try {
    return await primary()
  } catch (primaryErr) {
    const primaryMsg = primaryErr instanceof Error ? primaryErr.message : String(primaryErr)
    try {
      const res = await fallback()
      return {
        ...res,
        note: `${primaryLabel} failed (${primaryMsg}); used ${fallbackLabel}.`,
      }
    } catch (fallbackErr) {
      const fallbackMsg = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr)
      const combined = `${primaryLabel} failed (${primaryMsg}); ${fallbackLabel} failed (${fallbackMsg}).`
      if (isLlmOutputRequired()) {
        throw new LlmOutputRequiredError(combined)
      }
      throw new Error(combined)
    }
  }
}

/**
 * Long workloads (full analysis, benchmark): Groq first (token limits), Gemini fallback.
 */
export async function callLlmForLongTask(
  groqPrompts: LlmPromptPair,
  geminiPrompts: LlmPromptPair,
): Promise<LlmTextResult> {
  const { provider } = appConfig.llm

  if (provider === 'off') {
    throw new Error('LLM provider is off')
  }

  if (provider === 'hybrid') {
    if (isGroqReady()) {
      return withFallback(
        () => tryGroqPrompts(groqPrompts.system, groqPrompts.user),
        () => tryGeminiPrompts(geminiPrompts.system, geminiPrompts.user),
        'Groq',
        'Gemini',
      )
    }
    if (isGeminiReady()) {
      return {
        ...(await tryGeminiPrompts(geminiPrompts.system, geminiPrompts.user)),
        note: 'Groq key missing; used Gemini for long task.',
      }
    }
    throw new LlmOutputRequiredError(
      'Hybrid mode needs groqApiKey (long tasks) and/or a valid AIza… geminiApiKey.',
    )
  }

  if (provider === 'groq') {
    return tryGroqPrompts(groqPrompts.system, groqPrompts.user)
  }

  if (isGeminiReady()) {
    return withFallback(
      () => tryGeminiPrompts(geminiPrompts.system, geminiPrompts.user),
      () => tryGroqPrompts(groqPrompts.system, groqPrompts.user),
      'Gemini',
      'Groq',
    )
  }
  if (isGroqReady()) {
    return tryGroqPrompts(groqPrompts.system, groqPrompts.user)
  }
  throw new LlmOutputRequiredError('No valid LLM API keys configured.')
}

/**
 * Critical / smaller workloads (visa insights): Gemini first, Groq fallback.
 */
export async function callLlmForCriticalTask(
  geminiPrompts: LlmPromptPair,
  groqPrompts: LlmPromptPair = geminiPrompts,
): Promise<LlmTextResult> {
  const { provider } = appConfig.llm

  if (provider === 'off') {
    throw new Error('LLM provider is off')
  }

  if (provider === 'hybrid') {
    if (isGeminiReady()) {
      return withFallback(
        () => tryGeminiPrompts(geminiPrompts.system, geminiPrompts.user),
        () => tryGroqPrompts(groqPrompts.system, groqPrompts.user),
        'Gemini',
        'Groq',
      )
    }
    if (isGroqReady()) {
      return {
        ...(await tryGroqPrompts(groqPrompts.system, groqPrompts.user)),
        note: 'Gemini key missing/invalid; used Groq for critical task.',
      }
    }
    throw new LlmOutputRequiredError(
      'Hybrid mode needs a valid AIza… geminiApiKey (critical tasks) and/or groqApiKey.',
    )
  }

  if (provider === 'groq') {
    return tryGroqPrompts(groqPrompts.system, groqPrompts.user)
  }

  if (isGeminiReady()) {
    return withFallback(
      () => tryGeminiPrompts(geminiPrompts.system, geminiPrompts.user),
      () => tryGroqPrompts(groqPrompts.system, groqPrompts.user),
      'Gemini',
      'Groq',
    )
  }
  if (isGroqReady()) {
    return tryGroqPrompts(groqPrompts.system, groqPrompts.user)
  }
  throw new LlmOutputRequiredError('No valid LLM API keys configured.')
}

/** Profile insights — compact critical task using context blocks. */
export async function callLlmForCriticalInsights(
  profileContext: string,
  eligibilityRules?: string,
): Promise<LlmTextResult> {
  const { provider } = appConfig.llm

  if (provider === 'off') {
    throw new Error('LLM provider is off')
  }

  if (provider === 'hybrid') {
    if (isGeminiReady()) {
      return withFallback(
        () => tryGeminiInsights(profileContext, eligibilityRules),
        () => tryGroqInsights(profileContext, eligibilityRules),
        'Gemini',
        'Groq',
      )
    }
    if (isGroqReady()) {
      return {
        ...(await tryGroqInsights(profileContext, eligibilityRules)),
        note: 'Gemini key missing/invalid; used Groq for insights.',
      }
    }
    throw new LlmOutputRequiredError(
      'Hybrid mode needs a valid AIza… geminiApiKey (insights) and/or groqApiKey.',
    )
  }

  if (provider === 'groq') {
    return tryGroqInsights(profileContext, eligibilityRules)
  }

  if (isGeminiReady()) {
    return withFallback(
      () => tryGeminiInsights(profileContext, eligibilityRules),
      () => tryGroqInsights(profileContext, eligibilityRules),
      'Gemini',
      'Groq',
    )
  }
  if (isGroqReady()) {
    return tryGroqInsights(profileContext, eligibilityRules)
  }
  throw new LlmOutputRequiredError('No valid LLM API keys configured.')
}
