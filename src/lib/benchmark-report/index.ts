import type { AssessmentState } from '../../types/assessment'
import type { BenchmarkReport } from '../../types/benchmark-report'
import type { LlmRunMeta } from '../../types/assessment'
import { generatePersonalizedBenchmarkPayload } from '../llm/generate-personalized-benchmark'
import { generateEb1aBenchmarkReport } from './generate-eb1a'

export function generateBenchmarkReport(
  state: AssessmentState,
  personalization?: Awaited<ReturnType<typeof generatePersonalizedBenchmarkPayload>>['payload'],
): BenchmarkReport {
  const primary = state.selectedCategories.includes('EB1A')
    ? 'EB1A'
    : state.selectedCategories[0] ?? 'EB1A'

  const report = generateEb1aBenchmarkReport(state, personalization)

  if (primary === 'EB1A') {
    return report
  }

  return {
    ...report,
    visaCategory: primary,
    reportTitle: `${primary} Profile-Building Roadmap for ${report.candidateName}`,
    sourceNote: `Quantified for pathway ${primary}. Professional review recommended before filing.`,
  }
}

export async function generateBenchmarkReportAsync(state: AssessmentState): Promise<{
  report: BenchmarkReport
  meta: LlmRunMeta
}> {
  const { payload, meta } = await generatePersonalizedBenchmarkPayload(state)
  return {
    report: generateBenchmarkReport(state, payload),
    meta,
  }
}

export { extractProfileSignals, extractCandidateName } from './extract-profile'
export { benchmarkReportToPlainText } from './export-text'
export { buildHeuristicPersonalizedPayload, getPreviewBenchmarkFromState } from './personalized-heuristic'
