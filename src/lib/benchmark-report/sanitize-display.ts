import type { BenchmarkReport } from '../../types/benchmark-report'
import {
  displayReportFootnote,
  displayRoadmapArea,
  displayVerificationOwner,
  sanitizeUserFacingText,
} from '../user-facing-labels'

/** Clone report with all user-visible strings neutralized (UI, preview, PDF, .txt export). */
export function sanitizeBenchmarkForDisplay(report: BenchmarkReport): BenchmarkReport {
  return {
    ...report,
    reportTitle: sanitizeUserFacingText(report.reportTitle),
    evaluationLogic: report.evaluationLogic.map(sanitizeUserFacingText),
    baseline: {
      ...report.baseline,
      primaryGap: sanitizeUserFacingText(report.baseline.primaryGap),
      consultingRequirement: sanitizeUserFacingText(report.baseline.consultingRequirement),
      verificationOwner: displayVerificationOwner(report.baseline.verificationOwner),
      attorneyReadyStatus: report.baseline.attorneyReadyStatus,
    },
    roadmapTable: report.roadmapTable.map((row) => ({
      ...row,
      area: displayRoadmapArea(row.area),
      areaOutline: sanitizeUserFacingText(row.areaOutline),
      consultingResponsibility: sanitizeUserFacingText(row.consultingResponsibility),
    })),
    minimumBuildPackage: report.minimumBuildPackage.map(sanitizeUserFacingText),
    sections: report.sections.map((sec) => ({
      ...sec,
      title: sanitizeUserFacingText(sec.title),
      intro: sec.intro ? sanitizeUserFacingText(sec.intro) : undefined,
      items: sec.items?.map((item) => ({
        ...item,
        title: sanitizeUserFacingText(item.title),
        purpose: item.purpose ? sanitizeUserFacingText(item.purpose) : undefined,
        technicalBasis: item.technicalBasis ? sanitizeUserFacingText(item.technicalBasis) : undefined,
        eb1aContribution: item.eb1aContribution
          ? sanitizeUserFacingText(item.eb1aContribution)
          : undefined,
        coreModules: item.coreModules?.map(sanitizeUserFacingText),
      })),
      table: sec.table?.map((t) => ({
        ...t,
        label: displayRoadmapArea(t.label),
        current: sanitizeUserFacingText(t.current),
        build: sanitizeUserFacingText(t.build),
        target: sanitizeUserFacingText(t.target),
      })),
    })),
    timeline: report.timeline.map((phase) => ({
      ...phase,
      phase: sanitizeUserFacingText(phase.phase),
      outputs: phase.outputs.map(sanitizeUserFacingText),
    })),
    attorneyPackageItems: report.attorneyPackageItems.map(sanitizeUserFacingText),
    attorneyPackageTotal: sanitizeUserFacingText(report.attorneyPackageTotal),
    conclusion: {
      ...report.conclusion,
      summary: sanitizeUserFacingText(report.conclusion.summary),
      positioningThemes: report.conclusion.positioningThemes.map(sanitizeUserFacingText),
    },
    sourceNote: displayReportFootnote(report),
    personalizationSource: report.personalizationSource,
    llmModel: undefined,
  }
}
