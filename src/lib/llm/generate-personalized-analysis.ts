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
import { buildScientificAnalysisUserPrompt } from '../scientific-assessment/build-analysis-user-prompt'
import {
  validateAndNormalizeLlmAnalysis,
  textAnchoredInCorpus,
} from '../scientific-assessment/validate-llm-analysis'
import {
  buildCompactCriterionDigest,
  buildProfileFactInventory,
} from '../scientific-assessment/profile-fact-inventory'
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
    const groqCriterionBlock = forGroq
      ? `\n\n${buildCompactCriterionDigest(state.selectedCategories)}`
      : ''
    const system = eligibilityRules
      ? `${systemBase}${groqCriterionBlock}\n\n${eligibilityRules}`
      : `${systemBase}${groqCriterionBlock}`
    const user = buildScientificAnalysisUserPrompt({
      categories: state.selectedCategories,
      profileContext,
      profile,
      structured: state.structuredProfile,
      forGroq,
    })
    return { system, user }
  }

  const applyLlmResponse = async (
    raw: string,
    used: 'gemini' | 'groq',
    model: string,
    note?: string,
    profileSnippetForSupplement?: string,
  ): Promise<PersonalizedAnalysisResult> => {
    const parsedRaw = parseAnalysisJson(raw, state.selectedCategories)
    const parsed = validateAndNormalizeLlmAnalysis(parsedRaw, {
      categories: state.selectedCategories,
      profile,
      ruleScores,
      structured: state.structuredProfile,
    })
    const reconciled = reconcileScientificAnalysis(state, profile, ruleScores, parsed, roadmapTable)
    const visa = state.selectedCategories[0] ?? 'EB1A'

    const inventory = buildProfileFactInventory(profile, state.structuredProfile)
    let roadmapFromLlm = parsedRaw.roadmapActions
    if (roadmapFromLlm?.length) {
      roadmapFromLlm = roadmapFromLlm.map((a) => {
        const anchored =
          a.profileAnchor && textAnchoredInCorpus(a.profileAnchor, inventory.corpus)
        return anchored ? a : { ...a, profileAnchor: undefined }
      })
    }
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

    const partial = { ...state, ...reconciled }
    let roadmapActions: RoadmapAction[]
    let roadmapNote = note

    if (roadmapFromLlm?.length) {
      roadmapActions = isLlmOutputRequired()
        ? normalizeLlmRoadmapActions(roadmapFromLlm, visa)
        : buildPrioritizedActionPlan(partial, roadmapFromLlm)
    } else {
      roadmapActions = buildPrioritizedActionPlan(partial)
      if (isLlmOutputRequired()) {
        roadmapNote = [note, 'Roadmap synthesized from profile rubric — LLM omitted roadmapActions.']
          .filter(Boolean)
          .join(' ')
      }
    }

    const meta = stampLlmMeta(
      {
        provider: used,
        model,
        generatedAt: new Date().toISOString(),
        error: roadmapNote,
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
