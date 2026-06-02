import { appConfig } from '../../config/app.config'
import type { AssessmentState, LlmRunMeta } from '../../types/assessment'
import { isLlmConfigured } from './generate-profile-insights'

export class LlmOutputRequiredError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'LlmOutputRequiredError'
  }
}

/** When true, heuristic / rule-template fallbacks are not written to assessment state. */
export function isLlmOutputRequired(): boolean {
  if (!isLlmConfigured()) return false
  const cfg = appConfig.llm as typeof appConfig.llm & { requireLlmOutput?: boolean }
  return cfg.requireLlmOutput ?? true
}

export function isLlmProvider(meta: LlmRunMeta | null | undefined): boolean {
  return meta?.provider === 'gemini' || meta?.provider === 'groq'
}

export function assertLlmProvider(meta: LlmRunMeta | null | undefined, step: string): void {
  if (!isLlmOutputRequired()) return
  if (!isLlmProvider(meta)) {
    throw new LlmOutputRequiredError(
      `${step} must be produced by the LLM. ${meta?.error ?? 'Run again after quota resets.'}`,
    )
  }
}

export function stampLlmMeta(meta: LlmRunMeta, profileRevision: number): LlmRunMeta {
  return { ...meta, profileRevision }
}

export function isMetaFreshForProfile(
  meta: LlmRunMeta | null | undefined,
  profileRevision: number,
): boolean {
  if (!isLlmProvider(meta)) return false
  if (meta!.profileRevision == null) return false
  return meta!.profileRevision === profileRevision
}

export function bumpProfileRevision(state: AssessmentState): number {
  return (state.profileRevision ?? 0) + 1
}

/** Clear all derived assessment outputs (keeps uploads, categories, revision). */
export function clearDerivedOutputs(): Pick<
  AssessmentState,
  | 'analysisComplete'
  | 'reportGenerated'
  | 'parsedAchievements'
  | 'evidenceItems'
  | 'criterionResults'
  | 'gaps'
  | 'recommendations'
  | 'riskFlags'
  | 'roadmap'
  | 'profileInsights'
  | 'benchmarkReport'
  | 'llmMeta'
  | 'analysisMeta'
  | 'quantifiedRoadmap'
> {
  return {
    analysisComplete: false,
    reportGenerated: false,
    parsedAchievements: [],
    evidenceItems: [],
    criterionResults: [],
    gaps: [],
    recommendations: [],
    riskFlags: [],
    roadmap: [],
    profileInsights: [],
    benchmarkReport: null,
    llmMeta: null,
    analysisMeta: null,
    quantifiedRoadmap: null,
  }
}
