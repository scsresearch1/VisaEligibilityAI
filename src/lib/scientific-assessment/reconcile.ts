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
import type { CriterionEvidenceScore } from './score-criterion'
import { isLlmOutputRequired } from '../llm/llm-output-policy'
import { LlmOutputRequiredError } from '../llm/llm-output-policy'
import { evidenceScoreToStrength } from './methodology'

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
    // Weighted blend: 55% rule-based (reproducible) + 45% LLM (contextual)
    const blended = Math.round(rule.score * 0.55 + llmScore * 0.45)
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
      notes: `Scientific rubric score ${score}/100. Build focus: ${buildFocusForCriterion(c.id)}.`,
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
  for (const g of ruleGaps) {
    if (g.criterionId) byCriterion.set(g.criterionId, g)
  }
  for (const g of llmGaps) {
    if (!g.criterionId || !VALID_CRITERION_IDS.has(g.criterionId)) {
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
  return [...byCriterion.values()]
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
  let gaps: GapItem[]
  if (llmOnly) {
    gaps = llm.gaps.filter((g) => g.criterionId && VALID_CRITERION_IDS.has(g.criterionId)).slice(0, 14)
    if (gaps.length === 0) {
      throw new LlmOutputRequiredError('LLM returned no criterion gaps.')
    }
  } else {
    gaps = mergeGaps(ruleGaps, llm.gaps)
  }

  const llmRecs = enrichRecommendations(llm.recommendations, profile)

  let recommendations: DocumentRecommendation[]
  if (llmOnly) {
    if (llmRecs.length === 0) {
      throw new LlmOutputRequiredError('LLM returned no recommendations.')
    }
    recommendations = llmRecs.slice(0, 12)
  } else {
    const ruleRecs = buildRecommendationsFromRoadmap(
      roadmapTable,
      state.selectedCategories,
      profile,
    )
    recommendations =
      llmRecs.length >= 3
        ? llmRecs.slice(0, 12)
        : [...llmRecs, ...ruleRecs].slice(0, 12)
  }

  let parsedAchievements: ParsedAchievement[]
  if (llmOnly) {
    if (llm.parsedAchievements.length === 0) {
      throw new LlmOutputRequiredError('LLM returned no parsedAchievements.')
    }
    parsedAchievements = llm.parsedAchievements.map((a, i) => ({
      ...a,
      id: a.id || `pa-sci-${i}`,
      confidence: clamp(a.confidence ?? 0.8, 0, 1),
      domain: a.domain || profile.domains[0] || 'Professional',
    }))
  } else if (llm.parsedAchievements.length > 0) {
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
  if (llmOnly) {
    riskFlags = llm.riskFlags.slice(0, 8)
  } else {
    riskFlags =
      llm.riskFlags.length > 0
        ? llm.riskFlags.slice(0, 8)
        : buildRiskFlagsFromProfile(profile)
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
