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
import { slugifyFilename } from './pdf-utils'

const LEGAL_FOOTER =
  'Confidential — EB-1 profile-building dossier. Not legal advice. Professional review recommended before filing.'

function esc(text: string | number | null | undefined): string {
  const s = text == null ? '' : String(text)
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function h1(text: string): string {
  return `<h1 class="section">${esc(text)}</h1>`
}

function h2(text: string): string {
  return `<h2 class="subsection">${esc(text)}</h2>`
}

function h3(text: string): string {
  return `<h3 class="subsubsection">${esc(text)}</h3>`
}

function p(text: string, cls = 'body'): string {
  if (!text.trim()) return ''
  return `<p class="${cls}">${esc(text)}</p>`
}

function ul(items: string[]): string {
  const li = items.filter((i) => i.trim()).map((i) => `<li>${esc(i)}</li>`).join('')
  return li ? `<ul class="bullets">${li}</ul>` : ''
}

function highlight(title: string, lines: string[]): string {
  const body = lines.filter(Boolean).map((l) => p(l)).join('')
  return `<div class="highlight"><p class="highlight-title">${esc(title)}</p>${body}</div>`
}

function table(head: string[], rows: string[][]): string {
  if (rows.length === 0) return ''
  const th = head.map((c) => `<th>${esc(c)}</th>`).join('')
  const tr = rows
    .map((row) => `<tr>${row.map((c) => `<td>${esc(c ?? '—')}</td>`).join('')}</tr>`)
    .join('')
  return `<table class="data"><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table>`
}

function partBanner(part: string, title: string): string {
  return `<div class="part-banner"><p class="part-label">${esc(part)}</p><p class="part-title">${esc(title)}</p></div>`
}

function buildWordHtml(data: AttorneyDossierData, state: AssessmentState): string {
  const report = sanitizeBenchmarkForDisplay(data.report)
  const enrichment = buildDossierPdfEnrichment(state, { ...data, report })
  const generated = new Date(data.generatedAt).toLocaleString('en-US', {
    dateStyle: 'long',
    timeStyle: 'short',
  })

  const sections: string[] = []

  sections.push(`
    <div class="cover">
      <p class="confidential">CONFIDENTIAL — ATTORNEY–CLIENT WORK PRODUCT STYLE</p>
      <h1 class="cover-title">EB-1 Professional Review Dossier</h1>
      ${p('Combined benchmark report, quantified profile-building roadmap, and supplementary eligibility analysis — U.S. immigration consulting standard format.')}
      <p class="candidate">${esc(data.candidateName)}</p>
      ${p(`Visa pathway(s): ${data.pathways}`)}
      ${p(`Petition readiness index: ${data.readinessScore}% (pre-build rubric)`)}
      ${p(`Generated: ${generated}`)}
      ${p('Prepared for qualified immigration counsel and consulting review')}
      <p class="disclaimer">This dossier is generated for professional immigration consulting and legal review. It does not constitute legal advice, a guarantee of visa approval, or USCIS representation. All factual claims require independent verification under applicable INA and 8 CFR standards.</p>
    </div>
  `)

  sections.push(h1('Table of Contents'))
  sections.push(ul([
    'Executive Summary & Parsing Telemetry',
    'Part I — Readiness benchmark report',
    'Part II — Profile improvement roadmap & execution',
    'Part III — Evidence, gaps, insights & risks',
    'Verification package & final conclusion',
  ]))

  sections.push(h1('Executive Summary'))
  sections.push(
    highlight('Petition readiness snapshot', [
      `Candidate: ${data.candidateName} · Pathway(s): ${data.pathways}`,
      `Readiness index: ${data.readinessScore}/100 · Status: ${displaySubmissionReadyStatus(report.baseline.attorneyReadyStatus)}`,
      `Consulting build mandate: ${report.totalAssetsToBuild} new evidence assets · Primary gap: ${report.baseline.primaryGap}`,
      `Projected post-execution readiness: ${report.conclusion.projectedReadinessMin}–${report.conclusion.projectedReadinessMax}/100`,
    ]),
  )

  sections.push(h1('Structured Profile Extraction — Parsing Phase'))
  sections.push(p('Deep profile parsing pipeline — structured extraction telemetry'))
  sections.push(
    p('The following stages mirror the in-application parsing engine: deterministic segmentation, entity resolution, and domain inference prior to LLM assessment.'),
  )
  for (const stage of enrichment.parsingStages) {
    sections.push(h3(stage.stage))
    sections.push(p(`Engine: ${stage.engine} · Status: ${stage.status.toUpperCase()}`))
    if (stage.metrics.length) {
      sections.push(
        table(
          ['Metric', 'Value'],
          stage.metrics.map((m) => [m.label, m.value]),
        ),
      )
    }
    if (stage.notes.length) sections.push(ul(stage.notes))
  }
  sections.push(
    table(
      ['Profile field', 'Extracted value'],
      structuredProfileTableRows(state.structuredProfile),
    ),
  )
  if (report.conclusion.positioningThemeRows?.length) {
    sections.push(h1('Strategic positioning themes'))
    sections.push(
      table(
        ['Theme', 'Interpretation'],
        report.conclusion.positioningThemeRows.map((t) => [t.theme, t.interpretation]),
      ),
    )
  } else if (report.conclusion.positioningThemes.length) {
    sections.push(h1('Strategic positioning themes'))
    sections.push(ul(report.conclusion.positioningThemes))
  }
  if (report.conclusion.profileArchetype) {
    sections.push(p(`Profile archetype: ${report.conclusion.profileArchetype}`))
  }
  if (report.conclusion.pathwayRecommendation) {
    const pr = report.conclusion.pathwayRecommendation
    sections.push(h1('Pathway recommendation snapshot'))
    sections.push(
      highlight('Primary / secondary pathways', [
        `Primary: ${pr.primary}${pr.secondary ? ` · Secondary: ${pr.secondary}` : ''}`,
        `Filing status: ${pr.filingStatus}`,
        `Build focus: ${pr.buildFocus}`,
      ]),
    )
    sections.push(
      table(
        ['Pathway', 'Readiness', 'Status', 'Finding'],
        pr.rows.map((r) => [r.pathway, `${r.readinessScore}/100`, r.status, r.finding]),
      ),
    )
  }

  sections.push(partBanner('Part I', 'Readiness Benchmark Report'))
  for (const lead of enrichment.readinessLegalPreamble) sections.push(p(lead, 'lead'))
  sections.push(h1('I.1 Corrected Evaluation Logic'))
  sections.push(enrichment.evaluationLogicLegal.map((t) => p(t)).join(''))
  if (report.conclusion.pathwayRecommendation?.rows.length) {
    sections.push(h1('I.1b Per-pathway baseline assessment'))
    sections.push(
      table(
        ['Pathway', 'Readiness', 'Status', 'Finding'],
        report.conclusion.pathwayRecommendation.rows.map((r) => [
          r.pathway,
          `${r.readinessScore}/100`,
          r.status,
          r.finding,
        ]),
      ),
    )
  }
  sections.push(h1('I.2 Aggregate readiness & consulting baseline'))
  sections.push(
    table(
      ['Assessment metric', 'Finding (consulting rubric)'],
      [
        ['Readiness score', `${report.baseline.readinessScore} / 100`],
        ['Evidence strength', report.baseline.evidenceStrength],
        ['Submission-ready status', displaySubmissionReadyStatus(report.baseline.attorneyReadyStatus)],
        ['Primary regulatory gap', report.baseline.primaryGap],
        ['Consulting requirement', report.baseline.consultingRequirement],
        ['Verification owner', report.baseline.verificationOwner],
      ],
    ),
  )
  sections.push(h1('I.3 Profile-Derived Positioning Summary'))
  sections.push(highlight('Available evidence vs. required build portfolio', [enrichment.positioningParagraph]))
  sections.push(h1('I.4 Quantified Roadmap — Build Quantities & Scores'))
  sections.push(
    table(
      ['Roadmap area', 'Current', 'Target', 'Qty to build', 'Priority'],
      report.roadmapTable.map((row) => [
        row.area,
        `${row.currentScore}/100`,
        `${row.targetScore}/100`,
        String(row.quantityToBuild),
        row.priority,
      ]),
    ),
  )
  sections.push(h2('Roadmap justifications (per area)'))
  for (const row of report.roadmapTable) {
    if (!row.quantityToBuild && row.currentScore >= row.targetScore) continue
    sections.push(h3(row.area))
    sections.push(ul(enrichment.roadmapJustifications[row.id] ?? []))
  }
  sections.push(h1('I.5 Consulting Team Responsibilities by Area'))
  for (const block of enrichment.consultingAreas) {
    sections.push(h3(block.area))
    if (block.areaOutline?.trim()) sections.push(p(block.areaOutline))
    sections.push(p(block.consultingResponsibility))
    sections.push(h3('Justification'))
    sections.push(ul(block.justifications))
    sections.push(h3('Profile-aligned recommendations'))
    sections.push(ul(block.recommendations))
  }
  sections.push(h1('I.6 Minimum Recommended Build Package'))
  sections.push(ul(report.minimumBuildPackage))
  sections.push(p(`Total assets to build: ${report.totalAssetsToBuild}`, 'bold'))

  if (enrichment.paperItems.length) {
    sections.push(h1('I.7 Recommended Papers to Build'))
    for (const item of enrichment.paperItems) {
      sections.push(h3(item.title))
      sections.push(
        [
          item.purpose ? `Purpose: ${item.purpose}` : '',
          item.technicalBasis ? `Technical basis: ${item.technicalBasis}` : '',
          item.eb1aContribution ? `EB-1 contribution: ${item.eb1aContribution}` : '',
        ]
          .filter(Boolean)
          .map((t) => p(t))
          .join(''),
      )
      sections.push(ul([`Justification: ${item.justification}`]))
    }
  }

  if (enrichment.patentItems.length) {
    sections.push(h1('I.8 Recommended Patents to Build'))
    for (const item of enrichment.patentItems) {
      sections.push(h3(item.title))
      sections.push(
        [
          item.technicalBasis ? `Technical basis: ${item.technicalBasis}` : '',
          item.eb1aContribution ? `EB-1 contribution: ${item.eb1aContribution}` : '',
        ]
          .filter(Boolean)
          .map((t) => p(t))
          .join(''),
      )
      sections.push(ul([`Justification: ${item.justification}`]))
    }
  }

  if (enrichment.productItems.length) {
    sections.push(h1('I.9 Recommended Products / Prototypes to Build'))
    for (const item of enrichment.productItems) {
      sections.push(h3(item.title))
      sections.push(
        [
          item.purpose ? `Purpose: ${item.purpose}` : '',
          item.hwSwCombination ? `Hardware + software: ${item.hwSwCombination}` : '',
          `Market position: ${item.marketPosition}`,
          `ROI outline: ${item.roiOutline}`,
          `Financial impact: ${item.financialImpact}`,
          `Social impact: ${item.socialImpact}`,
          item.eb1aContribution ? `EB-1 contribution: ${item.eb1aContribution}` : '',
        ]
          .filter(Boolean)
          .map((t) => p(t))
          .join(''),
      )
      if (item.keyFeatures?.length) {
        sections.push(h3('Key features'))
        sections.push(ul(item.keyFeatures))
      }
      sections.push(ul([`Justification: ${item.justification}`]))
    }
  }

  for (const block of enrichment.supplementaryBlocks) {
    sections.push(h1(block.title))
    sections.push(p(block.intro))
    for (const item of block.items) {
      sections.push(h3(item.title))
      sections.push(p(item.detail))
      sections.push(ul([`Justification: ${item.justification}`]))
    }
  }

  const criteriaSec = report.sections.find((s) => s.id === 'sec-criteria')
  if (criteriaSec?.table?.length) {
    sections.push(h1('I.16 EB-1A Criteria Improvement Projection'))
    sections.push(
      table(
        ['Criterion area', 'Current', 'Build', 'Target'],
        criteriaSec.table.map((t) => [t.label, t.current, t.build, t.target]),
      ),
    )
  }

  sections.push(partBanner('Part II', 'Profile Improvement Roadmap'))
  sections.push(h1('II.1 RM Quantified Benchmark Matrix'))
  sections.push(
    p('Official RM targets for SCI, SCOPUS, conferences, patents, products, book chapters, and guest lectures compared against inferred profile counts.'),
  )
  for (const rm of data.roadmaps) {
    sections.push(h2(`${rm.visaCategory} — ${rm.overallCompletionPercent}% benchmark completion (${rm.totalGap} gaps)`))
    sections.push(
      table(
        ['Metric', 'Current', 'RM target', 'Gap', 'Status'],
        rm.metrics.map((m) => [
          m.label,
          String(m.current),
          String(m.target),
          m.met ? '—' : `+${m.gap}`,
          m.met ? 'Target met' : 'Build required',
        ]),
      ),
    )
  }

  sections.push(h1('II.2 Prioritized Execution Plan (all evidence factors)'))
  for (const entry of enrichment.executionPlan) {
    sections.push(h3(`P${entry.priority}: ${entry.title}`))
    sections.push(
      [
        `Evidence factor: ${entry.factor}`,
        `Area: ${entry.area}`,
        `Deliverable: ${entry.deliverable}`,
        `Timeline: ${entry.timeframe} · Readiness uplift: +${entry.readinessGain}%`,
      ].map((t) => p(t)).join(''),
    )
    sections.push(h3('Justification'))
    sections.push(
      ul(entry.justifications.length ? entry.justifications : ['Profile-matched build required per Part I roadmap.']),
    )
  }

  const sorted = [...data.actions].sort((a, b) => a.priority - b.priority)
  if (sorted.length) {
    sections.push(h1('II.3 Roadmap action detail register'))
    for (const action of sorted) {
      sections.push(h3(`Priority ${action.priority}: ${action.title}`))
      sections.push(
        [
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
        ]
          .filter(Boolean)
          .map((t) => p(t))
          .join(''),
      )
    }
  }

  sections.push(h1('II.4 Implementation Timeline'))
  for (const phase of report.timeline) {
    sections.push(h3(`${phase.phase} (${phase.duration})`))
    sections.push(ul(phase.outputs))
  }

  sections.push(partBanner('Part III', 'Supplementary Eligibility Analysis'))
  sections.push(h1('III.1 Parsed achievements'))
  if (state.parsedAchievements.length) {
    sections.push(
      table(
        ['Type', 'Summary', 'Domain', 'Confidence'],
        state.parsedAchievements.map((a) => [
          a.type,
          a.summary.slice(0, 100),
          a.domain ?? '—',
          `${Math.round(a.confidence * 100)}%`,
        ]),
      ),
    )
  }

  sections.push(h1('III.2 Evidence mapping'))
  const evidenceRows = state.evidenceItems.map((e) => [
    e.criterionId,
    e.label.slice(0, 70),
    e.strength,
    (e.notes || '—').slice(0, 40),
  ])
  if (evidenceRows.length) {
    sections.push(table(['Criterion', 'Evidence', 'Strength', 'Source'], evidenceRows))
  }

  sections.push(h1('III.3 Criterion-level status'))
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
  if (criteriaRows.length) {
    sections.push(table(['Pathway', 'Code', 'Criterion', 'Status', 'Strength'], criteriaRows))
  }

  sections.push(h1('III.4 Critical gap summary'))
  if (state.gaps.length) {
    sections.push(
      table(
        ['Severity', 'Gap', 'Impact'],
        state.gaps.map((g) => [g.severity, g.title, String(g.impactScore)]),
      ),
    )
  } else {
    sections.push(p('No critical gaps recorded for this profile.'))
  }

  if (state.recommendations.length) {
    sections.push(h1('III.5 Evidence build plan (consulting deliverables)'))
    sections.push(
      table(
        ['Document / asset', 'Purpose', 'Priority', 'Impact %'],
        state.recommendations.map((r) => [
          r.documentType.slice(0, 45),
          r.purpose.slice(0, 80),
          r.priority,
          String(r.estimatedImpactPercent),
        ]),
      ),
    )
  }

  if (state.profileInsights.length) {
    sections.push(h1('III.6 Profile strategy insights'))
    sections.push(
      table(
        ['Category', 'Actionable items', 'Consulting services', 'Regulatory basis'],
        state.profileInsights.map((row) => [
          row.categoryOfficialName.slice(0, 40),
          row.actionableItems.join('; ').slice(0, 90),
          row.rmTeamRecommendedServices.join('; ').slice(0, 70),
          row.sourceStrategicBasis.slice(0, 80),
        ]),
      ),
    )
  }

  if (state.riskFlags.length) {
    sections.push(h1('III.7 Risk flags & claim review'))
    sections.push(
      table(
        ['Claim', 'Risk', 'Severity', 'Recommendation'],
        state.riskFlags.map((r) => [
          r.claim.slice(0, 60),
          r.riskType,
          r.severity,
          r.recommendation.slice(0, 80),
        ]),
      ),
    )
  }

  sections.push(h1('Verification Package Index'))
  sections.push(ul(report.attorneyPackageItems))
  sections.push(p(report.attorneyPackageTotal))
  sections.push(h1('Final Benchmark Conclusion'))
  sections.push(highlight('Scientific & consulting conclusion', [enrichment.finalConclusion]))
  sections.push(
    [
      `Projected readiness after execution: ${report.conclusion.projectedReadinessMin}–${report.conclusion.projectedReadinessMax}/100.`,
      `Projected submission-ready score: ${report.conclusion.projectedAttorneyMin}–${report.conclusion.projectedAttorneyMax}/100.`,
      displayReportFootnote(report),
      `${appConfig.appName} · ${new Date(data.generatedAt).toLocaleDateString('en-US')}`,
    ].map((t) => p(t)).join(''),
  )
  sections.push(p(LEGAL_FOOTER, 'footer'))

  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<meta name="ProgId" content="Word.Document">
<meta name="Generator" content="${esc(appConfig.appName)}">
<title>EB-1 Professional Review Dossier — ${esc(data.candidateName)}</title>
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View></w:WordDocument></xml><![endif]-->
<style>
  @page { size: 8.5in 11in; margin: 0.75in; }
  body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; color: #475569; line-height: 1.45; }
  .cover { margin-bottom: 24pt; page-break-after: always; }
  .confidential { font-size: 9pt; font-weight: bold; color: #B48C32; letter-spacing: 0.05em; }
  .cover-title { font-size: 22pt; color: #0F172A; font-weight: bold; margin: 12pt 0; }
  .candidate { font-size: 14pt; font-weight: bold; color: #0F172A; margin-top: 16pt; }
  .disclaimer { font-size: 9pt; color: #64748B; margin-top: 36pt; font-style: italic; }
  h1.section { font-size: 14pt; color: #0F172A; font-weight: bold; border-bottom: 1pt solid #E2E8F0; padding-bottom: 4pt; margin-top: 18pt; page-break-after: avoid; }
  h2.subsection { font-size: 12pt; color: #1E293B; font-weight: bold; margin-top: 14pt; }
  h3.subsubsection { font-size: 11pt; color: #1E293B; font-weight: bold; margin-top: 10pt; }
  p.body { margin: 6pt 0; }
  p.lead { font-weight: bold; color: #0F172A; margin: 8pt 0; }
  p.bold { font-weight: bold; color: #0F172A; margin: 10pt 0; }
  p.footer { font-size: 9pt; font-style: italic; margin-top: 24pt; border-top: 1pt solid #E2E8F0; padding-top: 8pt; }
  ul.bullets { margin: 6pt 0 10pt 18pt; }
  ul.bullets li { margin-bottom: 4pt; }
  .highlight { background: #F8FAFC; border: 1pt solid #E2E8F0; padding: 10pt 12pt; margin: 10pt 0; }
  .highlight-title { font-weight: bold; color: #0F172A; margin: 0 0 6pt 0; }
  .part-banner { background: #0F172A; color: #fff; padding: 14pt 16pt; margin: 18pt 0; page-break-before: always; }
  .part-label { font-size: 9pt; font-weight: bold; color: #D4AF37; margin: 0; letter-spacing: 0.08em; }
  .part-title { font-size: 16pt; font-weight: bold; color: #fff; margin: 6pt 0 0 0; }
  table.data { width: 100%; border-collapse: collapse; margin: 10pt 0 16pt 0; font-size: 10pt; }
  table.data th { background: #0F172A; color: #fff; font-weight: bold; text-align: left; padding: 6pt 8pt; border: 1pt solid #1E293B; }
  table.data td { padding: 5pt 8pt; border: 1pt solid #E2E8F0; vertical-align: top; }
  table.data tr:nth-child(even) td { background: #F8FAFC; }
</style>
</head>
<body>
${sections.join('\n')}
</body>
</html>`
}

function triggerWordDownload(html: string, filename: string): void {
  const blob = new Blob(['\ufeff', html], {
    type: 'application/msword;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export function downloadCombinedAttorneyDossierWord(
  data: AttorneyDossierData,
  state: AssessmentState,
): void {
  const html = buildWordHtml(data, state)
  const name = slugifyFilename(data.candidateName)
  const date = new Date(data.generatedAt).toISOString().slice(0, 10)
  triggerWordDownload(html, `EB1-Professional-Dossier-${name}-${date}.doc`)
}
