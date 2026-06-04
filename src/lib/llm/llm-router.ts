import { appConfig } from '../../config/app.config'
import { callGemini, callGeminiWithPrompts } from './providers/gemini'
import { callGroqSplitScientificAnalysis, type GroqSplitAnalysisInput } from './groq-split-analysis'
import { callGroq, callGroqWithPrompts, GroqTruncatedError, type GroqPromptSize } from './providers/groq'
import {
  geminiKeySetupHint,
  groqKeySetupHint,
  isLikelyGoogleAiStudioKey,
  isGroqRateLimitError,
  isGroqRequestTooLargeError,
  isGroqTruncatedError,
} from './trim-prompt'
import { isLlmOutputRequired, LlmOutputRequiredError } from './llm-output-policy'

import type { LlmPromptPair, LlmTextResult } from './llm-types'

export type { LlmPromptPair, LlmTextResult } from './llm-types'

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
  if (provider === 'gemini') return isGeminiReady() || isGroqReady()
  if (provider === 'groq') return isGroqReady()
  return false
}

function shouldUseGeminiFallback(primaryLabel: string, primaryMsg: string): boolean {
  if (primaryLabel !== 'Groq' || !isGeminiReady()) return false
  return (
    isGroqRateLimitError(primaryMsg) ||
    isGroqRequestTooLargeError(primaryMsg) ||
    isGroqTruncatedError(primaryMsg)
  )
}

async function tryGeminiPrompts(system: string, user: string): Promise<LlmTextResult> {
  if (!isGeminiReady()) {
    throw new Error(`Gemini unavailable. ${geminiKeySetupHint()}`)
  }
  const res = await callGeminiWithPrompts(system, user)
  return { text: res.text, provider: 'gemini', model: res.modelUsed }
}

async function tryGroqPrompts(
  system: string,
  user: string,
  size: GroqPromptSize = 'default',
): Promise<LlmTextResult> {
  if (!isGroqReady()) {
    throw new Error(`Groq unavailable. ${groqKeySetupHint()}`)
  }
  const raw = await callGroqWithPrompts(system, user, size)
  return { text: raw, provider: 'groq', model: appConfig.llm.groqModel }
}

async function tryGeminiInsights(
  profileContext: string,
  eligibilityRules?: string,
): Promise<LlmTextResult> {
  if (!isGeminiReady()) {
    throw new Error(`Gemini unavailable. ${geminiKeySetupHint()}`)
  }
  const res = await callGemini(profileContext, eligibilityRules)
  return { text: res.text, provider: 'gemini', model: res.modelUsed }
}

async function tryGroqInsights(
  profileContext: string,
  eligibilityRules?: string,
): Promise<LlmTextResult> {
  if (!isGroqReady()) {
    throw new Error(`Groq unavailable. ${groqKeySetupHint()}`)
  }
  const raw = await callGroq(profileContext, eligibilityRules)
  return { text: raw, provider: 'groq', model: appConfig.llm.groqModel }
}

async function withFallback(
  primary: () => Promise<LlmTextResult>,
  fallback: () => Promise<LlmTextResult>,
  primaryLabel: string,
  fallbackLabel: string,
  canUseFallback: () => boolean,
): Promise<LlmTextResult> {
  try {
    return await primary()
  } catch (primaryErr) {
    const primaryMsg = primaryErr instanceof Error ? primaryErr.message : String(primaryErr)

    const shouldFallback = canUseFallback() || shouldUseGeminiFallback(primaryLabel, primaryMsg)

    if (!shouldFallback) {
      const hint = isGroqRequestTooLargeError(primaryMsg)
        ? ' Shorten uploads or set VITE_GEMINI_API_KEY (AIza…) for Gemini fallback.'
        : isGroqRateLimitError(primaryMsg)
          ? ' Groq free tier: ~6000 tokens/min. Wait 10s and click Run again, or add VITE_GEMINI_API_KEY (AIza…).'
          : ''
      if (isLlmOutputRequired()) {
        throw new LlmOutputRequiredError(`${primaryLabel} failed (${primaryMsg}).${hint}`)
      }
      throw new Error(`${primaryLabel} failed (${primaryMsg}).${hint}`)
    }

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
 * Long workloads (full analysis, benchmark): Gemini first when available (avoids Groq 6k TPM);
 * Groq fallback for hybrid without Gemini or explicit groq-only with Gemini escape hatch.
 */
async function tryGroqLongTask(
  groqPrompts: LlmPromptPair,
  splitInput?: GroqSplitAnalysisInput,
): Promise<LlmTextResult> {
  if (splitInput && !isGeminiReady()) {
    return callGroqSplitScientificAnalysis(splitInput)
  }
  try {
    return await tryGroqPrompts(groqPrompts.system, groqPrompts.user, 'full-analysis')
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (splitInput && (err instanceof GroqTruncatedError || isGroqTruncatedError(msg))) {
      return callGroqSplitScientificAnalysis(splitInput)
    }
    throw err
  }
}

export async function callLlmForLongTask(
  groqPrompts: LlmPromptPair,
  geminiPrompts: LlmPromptPair,
  splitInput?: GroqSplitAnalysisInput,
): Promise<LlmTextResult> {
  const { provider } = appConfig.llm

  if (provider === 'off') {
    throw new Error('LLM provider is off')
  }

  if (provider === 'hybrid') {
    if (isGeminiReady()) {
      return withFallback(
        () => tryGeminiPrompts(geminiPrompts.system, geminiPrompts.user),
        () => tryGroqLongTask(groqPrompts, splitInput),
        'Gemini',
        'Groq',
        () => isGroqReady(),
      )
    }
    if (isGroqReady()) {
      const res = await tryGroqLongTask(groqPrompts, splitInput)
      return {
        ...res,
        note: res.note ?? 'Gemini key missing; used Groq (split calls when needed) for long task.',
      }
    }
    throw new LlmOutputRequiredError(
      `Hybrid mode needs ${groqKeySetupHint()} and/or ${geminiKeySetupHint()}`,
    )
  }

  if (provider === 'groq') {
    if (isGeminiReady()) {
      return withFallback(
        () => tryGroqLongTask(groqPrompts, splitInput),
        () => tryGeminiPrompts(geminiPrompts.system, geminiPrompts.user),
        'Groq',
        'Gemini',
        () => true,
      )
    }
    return tryGroqLongTask(groqPrompts, splitInput)
  }

  if (isGeminiReady()) {
    return withFallback(
      () => tryGeminiPrompts(geminiPrompts.system, geminiPrompts.user),
      () => tryGroqLongTask(groqPrompts, splitInput),
      'Gemini',
      'Groq',
      () => isGroqReady(),
    )
  }
  if (isGroqReady()) {
    return tryGroqLongTask(groqPrompts, splitInput)
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
        () => isGroqReady(),
      )
    }
    if (isGroqReady()) {
      return {
        ...(await tryGroqPrompts(groqPrompts.system, groqPrompts.user)),
        note: 'Gemini key missing/invalid; used Groq for critical task.',
      }
    }
    throw new LlmOutputRequiredError(
      `Hybrid mode needs ${geminiKeySetupHint()} and/or ${groqKeySetupHint()}`,
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
      () => isGroqReady(),
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
        () => isGroqReady(),
      )
    }
    if (isGroqReady()) {
      return {
        ...(await tryGroqInsights(profileContext, eligibilityRules)),
        note: 'Gemini key missing/invalid; used Groq for insights.',
      }
    }
    throw new LlmOutputRequiredError(
      `Hybrid mode needs ${geminiKeySetupHint()} and/or ${groqKeySetupHint()}`,
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
      () => isGroqReady(),
    )
  }
  if (isGroqReady()) {
    return tryGroqInsights(profileContext, eligibilityRules)
  }
  throw new LlmOutputRequiredError('No valid LLM API keys configured.')
}
