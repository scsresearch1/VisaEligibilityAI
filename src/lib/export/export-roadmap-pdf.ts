import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { RoadmapAction } from '../../types/assessment'
import type { BenchmarkReport } from '../../types/benchmark-report'
import type { QuantifiedCategoryRoadmap } from '../quantified-roadmap'
import { appConfig } from '../../config/app.config'
import { formatDeliverableSpecForText } from '../action-deliverable-spec'
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

export interface RoadmapPdfInput {
  candidateName: string
  readinessScore: number
  benchmark: BenchmarkReport | null
  roadmaps: QuantifiedCategoryRoadmap[]
  actions: RoadmapAction[]
}

export function downloadRoadmapPdf(input: RoadmapPdfInput): void {
  const { candidateName, readinessScore, benchmark, roadmaps, actions } = input
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const margin = getPageMargin()
  let y = addPageHeader(doc, appConfig.appName, 'Profile Improvement Roadmap')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.setTextColor(...PDF_COLORS.navy)
  doc.text('Profile Improvement Roadmap', margin, y)
  y += 8
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...PDF_COLORS.slate)
  doc.text(
    `${candidateName} · Petition readiness ${readinessScore}% · ${new Date().toLocaleString()}`,
    margin,
    y,
  )
  y += 12

  if (benchmark) {
    y = writeSectionTitle(doc, y, `Benchmark roadmap (${benchmark.totalAssetsToBuild} assets)`)
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Roadmap Area', 'Current', 'Target', 'Build', 'Priority']],
      body: benchmark.roadmapTable.map((row) => [
        row.area,
        `${row.currentScore}/100`,
        `${row.targetScore}/100`,
        String(row.quantityToBuild),
        row.priority,
      ]),
      styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' },
      headStyles: { fillColor: PDF_COLORS.navy, textColor: PDF_COLORS.white },
      columnStyles: { 0: { cellWidth: 55 } },
      theme: 'striped',
    })
    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8

    y = writeSectionTitle(doc, y, 'Minimum build package')
    y = writeBullets(doc, y, benchmark.minimumBuildPackage)
    y += 4
  }

  y = writeSectionTitle(doc, y, 'Quantified benchmark matrix (SCI / SCOPUS / etc.)')
  for (const rm of roadmaps) {
    y = writeSectionTitle(doc, y, `${rm.visaCategory} — ${rm.overallCompletionPercent}% complete · ${rm.totalGap} gaps`)
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Metric', 'Current', 'Target', 'Gap', 'Status']],
      body: rm.metrics.map((m) => [
        m.label,
        String(m.current),
        String(m.target),
        m.met ? '0' : `+${m.gap}`,
        m.met ? 'Met' : 'Build needed',
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: PDF_COLORS.navy, textColor: PDF_COLORS.white },
      theme: 'striped',
    })
    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10
  }

  doc.addPage()
  y = margin + 8
  y = writeSectionTitle(doc, y, 'Prioritized action plan')
  const sorted = [...actions].sort((a, b) => a.priority - b.priority)
  for (const action of sorted) {
    y = writeSectionTitle(doc, y, `${action.priority}. ${action.title}`)
    const meta = [
      action.domain ? `Domain: ${action.domain}` : '',
      action.evidenceArea ? `Evidence area: ${action.evidenceArea}` : '',
      action.deliverableOutline ? `Deliverable: ${action.deliverableOutline}` : '',
      ...(action.deliverableSpec ? formatDeliverableSpecForText(action.deliverableSpec) : []),
      action.description,
      action.profileAnchor ? `Profile anchor: ${action.profileAnchor}` : '',
      `Timeline: ${action.timeframe}`,
      `Category: ${action.category}`,
      `Expected readiness gain: +${action.expectedReadinessGain}%`,
      action.visaCategory ? `Visa pathway: ${action.visaCategory}` : '',
      action.quantityToBuild != null && action.quantityToBuild > 0
        ? `Quantity to build: ${action.quantityToBuild}`
        : '',
      action.metricGap != null && action.metricGap > 0 ? `Metric gap: +${action.metricGap}` : '',
    ].filter(Boolean)
    y = writeParagraphs(doc, y, meta)
  }

  if (benchmark?.timeline.length) {
    doc.addPage()
    y = margin + 8
    y = writeSectionTitle(doc, y, 'Execution timeline (from benchmark report)')
    for (const phase of benchmark.timeline) {
      y = writeSectionTitle(doc, y, `${phase.phase} — ${phase.duration}`)
      y = writeBullets(doc, y, phase.outputs)
    }
  }

  const name = slugifyFilename(candidateName)
  const date = new Date().toISOString().slice(0, 10)
  triggerPdfDownload(doc, `visa-profile-roadmap-${name}-${date}.pdf`)
}
