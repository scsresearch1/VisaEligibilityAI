import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { VISA_CRITERIA } from '../../data/visa-criteria'
import { appConfig } from '../../config/app.config'
import { sanitizeBenchmarkForDisplay } from '../benchmark-report/sanitize-display'
import { formatDeliverableSpecForText } from '../action-deliverable-spec'
import { displayReportFootnote, displaySubmissionReadyStatus } from '../user-facing-labels'
import type { AttorneyDossierData } from './build-dossier-data'
import type { AssessmentState } from '../../types/assessment'
import {
  addCoverPage,
  addPartDivider,
  addTableOfContents,
  applyDocumentFooters,
  getFinalTableY,
  getPageMargin,
  PDF_COLORS,
  slugifyFilename,
  tableStartY,
  triggerPdfDownload,
  writeBullets,
  writeParagraphs,
  writeSectionTitle,
} from './pdf-utils'

const LEGAL_FOOTER =
  'Confidential — EB-1 profile-building dossier. Not legal advice. Professional review recommended before filing.'

export function downloadCombinedAttorneyDossierPdf(
  data: AttorneyDossierData,
  state: AssessmentState,
): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const margin = getPageMargin()
  const report = sanitizeBenchmarkForDisplay(data.report)

  addCoverPage(doc, {
    title: 'EB-1 Professional Review Dossier',
    subtitle:
      'Combined benchmark report, quantified profile-building roadmap, and supplementary eligibility analysis — U.S. immigration consulting standard format.',
    candidateName: data.candidateName,
    pathways: data.pathways,
    readinessScore: data.readinessScore,
    documentId: '',
    generatedAt: data.generatedAt,
  })

  addTableOfContents(doc, [
    { label: 'Executive Summary & Profile Extraction', page: 3 },
    { label: 'Part I — Readiness benchmark report', page: 4 },
    { label: 'Part II — Profile improvement roadmap', page: 0 },
    { label: 'Part III — Evidence, gaps, insights & risks', page: 0 },
    { label: 'Verification package & conclusion', page: 0 },
  ])

  let y = margin + 4
  y = writeSectionTitle(doc, y, 'Executive Summary')
  y = writeParagraphs(doc, y, [
    `This dossier consolidates the full readiness benchmark and executable profile-building roadmap for ${data.candidateName} under pathway(s): ${data.pathways}.`,
    `Current petition readiness index: ${data.readinessScore}/100. Submission-ready status: ${displaySubmissionReadyStatus(report.baseline.attorneyReadyStatus)}. Primary gap: ${report.baseline.primaryGap}.`,
    `Fundamental model: nothing is satisfied by collecting existing files alone. The consulting team must build ${report.totalAssetsToBuild} new evidence assets (publish papers, file patents, ship products, secure articles/speaking/judging proof) matched to this profile to reach projected readiness of ${report.conclusion.projectedReadinessMin}–${report.conclusion.projectedReadinessMax}/100 prior to professional filing review.`,
    report.conclusion.summary,
  ])

  y = writeSectionTitle(doc, y, 'Structured profile extraction')
  y = writeParagraphs(doc, y, data.structuredProfileSummary.split('\n').filter(Boolean))

  if (report.conclusion.positioningThemes.length > 0) {
    y = writeSectionTitle(doc, y, 'Positioning themes')
    y = writeBullets(doc, y, report.conclusion.positioningThemes)
  }

  doc.addPage()
  y = addPartDivider(doc, 'Part I', 'Readiness benchmark report')
  y = writeSectionTitle(doc, y, 'I.1 Corrected Evaluation Logic')
  y = writeParagraphs(doc, y, report.evaluationLogic)

  y = writeSectionTitle(doc, y, 'I.2 Current EB-1 Baseline Assessment')
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Assessment Metric', 'Finding']],
    body: [
      ['Readiness Score', `${report.baseline.readinessScore} / 100`],
      ['Evidence Strength', report.baseline.evidenceStrength],
      ['Submission-ready status', displaySubmissionReadyStatus(report.baseline.attorneyReadyStatus)],
      ['Primary Gap', report.baseline.primaryGap],
      ['Consulting Requirement', report.baseline.consultingRequirement],
      ['Verification Owner', report.baseline.verificationOwner],
    ],
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: { fillColor: PDF_COLORS.navy, textColor: PDF_COLORS.white, fontStyle: 'bold' },
    theme: 'grid',
  })
  y = getFinalTableY(doc, y + 40)

  y = writeSectionTitle(doc, y, 'I.3 Quantified Roadmap — Build Quantities & Scores')
  y = tableStartY(doc, y)
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Roadmap Area', 'Current', 'Target', 'Qty to Build', 'Priority']],
    body: report.roadmapTable.map((row) => [
      row.area,
      `${row.currentScore}/100`,
      `${row.targetScore}/100`,
      String(row.quantityToBuild),
      row.priority,
    ]),
    styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' },
    headStyles: { fillColor: PDF_COLORS.navy, textColor: PDF_COLORS.white },
    columnStyles: { 0: { cellWidth: 48 } },
    theme: 'striped',
  })
  y = getFinalTableY(doc, y + 20)

  y = writeSectionTitle(doc, y, 'I.4 Consulting Team Responsibilities by Area')
  for (const row of report.roadmapTable) {
    y = writeSectionTitle(doc, y, row.area)
    if (row.areaOutline?.trim()) {
      doc.setFont('helvetica', 'italic')
      doc.setFontSize(9)
      y = writeParagraphs(doc, y, [row.areaOutline])
      doc.setFont('helvetica', 'normal')
    }
    y = writeParagraphs(doc, y, [row.consultingResponsibility])
  }

  y = writeSectionTitle(doc, y, 'I.5 Minimum Recommended Build Package')
  y = writeBullets(doc, y, report.minimumBuildPackage)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text(`Total assets to build: ${report.totalAssetsToBuild}`, margin, y)
  y += 10

  for (const sec of report.sections) {
    doc.addPage()
    y = margin + 6
    y = writeSectionTitle(doc, y, `I.${sec.number} ${sec.title}`)
    if (sec.intro) y = writeParagraphs(doc, y, [sec.intro])
    sec.items?.forEach((item, i) => {
      y = writeSectionTitle(doc, y, `${i + 1}. ${item.title}`)
      const parts: string[] = []
      if (item.purpose) parts.push(`Purpose: ${item.purpose}`)
      if (item.technicalBasis) parts.push(`Technical basis: ${item.technicalBasis}`)
      if (item.eb1aContribution) parts.push(`EB-1 contribution: ${item.eb1aContribution}`)
      if (item.coreModules?.length) {
        parts.push('Core modules:', ...item.coreModules.map((m) => `  • ${m}`))
      }
      y = writeParagraphs(doc, y, parts)
    })
    sec.table?.forEach((t) => {
      y = writeParagraphs(doc, y, [`${t.label}: ${t.current} → ${t.build} → ${t.target}`])
    })
  }

  doc.addPage()
  y = addPartDivider(doc, 'Part II', 'Profile Improvement Roadmap')

  y = writeSectionTitle(doc, y, 'II.1 RM Quantified Benchmark Matrix')
  y = writeParagraphs(doc, y, [
    'Official RM targets for SCI, SCOPUS, conferences, patents, products, book chapters, and guest lectures compared against inferred profile counts.',
  ])

  for (const rm of data.roadmaps) {
    y = writeSectionTitle(
      doc,
      y,
      `${rm.visaCategory} — ${rm.overallCompletionPercent}% benchmark completion (${rm.totalGap} gaps)`,
    )
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Metric', 'Current', 'RM Target', 'Gap', 'Status']],
      body: rm.metrics.map((m) => [
        m.label,
        String(m.current),
        String(m.target),
        m.met ? '—' : `+${m.gap}`,
        m.met ? 'Target met' : 'Build required',
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: PDF_COLORS.navy, textColor: PDF_COLORS.white },
      theme: 'striped',
    })
    y = getFinalTableY(doc, y + 30)
  }

  y = writeSectionTitle(doc, y, 'II.2 Prioritized Execution Plan')
  const sorted = [...data.actions].sort((a, b) => a.priority - b.priority)
  for (const action of sorted) {
    y = writeSectionTitle(doc, y, `Priority ${action.priority}: ${action.title}`)
    y = writeParagraphs(doc, y, [
      action.domain ? `Domain: ${action.domain}` : '',
      action.evidenceArea ? `Evidence area: ${action.evidenceArea}` : '',
      action.deliverableOutline ? `Deliverable: ${action.deliverableOutline}` : '',
      ...(action.deliverableSpec ? formatDeliverableSpecForText(action.deliverableSpec) : []),
      action.description,
      action.profileAnchor ? `Profile anchor: ${action.profileAnchor}` : '',
      `Timeline: ${action.timeframe} · Type: ${action.category} · Readiness uplift: +${action.expectedReadinessGain}%`,
      action.visaCategory ? `Pathway: ${action.visaCategory}` : '',
      action.quantityToBuild != null && action.quantityToBuild > 0
        ? `Quantity to build: ${action.quantityToBuild}`
        : '',
      action.metricGap != null && action.metricGap > 0 ? `Quantified metric gap: +${action.metricGap}` : '',
    ].filter(Boolean))
  }

  y = writeSectionTitle(doc, y, 'II.3 Implementation Timeline')
  for (const phase of report.timeline) {
    y = writeSectionTitle(doc, y, `${phase.phase} (${phase.duration})`)
    y = writeBullets(doc, y, phase.outputs)
  }

  doc.addPage()
  y = addPartDivider(doc, 'Part III', 'Supplementary Eligibility Analysis')

  y = writeSectionTitle(doc, y, 'III.1 Parsed achievements')
  if (state.parsedAchievements.length > 0) {
    y = tableStartY(doc, y)
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Type', 'Summary', 'Domain', 'Confidence']],
      body: state.parsedAchievements.map((a) => [
        a.type,
        a.summary.slice(0, 100),
        a.domain ?? '—',
        `${Math.round(a.confidence * 100)}%`,
      ]),
      styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' },
      headStyles: { fillColor: PDF_COLORS.navy, textColor: PDF_COLORS.white },
      theme: 'striped',
    })
    y = getFinalTableY(doc, y + 20)
  }

  y = writeSectionTitle(doc, y, 'III.2 Evidence mapping')
  const evidenceRows = state.evidenceItems.map((e) => [
    e.criterionId,
    e.label.slice(0, 70),
    e.strength,
    (e.notes || '—').slice(0, 40),
  ])
  if (evidenceRows.length > 0) {
    y = tableStartY(doc, y)
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Criterion', 'Evidence', 'Strength', 'Source']],
      body: evidenceRows,
      styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' },
      headStyles: { fillColor: PDF_COLORS.navy, textColor: PDF_COLORS.white },
      theme: 'grid',
    })
    y = getFinalTableY(doc, y + 20)
  }

  y = writeSectionTitle(doc, y, 'III.3 Criterion-level status')
  const criteriaRows = state.criterionResults.map((r) => {
    const c = VISA_CRITERIA.find((x) => x.id === r.criterionId)
    return [
      c?.category ?? '—',
      c?.code ?? r.criterionId,
      c?.title?.slice(0, 45) ?? r.criterionId,
      r.status,
      r.strength,
    ]
  })
  if (criteriaRows.length > 0) {
    y = tableStartY(doc, y)
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Pathway', 'Code', 'Criterion', 'Status', 'Strength']],
      body: criteriaRows,
      styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' },
      headStyles: { fillColor: PDF_COLORS.navy, textColor: PDF_COLORS.white },
      theme: 'grid',
    })
    y = getFinalTableY(doc, y + 20)
  }

  y = writeSectionTitle(doc, y, 'III.4 Critical gap summary')
  if (state.gaps.length > 0) {
    y = tableStartY(doc, y)
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Severity', 'Gap', 'Impact']],
      body: state.gaps.map((g) => [g.severity, g.title, String(g.impactScore)]),
      styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
      headStyles: { fillColor: PDF_COLORS.navy, textColor: PDF_COLORS.white },
      columnStyles: { 1: { cellWidth: 90 } },
      theme: 'striped',
    })
    y = getFinalTableY(doc, y + 20)
  } else {
    y = writeParagraphs(doc, y, ['No critical gaps recorded for this profile.'])
  }

  if (state.recommendations.length > 0) {
    y = writeSectionTitle(doc, y, 'III.5 Evidence build plan (consulting deliverables)')
    y = tableStartY(doc, y)
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Document / asset', 'Purpose', 'Priority', 'Impact %']],
      body: state.recommendations.map((r) => [
        r.documentType.slice(0, 45),
        r.purpose.slice(0, 80),
        r.priority,
        String(r.estimatedImpactPercent),
      ]),
      styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' },
      headStyles: { fillColor: PDF_COLORS.navy, textColor: PDF_COLORS.white },
      theme: 'striped',
    })
    y = getFinalTableY(doc, y + 20)
  }

  if (state.profileInsights.length > 0) {
    y = writeSectionTitle(doc, y, 'III.6 Profile strategy insights')
    y = tableStartY(doc, y)
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Category', 'Actionable items', 'Consulting services', 'Regulatory basis']],
      body: state.profileInsights.map((row) => [
        row.categoryOfficialName.slice(0, 40),
        row.actionableItems.join('; ').slice(0, 90),
        row.rmTeamRecommendedServices.join('; ').slice(0, 70),
        row.sourceStrategicBasis.slice(0, 80),
      ]),
      styles: { fontSize: 6, cellPadding: 2, overflow: 'linebreak' },
      headStyles: { fillColor: PDF_COLORS.navy, textColor: PDF_COLORS.white },
      theme: 'grid',
    })
    y = getFinalTableY(doc, y + 20)
  }

  if (state.riskFlags.length > 0) {
    y = writeSectionTitle(doc, y, 'III.7 Risk flags & claim review')
    y = tableStartY(doc, y)
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Claim', 'Risk', 'Severity', 'Recommendation']],
      body: state.riskFlags.map((r) => [
        r.claim.slice(0, 60),
        r.riskType,
        r.severity,
        r.recommendation.slice(0, 80),
      ]),
      styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' },
      headStyles: { fillColor: PDF_COLORS.navy, textColor: PDF_COLORS.white },
      theme: 'striped',
    })
    y = getFinalTableY(doc, y + 20)
  }

  doc.addPage()
  y = margin + 6
  y = writeSectionTitle(doc, y, 'Verification package index')
  y = writeBullets(doc, y, report.attorneyPackageItems)
  y = writeParagraphs(doc, y, [report.attorneyPackageTotal])

  y = writeSectionTitle(doc, y, 'Final Benchmark Conclusion')
  y = writeParagraphs(doc, y, [
    report.conclusion.summary,
    `Projected readiness after execution: ${report.conclusion.projectedReadinessMin}–${report.conclusion.projectedReadinessMax}/100.`,
    `Projected submission-ready score: ${report.conclusion.projectedAttorneyMin}–${report.conclusion.projectedAttorneyMax}/100.`,
    displayReportFootnote(report),
    `${appConfig.appName} · ${new Date(data.generatedAt).toLocaleDateString('en-US')}`,
  ])

  applyDocumentFooters(doc, LEGAL_FOOTER)

  const name = slugifyFilename(data.candidateName)
  const date = new Date(data.generatedAt).toISOString().slice(0, 10)
  triggerPdfDownload(doc, `EB1-Professional-Dossier-${name}-${date}.pdf`)
}
