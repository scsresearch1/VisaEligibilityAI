import { generateBenchmarkReport } from '../benchmark-report'
import { extractProfileSignals } from '../benchmark-report/extract-profile'
import { buildQuantifiedRoadmaps, deriveDemoMetricCounts } from '../quantified-roadmap'
import { buildArchetypeAwareMetricCounts } from '../reference-profile/rm-benchmark-matrix'
import { formatVisaCategories } from '../assessment-flow'
import { getDisplayCandidateName } from '../candidate-display'
import { formatStructuredProfileForLlm } from '../resume-deep-extract'
import type { AssessmentState } from '../../types/assessment'
import type { BenchmarkReport } from '../../types/benchmark-report'
import type { RoadmapPdfInput } from './export-roadmap-pdf'

export interface AttorneyDossierData extends RoadmapPdfInput {
  report: BenchmarkReport
  pathways: string
  generatedAt: string
  structuredProfileSummary: string
}

export function buildAttorneyDossierData(
  state: AssessmentState,
  readinessScore: number,
): AttorneyDossierData {
  const profile = extractProfileSignals(state.uploads)
  const report = state.benchmarkReport ?? generateBenchmarkReport(state)

  const counts =
    state.quantifiedRoadmap?.current ?? buildArchetypeAwareMetricCounts(state, profile)
  const totalCounted = Object.values(counts).reduce((a, b) => a + b, 0)
  const current =
    totalCounted < 4 && state.analysisComplete
      ? deriveDemoMetricCounts(state.uploads.length, state.selectedCategories)
      : counts
  const roadmaps = buildQuantifiedRoadmaps(state.selectedCategories, current)

  return {
    report,
    benchmark: report,
    candidateName: getDisplayCandidateName(state),
    readinessScore: report.baseline.readinessScore ?? readinessScore,
    pathways: formatVisaCategories(state.selectedCategories),
    generatedAt: report.generatedAt,
    structuredProfileSummary: state.structuredProfile
      ? formatStructuredProfileForLlm(state.structuredProfile)
      : profile.keyClaims.join('\n') || '(Limited extraction — upload PDF or Word resume for full dossier)',
    roadmaps,
    actions: state.roadmap,
  }
}
