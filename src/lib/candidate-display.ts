import type { AssessmentState } from '../types/assessment'
import { deepExtractResume } from './resume-deep-extract'

/** Name shown across UI and reports — user override wins, then structured extraction. */
export function getDisplayCandidateName(state: AssessmentState): string {
  const override = state.candidateNameOverride?.trim()
  if (override) return override

  const extracted = state.structuredProfile?.candidateName?.trim()
  if (extracted && extracted !== 'Candidate') return extracted

  if (state.uploads.length > 0) {
    const fresh = deepExtractResume(state.uploads).candidateName
    if (fresh && fresh !== 'Candidate') return fresh
  }

  return state.benchmarkReport?.candidateName?.trim() || 'Candidate'
}
