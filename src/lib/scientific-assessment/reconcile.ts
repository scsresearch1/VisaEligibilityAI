import { VISA_CRITERIA } from '../../data/visa-criteria'
import { buildFocusForCriterion } from '../consulting-build-principle'
import { primaryFieldLabel } from '../benchmark-report/extract-profile'
import type { ExtractedProfileSignals } from '../benchmark-report/extract-profile'
import type {
  AssessmentState,
  CriterionResult,
  DocumentRecommendation,
  EvidenceItem,
  GapItem,
  ParsedAchievement,
  RiskFlag,
} from '../../types/assessment'
import {
  buildGapsFromAnalysis,
  buildRecommendationsFromRoadmap,
  buildRiskFlagsFromProfile,
} from '../analysis-from-profile'
import { buildHeuristicPersonalizedPayload } from '../benchmark-report/personalized-heuristic'
import { mergeRecommendationsWithBuildPlan } from '../evidence-build-plan'
import type { CriterionEvidenceScore } from './score-criterion'
import { isLlmOutputRequired } from '../llm/llm-output-policy'
import { evidenceScoreToStrength } from './methodology'
import { synthesizeGapsFromEvaluations } from './validate-llm-analysis'
import type { VisaCategory } from '../../types/assessment'

export interface LlmScientificAnalysis {
  profileFacts?: {
    domains?: string[]
    verifiedFacts?: { fact: string; source: string; confidence: number }[]
    unsupportedClaims?: string[]
  }
  criterionEvaluations?: {
    criterionId: string
    evidenceScore: number
    strengthLabel?: string
    profileEvidence?: string[]
    regulatoryBasis?: string
    gapSummary?: string
    buildRecommendation?: string
  }[]
  parsedAchievements: ParsedAchievement[]
  gaps: GapItem[]
  recommendations: DocumentRecommendation[]
  riskFlags: RiskFlag[]
}

const VALID_CRITERION_IDS = new Set(VISA_CRITERIA.map((c) => c.id))

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}

function mergeEvidenceScores(
  ruleScores: CriterionEvidenceScore[],
  llmEvals: LlmScientificAnalysis['criterionEvaluations'],
): Map<string, { score: number; strength: ReturnType<typeof evidenceScoreToStrength> }> {
  const merged = new Map<string, { score: number; strength: ReturnType<typeof evidenceScoreToStrength> }>()

  for (const r of ruleScores) {
    merged.set(r.criterionId, { score: r.evidenceScore, strength: r.strength })
  }

  for (const ev of llmEvals ?? []) {
    if (!VALID_CRITERION_IDS.has(ev.criterionId)) continue
    const rule = merged.get(ev.criterionId)
    const llmScore = clamp(Number(ev.evidenceScore) || 0, 0, 100)
    if (!rule) {
      merged.set(ev.criterionId, {
        score: llmScore,
        strength: evidenceScoreToStrength(llmScore),
      })
      continue
    }
    // Validated LLM scores are clamped to baseline — blend favors reproducible rubric
    const anchored =
      Array.isArray(ev.profileEvidence) &&
      ev.profileEvidence.length > 0
    const ruleWeight = anchored ? 0.5 : 0.72
    const blended = Math.round(rule.score * ruleWeight + llmScore * (1 - ruleWeight))
    merged.set(ev.criterionId, {
      score: blended,
      strength: evidenceScoreToStrength(blended),
    })
  }

  return merged
}

function buildEvidenceFromMerged(
  profile: ExtractedProfileSignals,
  merged: Map<string, { score: number; strength: ReturnType<typeof evidenceScoreToStrength> }>,
  uploadCount: number,
): { evidenceItems: EvidenceItem[]; criterionResults: CriterionResult[] } {
  const criteria = VISA_CRITERIA.filter((c) =>
    [...merged.keys()].includes(c.id),
  )

  const evidenceItems: EvidenceItem[] = criteria.map((c) => {
    const m = merged.get(c.id)!
    const strength = uploadCount === 0 ? 'missing' : m.strength
    const score = uploadCount === 0 ? 8 : m.score
    return {
      id: `ev-${c.id}`,
      criterionId: c.id,
      documentId: uploadCount > 0 ? 'resume-1' : undefined,
      label: `${c.code} ${c.title}: ${strength} (evidence index ${score}/100) — ${profile.candidateName}.`,
      strength,
      notes: [
        `Scientific rubric ${score}/100.`,
        c.regulatoryCitation ? `Regulation: ${c.regulatoryCitation.slice(0, 120)}.` : '',
        `Build: ${buildFocusForCriterion(c.id)}.`,
      ]
        .filter(Boolean)
        .join(' '),
    }
  })

  const criterionResults: CriterionResult[] = criteria.map((c) => {
    const ev = evidenceItems.find((e) => e.criterionId === c.id)!
    const status =
      ev.strength === 'strong'
        ? 'satisfied'
        : ev.strength === 'moderate' || ev.strength === 'weak' || ev.strength === 'attorney_review'
          ? 'partial'
          : 'missing'
    return {
      criterionId: c.id,
      status,
      strength: ev.strength,
      evidenceIds: [ev.id],
      summary: `${c.title}: ${status} (rubric ${merged.get(c.id)?.score ?? 0}/100).`,
    }
  })

  return { evidenceItems, criterionResults }
}

function mergeGaps(
  ruleGaps: GapItem[],
  llmGaps: GapItem[],
): GapItem[] {
  const byCriterion = new Map<string, GapItem>()
  const uncriterioned: GapItem[] = []

  for (const g of ruleGaps) {
    if (g.criterionId) byCriterion.set(g.criterionId, g)
    else if (g.title?.trim()) uncriterioned.push(g)
  }
  for (const g of llmGaps) {
    if (!g.criterionId || !VALID_CRITERION_IDS.has(g.criterionId)) {
      if (g.title?.trim()) uncriterioned.push(g)
      continue
    }
    const existing = byCriterion.get(g.criterionId)
    if (!existing) {
      byCriterion.set(g.criterionId, g)
      continue
    }
    byCriterion.set(g.criterionId, {
      ...existing,
      title: g.title.length > 10 ? g.title : existing.title,
      description: g.description.length > 40 ? g.description : existing.description,
      severity:
        g.severity === 'critical' || existing.severity === 'critical'
          ? 'critical'
          : g.severity === 'high' || existing.severity === 'high'
            ? 'high'
            : existing.severity,
      impactScore: clamp(
        Math.round((existing.impactScore + (g.impactScore || 50)) / 2),
        1,
        99,
      ),
    })
  }

  const seen = new Set<string>()
  const extra = uncriterioned.filter((g) => {
    const key = g.title.toLowerCase().slice(0, 60)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  return [...byCriterion.values(), ...extra]
    .sort((a, b) => b.impactScore - a.impactScore)
    .slice(0, 14)
}

function enrichRecommendations(
  recs: DocumentRecommendation[],
  profile: ExtractedProfileSignals,
): DocumentRecommendation[] {
  const field = primaryFieldLabel(profile.domains)
  return recs.map((r, i) => ({
    ...r,
    id: r.id || `rec-sci-${i}`,
    purpose:
      r.purpose ||
      `Produce criterion-aligned evidence in ${field} for ${profile.candidateName}.`,
    quantifiedBenefit:
      r.quantifiedBenefit ||
      `Raises pathway readiness when externally verified.`,
    estimatedImpactPercent: clamp(r.estimatedImpactPercent || 10, 5, 30),
  }))
}

/** Merge LLM scientific output with rule-based rubric scores for reliable results */
export function reconcileScientificAnalysis(
  state: AssessmentState,
  profile: ExtractedProfileSignals,
  ruleScores: CriterionEvidenceScore[],
  llm: LlmScientificAnalysis,
  roadmapTable: import('../../types/benchmark-report').BenchmarkRoadmapRow[],
): Pick<
  AssessmentState,
  'parsedAchievements' | 'evidenceItems' | 'criterionResults' | 'gaps' | 'recommendations' | 'riskFlags'
> {
  const llmOnly = isLlmOutputRequired()
  const uploadCount = state.uploads.length
  const merged = mergeEvidenceScores(ruleScores, llm.criterionEvaluations)
  const { evidenceItems, criterionResults } = buildEvidenceFromMerged(
    profile,
    merged,
    uploadCount,
  )

  const partialState: AssessmentState = {
    ...state,
    evidenceItems,
    criterionResults,
    gaps: [],
    recommendations: [],
  }

  const ruleGaps = buildGapsFromAnalysis(partialState, profile)
  const gaps = resolveAnalysisGaps(llm, ruleGaps, state.selectedCategories)

  const llmRecs = enrichRecommendations(llm.recommendations, profile)

  const partialForPlan: AssessmentState = {
    ...state,
    evidenceItems,
    criterionResults,
    gaps,
  }

  let recommendations: DocumentRecommendation[]
  const heuristicTable =
    roadmapTable.length > 0
      ? roadmapTable
      : buildHeuristicPersonalizedPayload({ ...partialForPlan }, profile).roadmapTable
  const ruleRecs = buildRecommendationsFromRoadmap(
    heuristicTable,
    state.selectedCategories,
    profile,
  )
  const mergedRecs = mergeRecommendationsWithBuildPlan(
    llmOnly && llmRecs.length >= 3 ? llmRecs : [...llmRecs, ...ruleRecs],
    partialForPlan,
  )
  recommendations = (mergedRecs.length > 0 ? mergedRecs : ruleRecs).slice(0, 14)

  let parsedAchievements: ParsedAchievement[]
  if (llm.parsedAchievements.length > 0) {
    parsedAchievements = llm.parsedAchievements.map((a, i) => ({
      ...a,
      id: a.id || `pa-sci-${i}`,
      confidence: clamp(a.confidence ?? 0.8, 0, 1),
      domain: a.domain || profile.domains[0] || 'Professional',
    }))
  } else {
    parsedAchievements = ruleScores.slice(0, 8).map((r, i) => ({
      id: `pa-rule-${i}`,
      type: 'Criterion assessment',
      summary: `${r.title}: rubric ${r.evidenceScore}/100 (${r.strength})`,
      domain: profile.domains[i % Math.max(profile.domains.length, 1)] ?? 'Professional',
      confidence: r.evidenceScore / 100,
    }))
  }

  let riskFlags: RiskFlag[]
  if (llm.riskFlags.length > 0) {
    riskFlags = llm.riskFlags.slice(0, 8)
  } else {
    riskFlags = buildRiskFlagsFromProfile(profile)
  }

  return {
    parsedAchievements,
    evidenceItems,
    criterionResults,
    gaps,
    recommendations,
    riskFlags,
  }
}

/** Prefer LLM gaps; synthesize from criterion evals or rubric when the model omits them. */
function resolveAnalysisGaps(
  llm: LlmScientificAnalysis,
  ruleGaps: GapItem[],
  categories: VisaCategory[],
): GapItem[] {
  const llmCriterionGaps = llm.gaps.filter(
    (g) => g.criterionId && VALID_CRITERION_IDS.has(g.criterionId),
  )
  const llmOtherGaps = llm.gaps.filter((g) => !g.criterionId && (g.title?.trim().length ?? 0) > 5)

  let gaps =
    llmCriterionGaps.length > 0
      ? llmCriterionGaps
      : llmOtherGaps.length > 0
        ? llmOtherGaps
        : []

  if (gaps.length === 0 && (llm.criterionEvaluations?.length ?? 0) > 0) {
    gaps = synthesizeGapsFromEvaluations(llm.criterionEvaluations ?? [], categories)
  }

  if (gaps.length === 0) {
    gaps = ruleGaps
  } else {
    gaps = mergeGaps(ruleGaps, gaps)
  }

  return gaps.slice(0, 14)
}
