import type { AssessmentState } from '../../types/assessment'
import type { BenchmarkBaseline } from '../../types/benchmark-report'
import { extractProfileSignals } from './extract-profile'
import { scoreAllCriteria } from '../scientific-assessment/score-criterion'
const STRENGTH_SCORE: Record<string, number> = {
  strong: 88,
  moderate: 58,
  weak: 38,
  attorney_review: 52,
  unsupported: 22,
  missing: 8,
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(n)))
}

/** Reproducible readiness baseline from criterion rubric + gaps — anchors LLM benchmark. */
export function computeScientificReadinessBaseline(state: AssessmentState): BenchmarkBaseline {
  const profile = extractProfileSignals(state.uploads)
  const ruleScores = scoreAllCriteria(state.selectedCategories, profile)

  const avgRule =
    ruleScores.length > 0
      ? ruleScores.reduce((s, r) => s + r.evidenceScore, 0) / ruleScores.length
      : 20

  const avgEvidence =
    state.evidenceItems.length > 0
      ? state.evidenceItems.reduce((s, e) => s + (STRENGTH_SCORE[e.strength] ?? 20), 0) /
        state.evidenceItems.length
      : avgRule

  const criterionPct =
    state.criterionResults.length > 0
      ? state.criterionResults.filter((c) => c.status === 'satisfied').length /
        state.criterionResults.length
      : 0

  const readinessScore = clamp(
    avgRule * 0.45 + avgEvidence * 0.45 + criterionPct * 100 * 0.1,
    28,
    78,
  )

  const criticalGaps = state.gaps.filter((g) => g.severity === 'critical').length
  const highGaps = state.gaps.filter((g) => g.severity === 'high').length

  let attorneyReadyStatus: BenchmarkBaseline['attorneyReadyStatus'] = 'Not Ready'
  if (readinessScore >= 72 && criticalGaps === 0 && highGaps <= 1) {
    attorneyReadyStatus = 'Partial'
  }
  if (readinessScore >= 85 && criticalGaps === 0 && highGaps === 0) {
    attorneyReadyStatus = 'Ready'
  }

  let evidenceStrength: BenchmarkBaseline['evidenceStrength'] = 'Weak'
  if (readinessScore >= 62) evidenceStrength = 'Moderate'
  if (readinessScore >= 75) evidenceStrength = 'Strong'

  const primaryGap =
    state.gaps.find((g) => g.severity === 'critical')?.title ??
    state.gaps[0]?.title ??
    'Insufficient externally verifiable evidence density across EB-1 criteria'

  const pathways = state.selectedCategories.join(', ') || 'EB1A'
  const domain =
    profile.domains.slice(0, 2).join(', ') || 'the candidate\'s documented professional field'
  const totalBuild = state.roadmap.reduce((s, a) => s + (a.quantityToBuild ?? 1), 0) || state.gaps.length * 2

  return {
    readinessScore,
    evidenceStrength,
    attorneyReadyStatus,
    primaryGap,
    consultingRequirement: `Produce ${Math.max(totalBuild, state.gaps.length)} new evidence assets (publications, patents, products, media, speaking, judging proof) in ${domain} — not collection of existing uploads — for ${pathways}.`,
    verificationOwner: 'Qualified immigration professional',
  }
}

export function projectReadinessAfterBuild(
  baseline: BenchmarkBaseline,
  totalAssetsToBuild: number,
): { min: number; max: number; attorneyMin: number; attorneyMax: number } {
  const uplift = Math.min(28, Math.max(8, Math.round(totalAssetsToBuild * 1.8)))
  const projectedReadinessMin = clamp(baseline.readinessScore + uplift, baseline.readinessScore + 5, 92)
  const projectedReadinessMax = clamp(projectedReadinessMin + 6, projectedReadinessMin + 2, 98)
  const projectedAttorneyMin = clamp(projectedReadinessMin - 6, 55, 90)
  const projectedAttorneyMax = clamp(projectedReadinessMax - 4, 60, 95)
  return {
    min: projectedReadinessMin,
    max: projectedReadinessMax,
    attorneyMin: projectedAttorneyMin,
    attorneyMax: projectedAttorneyMax,
  }
}
