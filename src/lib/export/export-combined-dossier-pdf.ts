import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { VISA_CRITERIA } from '../../data/visa-criteria'
import { appConfig } from '../../config/app.config'
import { sanitizeBenchmarkForDisplay } from '../benchmark-report/sanitize-display'
import { formatDeliverableSpecForText } from '../action-deliverable-spec'
import { displayReportFootnote, displaySubmissionReadyStatus } from '../user-facing-labels'
import type { AttorneyDossierData } from './build-dossier-data'
import {
  buildDossierPdfEnrichment,
  structuredProfileTableRows,
} from './dossier-pdf-content'
import type { AssessmentState } from '../../types/assessment'
import {
  addCoverPage,
  addPartDivider,
  addTableOfContents,
  applyDocumentFooters,
  getContentWidth,
  ensureSpace,
  getFinalTableY,
  getPageMargin,
  PDF_COLORS,
  PDF_TABLE_HEAD,
  slugifyFilename,
  tableStartY,
  triggerPdfDownload,
  writeBullets,
  writeHighlightBox,
  writeLegalLead,
  writeParagraphs,
  writeParsingPhaseBlock,
  writeSectionTitle,
  writeSubsectionTitle,
} from './pdf-utils'

const LEGAL_FOOTER =
  'Confidential — EB-1 profile-building dossier. Not legal advice. Professional review recommended before filing.'

export function downloadCombinedAttorneyDossierPdf(
  data: AttorneyDossierData,
  state: AssessmentState,
): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const margin = getPageMargin()
  const contentW = getContentWidth()
  const report = sanitizeBenchmarkForDisplay(data.report)
  const enrichment = buildDossierPdfEnrichment(state, { ...data, report })

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
    { label: 'Executive Summary & Parsing Telemetry', page: 3 },
    { label: 'Part I — Readiness benchmark report', page: 4 },
    { label: 'Part II — Profile improvement roadmap & execution', page: 0 },
    { label: 'Part III — Evidence, gaps, insights & risks', page: 0 },
    { label: 'Verification package & final conclusion', page: 0 },
  ])

  let y = margin + 4
  y = writeSectionTitle(doc, y, 'Executive Summary')
  y = writeHighlightBox(doc, y, 'Petition readiness snapshot', [
    `Candidate: ${data.candidateName} · Pathway(s): ${data.pathways}`,
    `Readiness index: ${data.readinessScore}/100 · Status: ${displaySubmissionReadyStatus(report.baseline.attorneyReadyStatus)}`,
    `Consulting build mandate: ${report.totalAssetsToBuild} new evidence assets · Primary gap: ${report.baseline.primaryGap}`,
    `Projected post-execution readiness: ${report.conclusion.projectedReadinessMin}–${report.conclusion.projectedReadinessMax}/100`,
  ])

  y = writeSectionTitle(doc, y, 'Structured Profile Extraction — Parsing Phase')
  y = writeParsingPhaseBlock(doc, y, enrichment.parsingStages)
  y = tableStartY(doc, y)
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    tableWidth: contentW,
    head: [['Profile field', 'Extracted value']],
    body: structuredProfileTableRows(state.structuredProfile),
    styles: { fontSize: 8, cellPadding: 2.5, overflow: 'linebreak' },
    headStyles: PDF_TABLE_HEAD,
    theme: 'grid',
  })
  y = getFinalTableY(doc, y + 24)

  if (report.conclusion.positioningThemeRows?.length) {
    y = writeSectionTitle(doc, y, 'Strategic positioning themes')
    y = tableStartY(doc, y)
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      tableWidth: contentW,
      head: [['Theme', 'Interpretation']],
      body: report.conclusion.positioningThemeRows.map((t) => [
        t.theme,
        t.interpretation.slice(0, 120),
      ]),
      styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' },
      headStyles: PDF_TABLE_HEAD,
      theme: 'striped',
    })
    y = getFinalTableY(doc, y + 20)
  } else if (report.conclusion.positioningThemes.length > 0) {
    y = writeSectionTitle(doc, y, 'Strategic positioning themes')
    y = writeBullets(doc, y, report.conclusion.positioningThemes)
  }

  if (report.conclusion.profileArchetype) {
    y = writeParagraphs(doc, y, [`Profile archetype: ${report.conclusion.profileArchetype}`])
  }

  if (report.conclusion.pathwayRecommendation) {
    const pr = report.conclusion.pathwayRecommendation
    y = writeSectionTitle(doc, y, 'Pathway recommendation snapshot')
    y = writeHighlightBox(doc, y, 'Primary / secondary pathways', [
      `Primary recommended: ${pr.primary}${pr.secondary ? ` · Secondary: ${pr.secondary}` : ''}`,
      `Filing status: ${pr.filingStatus}`,
      pr.notRecommended?.length ? `Not recommended (selected review): ${pr.notRecommended.join(', ')}` : '',
      `Build focus: ${pr.buildFocus}`,
    ].filter(Boolean))
    y = tableStartY(doc, y)
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      tableWidth: contentW,
      head: [['Pathway', 'Readiness', 'Status', 'Finding']],
      body: pr.rows.map((r) => [
        r.pathway,
        `${r.readinessScore}/100`,
        r.status,
        r.finding.slice(0, 90),
      ]),
      styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' },
      headStyles: PDF_TABLE_HEAD,
      theme: 'grid',
    })
    y = getFinalTableY(doc, y + 24)
  }

  doc.addPage()
  y = addPartDivider(doc, 'Part I', 'Readiness Benchmark Report')

  for (const lead of enrichment.readinessLegalPreamble) {
    y = writeLegalLead(doc, y, lead)
  }
  y += 2

  y = writeSectionTitle(doc, y, 'I.1 Corrected Evaluation Logic')
  y = writeParagraphs(doc, y, enrichment.evaluationLogicLegal)

  if (report.conclusion.pathwayRecommendation?.rows.length) {
    y = writeSectionTitle(doc, y, 'I.1 Current EB-1 Baseline Assessment (per pathway)')
    y = tableStartY(doc, y)
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      tableWidth: contentW,
      head: [['Pathway', 'Readiness', 'Status', 'Finding']],
      body: report.conclusion.pathwayRecommendation.rows.map((r) => [
        r.pathway,
        `${r.readinessScore}/100`,
        r.status,
        r.finding.slice(0, 100),
      ]),
      styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' },
      headStyles: PDF_TABLE_HEAD,
      theme: 'grid',
    })
    y = getFinalTableY(doc, y + 28)
  }

  y = writeSectionTitle(doc, y, 'I.2 Aggregate readiness & consulting baseline')
  y = tableStartY(doc, y)
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    tableWidth: contentW,
    head: [['Assessment metric', 'Finding (consulting rubric)']],
    body: [
      ['Readiness score', `${report.baseline.readinessScore} / 100`],
      ['Evidence strength', report.baseline.evidenceStrength],
      ['Submission-ready status', displaySubmissionReadyStatus(report.baseline.attorneyReadyStatus)],
      ['Primary regulatory gap', report.baseline.primaryGap],
      ['Consulting requirement', report.baseline.consultingRequirement],
      ['Verification owner', report.baseline.verificationOwner],
    ],
    styles: { fontSize: 8, cellPadding: 2.5, overflow: 'linebreak' },
    headStyles: PDF_TABLE_HEAD,
    theme: 'grid',
  })
  y = getFinalTableY(doc, y + 36)

  y = writeSectionTitle(doc, y, 'I.3 Profile-Derived Positioning Summary')
  y = writeHighlightBox(doc, y, 'Available evidence vs. required build portfolio', [
    enrichment.positioningParagraph,
  ])

  y = writeSectionTitle(doc, y, 'I.4 Quantified Roadmap — Build Quantities & Scores')
  y = tableStartY(doc, y)
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    tableWidth: contentW,
    head: [['Roadmap area', 'Current', 'Target', 'Qty to build', 'Priority']],
    body: report.roadmapTable.map((row) => [
      row.area,
      `${row.currentScore}/100`,
      `${row.targetScore}/100`,
      String(row.quantityToBuild),
      row.priority,
    ]),
    styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' },
    headStyles: PDF_TABLE_HEAD,
    columnStyles: { 0: { cellWidth: 48 } },
    theme: 'striped',
  })
  y = getFinalTableY(doc, y + 20)

  y = writeSubsectionTitle(doc, y, 'Roadmap justifications (per area)')
  for (const row of report.roadmapTable) {
    if (!row.quantityToBuild && row.currentScore >= row.targetScore) continue
    y = writeSubsectionTitle(doc, y, row.area)
    y = writeBullets(doc, y, enrichment.roadmapJustifications[row.id] ?? [])
  }

  y = writeSectionTitle(doc, y, 'I.5 Consulting Team Responsibilities by Area')
  for (const block of enrichment.consultingAreas) {
    y = writeSubsectionTitle(doc, y, block.area)
    if (block.areaOutline?.trim()) {
      y = writeParagraphs(doc, y, [block.areaOutline])
    }
    y = writeParagraphs(doc, y, [block.consultingResponsibility])
    y = writeSubsectionTitle(doc, y, 'Justification')
    y = writeBullets(doc, y, block.justifications)
    y = writeSubsectionTitle(doc, y, 'Profile-aligned recommendations')
    y = writeBullets(doc, y, block.recommendations)
  }

  y = writeSectionTitle(doc, y, 'I.6 Minimum Recommended Build Package')
  y = writeBullets(doc, y, report.minimumBuildPackage)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...PDF_COLORS.navy)
  y = ensureSpace(doc, y, 8)
  doc.text(`Total assets to build: ${report.totalAssetsToBuild}`, margin, y)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(0, 0, 0)
  y += 10

  if (enrichment.paperItems.length > 0) {
    y = writeSectionTitle(doc, y, 'I.7 Recommended Papers to Build')
  }
  for (const item of enrichment.paperItems) {
    y = writeSubsectionTitle(doc, y, item.title)
    y = writeParagraphs(doc, y, [
      item.purpose ? `Purpose: ${item.purpose}` : '',
      item.technicalBasis ? `Technical basis: ${item.technicalBasis}` : '',
      item.eb1aContribution ? `EB-1 contribution: ${item.eb1aContribution}` : '',
    ].filter(Boolean))
    y = writeBullets(doc, y, [`Justification: ${item.justification}`])
  }

  if (enrichment.patentItems.length > 0) {
    y = writeSectionTitle(doc, y, 'I.8 Recommended Patents to Build')
  }
  for (const item of enrichment.patentItems) {
    y = writeSubsectionTitle(doc, y, item.title)
    y = writeParagraphs(doc, y, [
      item.technicalBasis ? `Technical basis: ${item.technicalBasis}` : '',
      item.eb1aContribution ? `EB-1 contribution: ${item.eb1aContribution}` : '',
    ].filter(Boolean))
    y = writeBullets(doc, y, [`Justification: ${item.justification}`])
  }

  if (enrichment.productItems.length > 0) {
    y = writeSectionTitle(doc, y, 'I.9 Recommended Products / Prototypes to Build')
  }
  for (const item of enrichment.productItems) {
    y = writeSubsectionTitle(doc, y, item.title)
    y = writeParagraphs(doc, y, [
      item.purpose ? `Purpose: ${item.purpose}` : '',
      item.hwSwCombination ? `Hardware + software: ${item.hwSwCombination}` : '',
      `Market position: ${item.marketPosition}`,
      `ROI outline: ${item.roiOutline}`,
      `Financial impact: ${item.financialImpact}`,
      `Social impact: ${item.socialImpact}`,
      item.eb1aContribution ? `EB-1 contribution: ${item.eb1aContribution}` : '',
    ].filter(Boolean))
    if (item.keyFeatures?.length) {
      y = writeSubsectionTitle(doc, y, 'Key features')
      y = writeBullets(doc, y, item.keyFeatures)
    }
    y = writeBullets(doc, y, [`Justification: ${item.justification}`])
  }

  for (const block of enrichment.supplementaryBlocks) {
    y = writeSectionTitle(doc, y, block.title)
    y = writeParagraphs(doc, y, [block.intro])
    for (const item of block.items) {
      y = writeSubsectionTitle(doc, y, item.title)
      y = writeParagraphs(doc, y, [item.detail])
      y = writeBullets(doc, y, [`Justification: ${item.justification}`])
    }
  }

  const criteriaSec = report.sections.find((s) => s.id === 'sec-criteria')
  if (criteriaSec?.table?.length) {
    y = writeSectionTitle(doc, y, 'I.16 EB-1A Criteria Improvement Projection')
    y = tableStartY(doc, y)
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      tableWidth: contentW,
      head: [['Criterion area', 'Current', 'Build', 'Target']],
      body: criteriaSec.table.map((t) => [t.label, t.current, t.build, t.target]),
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: PDF_TABLE_HEAD,
      theme: 'striped',
    })
    y = getFinalTableY(doc, y + 20)
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
    y = tableStartY(doc, y)
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      tableWidth: contentW,
      head: [['Metric', 'Current', 'RM target', 'Gap', 'Status']],
      body: rm.metrics.map((m) => [
        m.label,
        String(m.current),
        String(m.target),
        m.met ? '—' : `+${m.gap}`,
        m.met ? 'Target met' : 'Build required',
      ]),
      styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
      headStyles: PDF_TABLE_HEAD,
      theme: 'striped',
    })
    y = getFinalTableY(doc, y + 30)
  }

  y = writeSectionTitle(doc, y, 'II.2 Prioritized Execution Plan (all evidence factors)')
  for (const entry of enrichment.executionPlan) {
    y = writeSubsectionTitle(doc, y, `P${entry.priority}: ${entry.title}`)
    y = writeParagraphs(doc, y, [
      `Evidence factor: ${entry.factor}`,
      `Area: ${entry.area}`,
      `Deliverable: ${entry.deliverable}`,
      `Timeline: ${entry.timeframe} · Readiness uplift: +${entry.readinessGain}%`,
    ])
    y = writeSubsectionTitle(doc, y, 'Justification')
    y = writeBullets(doc, y, entry.justifications.length ? entry.justifications : ['Profile-matched build required per Part I roadmap.'])
  }

  const sorted = [...data.actions].sort((a, b) => a.priority - b.priority)
  if (sorted.length > 0) {
    y = writeSectionTitle(doc, y, 'II.3 Roadmap action detail register')
    for (const action of sorted) {
      y = writeSubsectionTitle(doc, y, `Priority ${action.priority}: ${action.title}`)
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
  }

  y = writeSectionTitle(doc, y, 'II.4 Implementation Timeline')
  for (const phase of report.timeline) {
    y = writeSubsectionTitle(doc, y, `${phase.phase} (${phase.duration})`)
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
      tableWidth: contentW,
      head: [['Type', 'Summary', 'Domain', 'Confidence']],
      body: state.parsedAchievements.map((a) => [
        a.type,
        a.summary.slice(0, 100),
        a.domain ?? '—',
        `${Math.round(a.confidence * 100)}%`,
      ]),
      styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' },
      headStyles: PDF_TABLE_HEAD,
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
      tableWidth: contentW,
      head: [['Criterion', 'Evidence', 'Strength', 'Source']],
      body: evidenceRows,
      styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' },
      headStyles: PDF_TABLE_HEAD,
      theme: 'grid',
    })
    y = getFinalTableY(doc, y + 20)
  }

  y = writeSectionTitle(doc, y, 'III.3 Criterion-level status (EB-1A grid)')
  const STRENGTH_NUM: Record<string, number> = {
    strong: 88,
    moderate: 58,
    weak: 38,
    attorney_review: 52,
    unsupported: 22,
    missing: 8,
  }
  const criteriaRows = state.criterionResults.map((r) => {
    const c = VISA_CRITERIA.find((x) => x.id === r.criterionId)
    const ev = state.evidenceItems.find((e) => e.criterionId === r.criterionId)
    const score = ev ? STRENGTH_NUM[ev.strength] ?? 20 : 20
    return [
      c?.category ?? '—',
      c?.code ?? r.criterionId,
      c?.title?.slice(0, 40) ?? r.criterionId,
      r.status,
      `${score}/100`,
      r.summary.slice(0, 70),
    ]
  })
  if (criteriaRows.length > 0) {
    y = tableStartY(doc, y)
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      tableWidth: contentW,
      head: [['Pathway', 'Code', 'Criterion', 'Status', 'Strength', 'Finding']],
      body: criteriaRows,
      styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' },
      headStyles: PDF_TABLE_HEAD,
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
      tableWidth: contentW,
      head: [['Severity', 'Gap', 'Impact']],
      body: state.gaps.map((g) => [g.severity, g.title, String(g.impactScore)]),
      styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
      headStyles: PDF_TABLE_HEAD,
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
      tableWidth: contentW,
      head: [['Document / asset', 'Purpose', 'Priority', 'Impact %']],
      body: state.recommendations.map((r) => [
        r.documentType.slice(0, 45),
        r.purpose.slice(0, 80),
        r.priority,
        String(r.estimatedImpactPercent),
      ]),
      styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' },
      headStyles: PDF_TABLE_HEAD,
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
      tableWidth: contentW,
      head: [['Category', 'Actionable items', 'Consulting services', 'Regulatory basis']],
      body: state.profileInsights.map((row) => [
        row.categoryOfficialName.slice(0, 40),
        row.actionableItems.join('; ').slice(0, 90),
        row.rmTeamRecommendedServices.join('; ').slice(0, 70),
        row.sourceStrategicBasis.slice(0, 80),
      ]),
      styles: { fontSize: 6, cellPadding: 2, overflow: 'linebreak' },
      headStyles: PDF_TABLE_HEAD,
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
      tableWidth: contentW,
      head: [['Claim', 'Risk', 'Severity', 'Recommendation']],
      body: state.riskFlags.map((r) => [
        r.claim.slice(0, 60),
        r.riskType,
        r.severity,
        r.recommendation.slice(0, 80),
      ]),
      styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' },
      headStyles: PDF_TABLE_HEAD,
      theme: 'striped',
    })
    y = getFinalTableY(doc, y + 20)
  }

  doc.addPage()
  y = margin + 6
  y = writeSectionTitle(doc, y, 'Verification Package Index')
  y = writeBullets(doc, y, report.attorneyPackageItems)
  y = writeParagraphs(doc, y, [report.attorneyPackageTotal])

  y = writeSectionTitle(doc, y, 'Final Benchmark Conclusion')
  y = writeHighlightBox(doc, y, 'Scientific & consulting conclusion', [enrichment.finalConclusion])
  y = writeParagraphs(doc, y, [
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
