import { generateBenchmarkReport } from './benchmark-report'
import type { AssessmentState, CriterionStatus, EvidenceStrength } from '../types/assessment'

const STATUS_WEIGHT: Record<CriterionStatus, number> = {
  satisfied: 1,
  partial: 0.5,
  unsupported: 0.2,
  missing: 0,
}

const STRENGTH_WEIGHT: Record<EvidenceStrength, number> = {
  strong: 1,
  moderate: 0.55,
  weak: 0.3,
  attorney_review: 0.5,
  unsupported: 0.15,
  missing: 0,
}

/**
 * Petition readiness index (0–100) for sidebar and dashboard.
 * Aligns with attorney benchmark baseline when available; otherwise blends
 * criterion status (partial counts) and evidence strength — not "satisfied only".
 */
export function computePetitionReadinessScore(state: AssessmentState): number {
  if (!state.analysisComplete) return 0

  if (state.benchmarkReport) {
    return state.benchmarkReport.baseline.readinessScore
  }

  const { criterionResults, evidenceItems, selectedCategories } = state
  if (criterionResults.length === 0) return 0

  const criterionPct =
    criterionResults.reduce((s, r) => s + STATUS_WEIGHT[r.status], 0) / criterionResults.length

  const evidencePct =
    evidenceItems.length > 0
      ? evidenceItems.reduce((s, e) => s + STRENGTH_WEIGHT[e.strength], 0) / evidenceItems.length
      : criterionPct

  const blended = Math.round((criterionPct * 0.5 + evidencePct * 0.5) * 100)

  if (selectedCategories.length > 0) {
    const benchmarkBaseline = generateBenchmarkReport(state).baseline.readinessScore
    return Math.round(benchmarkBaseline * 0.65 + blended * 0.35)
  }

  return Math.min(100, blended)
}
