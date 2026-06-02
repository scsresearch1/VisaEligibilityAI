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
  buildScientificAnalysisSystemPromptCompact,
  reconcileScientificAnalysis,
} from '../scientific-assessment'
import { getProfileSnippetLimit } from './trim-prompt'
import { isLlmConfigured } from './llm-router'
import {
  assertLlmProvider,
  isLlmOutputRequired,
  LlmOutputRequiredError,
  stampLlmMeta,
} from './llm-output-policy'
import { normalizeLlmRoadmapActions } from './llm-roadmap'
import { parseAnalysisJson } from './parse-analysis-json'
import { callLlmForLongTask } from './llm-router'
import { supplementRoadmapActionsIfMissing } from './supplement-roadmap'

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

  const buildPrompts = (forGroq: boolean) => {
    const snippetLimit = getProfileSnippetLimit(forGroq)
    const profileContext = buildProfileContextBlock(
      state.uploads.map((u) => ({
        name: u.name,
        category: u.category,
        textSnippet: u.textSnippet?.slice(0, snippetLimit),
      })),
      state.selectedCategories,
      rubricDigest,
      state.structuredProfile,
      forGroq ? { maxSnippetChars: snippetLimit, maxTotalChars: snippetLimit + 1500 } : undefined,
    )
    const eligibilityRules = forGroq ? '' : buildEligibilityRulesPrompt(state.selectedCategories)
    const systemBase = forGroq
      ? buildScientificAnalysisSystemPromptCompact(state.selectedCategories)
      : buildScientificAnalysisSystemPrompt(state.selectedCategories)
    const system = eligibilityRules ? `${systemBase}\n\n${eligibilityRules}` : systemBase
    const user = [
      'Perform full scientific assessment. Output ONLY valid JSON per schema.',
      'roadmapActions: required — 6–12 prioritized build actions with deliverableSpec grounded in THIS profile only.',
      'Align criterionEvaluations with the rule-based baseline (±15 points only with cited profile evidence).',
      profileContext,
    ].join('\n\n')
    return { system, user }
  }

  const applyLlmResponse = async (
    raw: string,
    used: 'gemini' | 'groq',
    model: string,
    note?: string,
    profileSnippetForSupplement?: string,
  ): Promise<PersonalizedAnalysisResult> => {
    const parsed = parseAnalysisJson(raw, state.selectedCategories)
    const reconciled = reconcileScientificAnalysis(state, profile, ruleScores, parsed, roadmapTable)
    const visa = state.selectedCategories[0] ?? 'EB1A'

    let roadmapFromLlm = parsed.roadmapActions
    if (!roadmapFromLlm?.length && profileSnippetForSupplement) {
      const supplemental = await supplementRoadmapActionsIfMissing(
        state,
        parsed,
        profileSnippetForSupplement,
      )
      if (supplemental?.length) {
        roadmapFromLlm = supplemental
      }
    }

    const roadmapActions = isLlmOutputRequired()
      ? normalizeLlmRoadmapActions(roadmapFromLlm, visa)
      : buildPrioritizedActionPlan({ ...state, ...reconciled }, roadmapFromLlm)

    const meta = stampLlmMeta(
      {
        provider: used,
        model,
        generatedAt: new Date().toISOString(),
        error: note,
      },
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
    const groqPrompts = buildPrompts(true)
    const res = await callLlmForLongTask(groqPrompts, buildPrompts(false))
    return applyLlmResponse(
      res.text,
      res.provider,
      res.model,
      res.note,
      groqPrompts.user,
    )
  } catch (err) {
    if (err instanceof LlmOutputRequiredError) {
      throw err
    }
    const message = err instanceof Error ? err.message : String(err)
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
