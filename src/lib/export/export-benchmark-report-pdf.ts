import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { BenchmarkReport } from '../../types/benchmark-report'
import { appConfig } from '../../config/app.config'
import { sanitizeBenchmarkForDisplay } from '../benchmark-report/sanitize-display'
import { displayReportFootnote, displaySubmissionReadyStatus } from '../user-facing-labels'
import {
  addPageHeader,
  getPageMargin,
  PDF_COLORS,
  slugifyFilename,
  triggerPdfDownload,
  writeBullets,
  writeParagraphs,
  writeSectionTitle,
} from './pdf-utils'

export function downloadBenchmarkReportPdf(raw: BenchmarkReport): void {
  const report = sanitizeBenchmarkForDisplay(raw)
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const margin = getPageMargin()
  let y = addPageHeader(
    doc,
    appConfig.appName,
    `Readiness benchmark report · ${report.visaCategory}`,
  )

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(...PDF_COLORS.navy)
  doc.text(report.reportTitle, margin, y)
  y += 8

  y = writeParagraphs(doc, y, report.evaluationLogic)

  y = writeSectionTitle(doc, y, 'Current baseline')
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Metric', 'Value']],
    body: [
      ['Readiness', `${report.baseline.readinessScore}/100`],
      ['Evidence strength', report.baseline.evidenceStrength],
      ['Submission-ready', displaySubmissionReadyStatus(report.baseline.attorneyReadyStatus)],
      ['Primary gap', report.baseline.primaryGap],
      ['Build requirement', report.baseline.consultingRequirement],
    ],
    styles: { fontSize: 8 },
    headStyles: { fillColor: PDF_COLORS.navy, textColor: PDF_COLORS.white },
  })
  y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 40
  y += 10

  y = writeSectionTitle(doc, y, 'Quantified roadmap')
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Area', 'Current', 'Target', 'Build qty', 'Priority']],
    body: report.roadmapTable.map((r) => [
      r.area,
      `${r.currentScore}`,
      `${r.targetScore}`,
      `${r.quantityToBuild}`,
      r.priority,
    ]),
    styles: { fontSize: 7, overflow: 'linebreak' },
    headStyles: { fillColor: PDF_COLORS.navy, textColor: PDF_COLORS.white },
  })
  y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 20
  y += 10

  y = writeSectionTitle(doc, y, 'Minimum build package')
  y = writeBullets(doc, y, report.minimumBuildPackage)

  for (const phase of report.timeline) {
    y = writeSectionTitle(doc, y, `${phase.phase} (${phase.duration})`)
    y = writeBullets(doc, y, phase.outputs)
  }

  y = writeSectionTitle(doc, y, 'Verification package')
  y = writeBullets(doc, y, report.attorneyPackageItems)
  y = writeParagraphs(doc, y, [report.attorneyPackageTotal])

  y = writeSectionTitle(doc, y, 'Conclusion')
  y = writeParagraphs(doc, y, [
    report.conclusion.summary,
    `Current readiness: ${report.conclusion.currentReadiness}/100`,
    `Projected readiness: ${report.conclusion.projectedReadinessMin}–${report.conclusion.projectedReadinessMax}/100`,
    `Projected submission-ready score: ${report.conclusion.projectedAttorneyMin}–${report.conclusion.projectedAttorneyMax}/100`,
    `Total assets: ${report.conclusion.totalAssets}`,
    displayReportFootnote(report),
  ])

  const name = slugifyFilename(report.candidateName)
  const date = new Date(report.generatedAt).toISOString().slice(0, 10)
  triggerPdfDownload(doc, `visa-readiness-report-${name}-${date}.pdf`)
}
