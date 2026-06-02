import { appConfig } from '../../config/app.config'
import { buildEligibilityRulesPrompt } from '../../data/eligibility-rules'
import {
  buildGapsFromAnalysis,
  buildRecommendationsFromRoadmap,
  buildRiskFlagsFromProfile,
  scoreAllCriteria,
} from '../analysis-from-profile'
import { extractProfileSignals } from '../benchmark-report/extract-profile'
import { buildHeuristicPersonalizedPayload } from '../benchmark-report/personalized-heuristic'
import type {
  AssessmentState,
  LlmRunMeta,
  RoadmapAction,
} from '../../types/assessment'
import { buildPrioritizedActionPlan } from '../prioritized-action-plan'
import { buildProfileContextBlock } from '../profile-text'
import {
  buildRuleBasedCriterionDigest,
  buildScientificAnalysisSystemPrompt,
  reconcileScientificAnalysis,
} from '../scientific-assessment'
import { isLlmConfigured } from './generate-profile-insights'
import {
  assertLlmProvider,
  isLlmOutputRequired,
  LlmOutputRequiredError,
  stampLlmMeta,
} from './llm-output-policy'
import { normalizeLlmRoadmapActions } from './llm-roadmap'
import { parseAnalysisJson } from './parse-analysis-json'
import { callGeminiWithPrompts } from './providers/gemini'
import { callGroqWithPrompts } from './providers/groq'

export interface PersonalizedAnalysisResult
  extends Pick<
    AssessmentState,
    | 'parsedAchievements'
    | 'gaps'
    | 'recommendations'
    | 'riskFlags'
    | 'evidenceItems'
    | 'criterionResults'
  > {
  roadmapActions: RoadmapAction[]
  meta: LlmRunMeta
}

function buildHeuristicResult(state: AssessmentState): PersonalizedAnalysisResult {
  const profile = extractProfileSignals(state.uploads)
  const ruleScores = scoreAllCriteria(state.selectedCategories, profile)
  const roadmap = buildHeuristicPersonalizedPayload(state, profile).roadmapTable
  const reconciled = reconcileScientificAnalysis(state, profile, ruleScores, {
    criterionEvaluations: ruleScores.map((r) => ({
      criterionId: r.criterionId,
      evidenceScore: r.evidenceScore,
      strengthLabel: r.strength,
      profileEvidence: r.profileSignals,
      regulatoryBasis: r.regulatoryNote,
    })),
    parsedAchievements: [],
    gaps: [],
    recommendations: [],
    riskFlags: [],
  }, roadmap)
  const merged = { ...state, ...reconciled }
  return {
    ...reconciled,
    roadmapActions: buildPrioritizedActionPlan(merged),
    meta: {
      provider: 'fallback',
      generatedAt: new Date().toISOString(),
      error: 'LLM disabled — rule-based analysis only.',
    },
  }
}

export async function generatePersonalizedAnalysis(
  state: AssessmentState,
): Promise<PersonalizedAnalysisResult> {
  if (!isLlmConfigured() || appConfig.llm.provider === 'off') {
    return buildHeuristicResult(state)
  }

  const profile = extractProfileSignals(state.uploads)
  const ruleScores = scoreAllCriteria(state.selectedCategories, profile)
  const rubricDigest = buildRuleBasedCriterionDigest(ruleScores)
  const roadmapTable = isLlmOutputRequired()
    ? []
    : buildHeuristicPersonalizedPayload(
        { ...state, gaps: [], evidenceItems: [], criterionResults: [] } as AssessmentState,
        profile,
      ).roadmapTable

  const eligibilityRules = buildEligibilityRulesPrompt(state.selectedCategories)
  const profileContext = buildProfileContextBlock(
    state.uploads.map((u) => ({
      name: u.name,
      category: u.category,
      textSnippet: u.textSnippet?.slice(0, appConfig.llm.maxProfileChars),
    })),
    state.selectedCategories,
    rubricDigest,
    state.structuredProfile,
  )

  const system = buildScientificAnalysisSystemPrompt(state.selectedCategories) + '\n\n' + eligibilityRules
  const user = [
    'Perform full scientific assessment. Output ONLY valid JSON per schema.',
    'roadmapActions: required — 6–12 prioritized build actions with deliverableSpec (titles/outlines) grounded in THIS profile only.',
    'Align criterionEvaluations with the rule-based baseline (±15 points only with cited profile evidence).',
    profileContext,
  ].join('\n\n')

  const applyLlmResponse = (
    raw: string,
    used: 'gemini' | 'groq',
    model: string,
  ): PersonalizedAnalysisResult => {
    const parsed = parseAnalysisJson(raw, state.selectedCategories)
    const reconciled = reconcileScientificAnalysis(state, profile, ruleScores, parsed, roadmapTable)
    const visa = state.selectedCategories[0] ?? 'EB1A'
    const roadmapActions = isLlmOutputRequired()
      ? normalizeLlmRoadmapActions(parsed.roadmapActions, visa)
      : buildPrioritizedActionPlan({ ...state, ...reconciled }, parsed.roadmapActions)

    const meta = stampLlmMeta(
      { provider: used, model, generatedAt: new Date().toISOString() },
      state.profileRevision,
    )
    assertLlmProvider(meta, 'Profile analysis')

    return {
      ...reconciled,
      roadmapActions,
      meta,
    }
  }

  try {
    if (appConfig.llm.provider === 'gemini') {
      const res = await callGeminiWithPrompts(system, user)
      return applyLlmResponse(res.text, 'gemini', res.modelUsed)
    }
    const raw = await callGroqWithPrompts(system, user)
    return applyLlmResponse(raw, 'groq', appConfig.llm.groqModel)
  } catch (primaryError) {
    const message = primaryError instanceof Error ? primaryError.message : String(primaryError)

    if (primaryError instanceof LlmOutputRequiredError) {
      throw primaryError
    }

    if (appConfig.llm.provider === 'gemini' && appConfig.llm.groqApiKey.trim()) {
      try {
        const raw = await callGroqWithPrompts(system, user)
        return applyLlmResponse(raw, 'groq', appConfig.llm.groqModel)
      } catch (groqErr) {
        const groqMsg = groqErr instanceof Error ? groqErr.message : String(groqErr)
        throw new LlmOutputRequiredError(`Gemini failed (${message}); Groq failed (${groqMsg}).`)
      }
    }

    if (isLlmOutputRequired()) {
      throw new LlmOutputRequiredError(message)
    }

    return buildHeuristicResult(state)
  }
}

/** Heuristic resync only when LLM-only mode is off. */
export function syncAnalysisFromBenchmarkReport(
  state: AssessmentState,
): Partial<Pick<AssessmentState, 'gaps' | 'recommendations' | 'riskFlags' | 'roadmap'>> {
  if (isLlmOutputRequired()) {
    return {}
  }
  const report = state.benchmarkReport
  if (!report) return {}

  const profile = extractProfileSignals(state.uploads)
  return {
    gaps: buildGapsFromAnalysis(state, profile),
    recommendations: buildRecommendationsFromRoadmap(
      report.roadmapTable,
      state.selectedCategories,
      profile,
    ),
    riskFlags: state.riskFlags.length > 0 ? state.riskFlags : buildRiskFlagsFromProfile(profile),
    roadmap: buildPrioritizedActionPlan({ ...state, benchmarkReport: report }),
  }
}
