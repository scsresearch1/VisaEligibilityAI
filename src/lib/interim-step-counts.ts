import { getStepNumber, type FlowStepId } from './assessment-flow'
import { getPreviewBenchmarkFromState } from './benchmark-report/personalized-heuristic'
import type { AssessmentState } from '../types/assessment'

/** Badge value for sidebar: output count after analysis, feature id before. */
export function getStepInterimBadge(stepId: FlowStepId, state: AssessmentState): string {
  if (!state.analysisComplete) {
    return String(getStepNumber(stepId))
  }

  switch (stepId) {
    case 'insights':
      return state.profileInsights.length > 0 ? String(state.profileInsights.length) : '…'
    case 'evidence':
      return String(state.evidenceItems.length)
    case 'checklist':
      return String(state.criterionResults.length)
    case 'gaps':
      return String(state.gaps.length)
    case 'recommendations':
      return String(state.recommendations.length)
    case 'dossier':
      return state.reportGenerated ? 'PDF' : '—'
    case 'roadmap': {
      if (state.benchmarkReport?.totalAssetsToBuild) {
        return String(state.benchmarkReport.totalAssetsToBuild)
      }
      if (state.analysisComplete) {
        return String(getPreviewBenchmarkFromState(state).totalAssetsToBuild)
      }
      return String(state.roadmap.length)
    }
    default:
      return String(getStepNumber(stepId))
  }
}

export function isStepOutputReady(stepId: FlowStepId, state: AssessmentState): boolean {
  if (!state.analysisComplete) return false
  switch (stepId) {
    case 'insights':
      return state.profileInsights.length > 0
    case 'evidence':
      return state.evidenceItems.length > 0
    case 'checklist':
      return state.criterionResults.length > 0
    case 'gaps':
      return state.gaps.length > 0
    case 'recommendations':
      return state.recommendations.length > 0
    case 'roadmap':
      return state.roadmap.length > 0
    case 'report':
      return state.reportGenerated
    case 'dossier':
      return state.reportGenerated
    default:
      return false
  }
}
