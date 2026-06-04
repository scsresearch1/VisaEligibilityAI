import { VISA_CRITERIA } from '../../data/visa-criteria'
import { buildDeliverableSpec } from '../action-deliverable-spec'
import {
  extractProfileSignals,
  type ExtractedProfileSignals,
} from '../benchmark-report/extract-profile'
import { EB1A_ROADMAP_AREAS } from '../benchmark-report/roadmap-areas'
import { primaryFieldForDeliverables } from '../profile-field-inference'
import type { AttorneyDossierData } from './build-dossier-data'
import type { ParsingStageRow } from './pdf-utils'
import type { AssessmentState } from '../../types/assessment'
import type {
  BenchmarkDetailedItem,
  BenchmarkReport,
  BenchmarkRoadmapRow,
} from '../../types/benchmark-report'
import type { StructuredResumeProfile } from '../resume-deep-extract'
import { buildResumeSectionTaxonomy } from '../reference-profile/resume-section-taxonomy'
import {
  buildDomainDeliverables,
  productSpecsForProfile,
  publicationTitlesForProfile,
  patentTitlesForProfile,
} from '../reference-profile/deliverable-titles'

export interface EnrichedConsultingArea {
  area: string
  areaOutline: string
  consultingResponsibility: string
  justifications: string[]
  recommendations: string[]
}

export interface EnrichedDeliverableItem extends BenchmarkDetailedItem {
  justification: string
}

export interface EnrichedProductItem extends EnrichedDeliverableItem {
  keyFeatures: string[]
  marketPosition: string
  roiOutline: string
  financialImpact: string
  socialImpact: string
  hwSwCombination?: string
}

export interface SupplementaryEvidenceBlock {
  title: string
  intro: string
  items: { title: string; detail: string; justification: string }[]
}

export interface ExecutionPlanEntry {
  priority: number
  title: string
  area: string
  factor: string
  deliverable: string
  timeframe: string
  readinessGain: number
  justifications: string[]
}

export interface DossierPdfEnrichment {
  parsingStages: ParsingStageRow[]
  readinessLegalPreamble: string[]
  evaluationLogicLegal: string[]
  roadmapJustifications: Record<string, string[]>
  consultingAreas: EnrichedConsultingArea[]
  positioningParagraph: string
  paperItems: EnrichedDeliverableItem[]
  patentItems: EnrichedDeliverableItem[]
  productItems: EnrichedProductItem[]
  supplementaryBlocks: SupplementaryEvidenceBlock[]
  executionPlan: ExecutionPlanEntry[]
  finalConclusion: string
}

function criterionLabels(ids: string[]): string {
  return ids
    .map((id) => {
      const c = VISA_CRITERIA.find((x) => x.id === id)
      return c ? `${c.code} (${c.title.slice(0, 50)})` : id
    })
    .join('; ')
}

function findRoadmapRow(
  table: BenchmarkRoadmapRow[],
  ...matchers: string[]
): BenchmarkRoadmapRow | undefined {
  return table.find((r) =>
    matchers.some(
      (m) => r.id === m || r.area.toLowerCase().includes(m.toLowerCase()),
    ),
  )
}

function roadmapBuildQty(table: BenchmarkRoadmapRow[], ...matchers: string[]): number {
  return findRoadmapRow(table, ...matchers)?.quantityToBuild ?? 0
}

function isCounselReviewRow(row: BenchmarkRoadmapRow): boolean {
  return row.id === 'br-attorney' || /counsel review|attorney-review|professional review package/i.test(row.area)
}

const AREA_INSIGHT_HINTS: Record<string, string[]> = {
  'br-pub': ['publication', 'scholarly', 'authorship', 'paper'],
  'br-patent': ['patent', 'ip', 'invention'],
  'br-product': ['product', 'prototype', 'artifact'],
  'br-whitepaper': ['white paper', 'whitepaper', 'framework'],
  'br-articles': ['article', 'media', 'press'],
  'br-speaking': ['speaking', 'conference', 'keynote', 'lecture'],
  'br-judging': ['judging', 'review', 'panel'],
  'br-expert': ['expert', 'recognition', 'visibility'],
  'br-case': ['case study', 'narrative'],
  'br-proddoc': ['documentation', 'validation'],
  'br-visibility': ['citation', 'visibility', 'scholar'],
}

export function buildParsingPhaseStages(
  state: AssessmentState,
  structuredSummary: string,
  profile?: ExtractedProfileSignals,
): ParsingStageRow[] {
  const sp = state.structuredProfile
  const uploads = state.uploads
  const achievements = state.parsedAchievements
  const p = profile ?? extractProfileSignals(state.uploads)
  const taxonomy = buildResumeSectionTaxonomy(p, state)

  const sectionCount = taxonomy.sectionsDetected || sp?.parsedSections?.length || 0
  const workCount = taxonomy.workExperienceEntries
  const eduCount = taxonomy.educationEntries
  const pubCount = taxonomy.publicationEntries
  const patentCount = taxonomy.patentEntries

  return [
    {
      stage: 'Stage 1 — Document ingest & OCR normalization',
      engine: 'Multi-format parser · PDF/DOCX',
      status: uploads.length > 0 ? 'complete' : 'pending',
      metrics: [
        { label: 'Files ingested', value: String(uploads.length) },
        { label: 'Aggregate text length', value: `${structuredSummary.length.toLocaleString()} chars` },
        { label: 'Extraction quality', value: sp?.extractionQuality ?? 'pending' },
      ],
      notes: uploads.map((u) => `${u.name} (${u.category})`).slice(0, 4),
    },
    {
      stage: 'Stage 2 — Section segmentation & entity resolution',
      engine: 'Multi-layout CV segmenter',
      status: sectionCount >= 4 ? 'complete' : sectionCount > 0 ? 'partial' : 'pending',
      metrics: [
        { label: 'Sections detected', value: String(sectionCount) },
        { label: 'Work entries', value: String(workCount) },
        { label: 'Education entries', value: String(eduCount) },
        { label: 'Candidate identity', value: sp?.candidateName ?? '—' },
        { label: 'Product / project entries', value: String(taxonomy.productOrProjectEntries) },
      ],
      notes: taxonomy.sectionHeadings.length
        ? taxonomy.sectionHeadings
        : (sp?.parsedSections ?? []).slice(0, 5).map((s) => s.heading),
    },
    {
      stage: 'Stage 3 — Signal extraction & domain inference',
      engine: 'Profile signal graph',
      status: achievements.length > 0 || workCount > 0 ? 'complete' : 'partial',
      metrics: [
        { label: 'Parsed achievements', value: String(taxonomy.parsedAchievements || achievements.length) },
        { label: 'Publications indexed', value: String(pubCount) },
        { label: 'Patents indexed', value: String(patentCount) },
        { label: 'Inferred domain', value: taxonomy.inferredDomain.slice(0, 48) },
        { label: 'Leadership / managerial', value: `${taxonomy.leadershipSignals} / ${taxonomy.managerialSignals}` },
      ],
      notes: [
        ...taxonomy.employersAndClients.slice(0, 3).map((e) => `Entity: ${e}`),
        ...achievements.slice(0, 2).map((a) => {
        const summary = a.summary?.trim() ?? ''
        const excerpt = summary.length > 60 ? `${summary.slice(0, 60)}…` : summary || '(no summary)'
        return `${a.type}: ${excerpt}`
        }),
      ].slice(0, 5),
    },
    {
      stage: 'Stage 4 — Regulatory rule engine pre-score',
      engine: '8 CFR §204.5 · INA-aligned rubric',
      status: state.analysisComplete ? 'complete' : 'partial',
      metrics: [
        { label: 'Criteria evaluated', value: String(state.criterionResults.length) },
        { label: 'Evidence mappings', value: String(state.evidenceItems.length) },
        { label: 'Gap records', value: String(state.gaps.length) },
      ],
      notes: ['Deterministic scores feed LLM reconciliation; no petition inference without counsel review.'],
    },
    {
      stage: 'Stage 5 — Benchmark & dossier synthesis',
      engine: 'Hybrid LLM + heuristic reconcile',
      status: state.benchmarkReport ? 'complete' : 'partial',
      metrics: [
        { label: 'Roadmap actions', value: String(state.roadmap.length) },
        { label: 'Build recommendations', value: String(state.recommendations.length) },
        { label: 'Profile insights', value: String(state.profileInsights.length) },
      ],
      notes: ['Output below reflects verified intake only; build quantities are consulting targets, not USCIS findings.'],
    },
  ]
}

function roadmapJustificationForRow(
  row: BenchmarkRoadmapRow,
  state: AssessmentState,
  field: string,
): string[] {
  const areaDef = EB1A_ROADMAP_AREAS.find((a) => a.id === row.id)
  const gap = Math.max(0, row.targetScore - row.currentScore)
  const hints = AREA_INSIGHT_HINTS[row.id] ?? [row.area.split(/[\s/]/)[0]?.toLowerCase() ?? '']
  const relatedGaps = state.gaps
    .filter((g) => hints.some((h) => h && g.title.toLowerCase().includes(h)))
    .slice(0, 2)

  const bullets: string[] = [
    `Regulatory nexus: ${areaDef ? criterionLabels(areaDef.criterionIds) : 'EB-1A extraordinary ability evidence architecture'}.`,
    `Quantified gap: current rubric ${row.currentScore}/100 vs. petition-ready target ${row.targetScore}/100 (Δ ${gap} points).`,
    `Build mandate: ${row.quantityToBuild} externally verifiable asset(s) in ${field} — existing uploads cannot substitute for newly created evidence.`,
  ]

  if (relatedGaps.length > 0) {
    bullets.push(`Linked critical gap: ${relatedGaps.map((g) => g.title).join('; ')}.`)
  }

  const evidence = state.evidenceItems.filter((e) =>
    areaDef?.criterionIds.includes(e.criterionId),
  )
  if (evidence.length > 0) {
    bullets.push(
      `Existing mapped evidence (${evidence.length} item(s)) requires supplementation to meet "preponderance of evidence" consulting standard.`,
    )
  } else {
    bullets.push('No sufficient mapped evidence on file — greenfield build required for this criterion cluster.')
  }

  return bullets
}

function consultingRecommendationsForArea(
  row: BenchmarkRoadmapRow,
  state: AssessmentState,
  profile: ExtractedProfileSignals,
  profileField: string,
): string[] {
  if (isCounselReviewRow(row)) {
    return [
      'Compile verified exhibits, claim-safety memo, and counsel sign-off package after all build assets are complete.',
      'Cross-reference each built asset to criterion mapping in Part III before filing review.',
    ]
  }

  if (row.quantityToBuild <= 0) {
    return [
      `Maintain documentary records for ${row.area}; rubric target met or no incremental build quantity assigned.`,
    ]
  }

  const spec = buildDeliverableSpec(row.id, profile, row.quantityToBuild)
  const recs: string[] = []

  if (spec?.suggestedTitles?.length) {
    recs.push(`Prioritize deliverable titles: ${spec.suggestedTitles.slice(0, 2).join('; ')}.`)
  }
  if (spec?.outline) {
    recs.push(spec.outline.slice(0, 280))
  }

  const hints = AREA_INSIGHT_HINTS[row.id] ?? []
  const insights = state.profileInsights
    .filter((i) =>
      hints.some(
        (h) =>
          i.categoryOfficialName.toLowerCase().includes(h) ||
          i.sourceStrategicBasis.toLowerCase().includes(h),
      ),
    )
    .slice(0, 1)
  for (const ins of insights) {
    recs.push(`Strategy insight: ${ins.actionableItems[0]?.slice(0, 200) ?? ins.sourceStrategicBasis.slice(0, 200)}`)
  }

  if (recs.length === 0) {
    recs.push(
      `Engage subject-matter consultants to produce ${row.quantityToBuild} ${row.area.toLowerCase()} asset(s) with third-party verification, indexed to ${profileField} and the candidate's documented role.`,
    )
  }

  return recs.slice(0, 4)
}

export function buildPositioningParagraph(
  state: AssessmentState,
  report: BenchmarkReport,
  profile: ExtractedProfileSignals,
): string {
  const sp = state.structuredProfile
  const field = primaryFieldForDeliverables(profile.domains, profile.fullText)

  const available: string[] = []
  if (sp?.workExperience?.length) available.push(`${sp.workExperience.length} documented employment record(s)`)
  if (sp?.education?.length) available.push(`${sp.education.length} education credential(s)`)
  if (profile.publications.length) available.push(`${profile.publications.length} publication reference(s) on intake`)
  if (profile.patents.length) available.push(`${profile.patents.length} patent/IP reference(s)`)
  if (state.evidenceItems.length) available.push(`${state.evidenceItems.length} evidence mapping(s) to regulatory criteria`)

  const toBuild = report.roadmapTable
    .filter((r) => r.quantityToBuild > 0 && !/counsel review/i.test(r.area))
    .map((r) => `${r.quantityToBuild}× ${r.area}`)
    .slice(0, 6)

  return [
    `Professional positioning assessment for ${report.candidateName} in ${field}.`,
    `Materials presently available from intake include: ${available.length > 0 ? available.join('; ') : 'limited structured extraction — counsel should verify all claims independently'}.`,
    `Under the consulting build model applied herein, petition readiness at ${report.baseline.readinessScore}/100 reflects documented baseline strength only; it does not constitute a USCIS approval prediction.`,
    `To approach the projected post-execution band of ${report.conclusion.projectedReadinessMin}–${report.conclusion.projectedReadinessMax}/100, the qualified consulting team must architect and deliver: ${toBuild.join('; ')}${toBuild.length < report.roadmapTable.filter((r) => r.quantityToBuild > 0).length ? '; and additional ancillary evidence per Part I roadmap' : ''}.`,
    `Primary regulatory gap: ${report.baseline.primaryGap}. Verification owner: ${report.baseline.verificationOwner}.`,
  ].join(' ')
}

function enrichPaperItems(profile: ExtractedProfileSignals, count: number): EnrichedDeliverableItem[] {
  if (count <= 0) return []
  const field = primaryFieldForDeliverables(profile.domains, profile.fullText)
  const titles = publicationTitlesForProfile(profile, count)

  return titles.slice(0, count).map((title, i) => ({
    title,
    purpose: `Peer-reviewed or proceedings-indexed authorship output ${i + 1} establishing sustained scholarly contribution in ${field}.`,
    technicalBasis: profile.workExperience[0]?.highlights[i] ?? profile.keyClaims[i] ?? `Documented expertise in ${field}.`,
    eb1aContribution: 'Supports 8 CFR extraordinary ability authorship / scholarly article criterion cluster with verifiable citation trail.',
    justification: `Title derived from profile anchors (${profile.workExperience[0]?.title ?? 'documented role'} at ${profile.workExperience[0]?.company ?? 'primary employer'}) and gap closure requirement for ${count} publication(s) in ${field}.`,
  }))
}

function enrichPatentItems(profile: ExtractedProfileSignals, count: number): EnrichedDeliverableItem[] {
  if (count <= 0) return []
  const field = primaryFieldForDeliverables(profile.domains, profile.fullText)
  const deliverables = buildDomainDeliverables(profile, 2, count, 2)
  const titles = patentTitlesForProfile(profile, count).length
    ? patentTitlesForProfile(profile, count)
    : deliverables.patents

  return titles.slice(0, count).map((title, i) => ({
    title,
    technicalBasis: buildDeliverableSpec('br-patent', profile, 1)?.outline ?? 'Enablement draft from profile-documented innovation.',
    eb1aContribution: 'Original contribution of major significance — patent prosecution package with claims, figures, and inventor declaration.',
    justification: `Patent ${i + 1} maps to documented technical work in ${field}; USPTO-grade title reflects reduction-to-practice narrative suitable for counsel and technical expert review.`,
  }))
}

function enrichProductItems(profile: ExtractedProfileSignals, count: number): EnrichedProductItem[] {
  if (count <= 0) return []
  const field = primaryFieldForDeliverables(profile.domains, profile.fullText)
  const job = profile.workExperience[0]
  const domainProducts = productSpecsForProfile(profile, count)

  if (domainProducts.length > 0) {
    return domainProducts.slice(0, count).map((p, i) => ({
      title: p.name,
      purpose: 'Demonstrable original contribution with third-party evaluable artifact.',
      keyFeatures: [
        'Architecture documentation and validation harness',
        'Audit-ready performance or reliability metrics',
        'Third-party or expert review pathway',
      ],
      marketPosition: `Profile-aligned ${field} deliverable ${i + 1} for counsel review.`,
      roiOutline: p.financialImpact,
      financialImpact: p.financialImpact,
      socialImpact: p.socialImpact,
      technicalImpact: p.technicalImpact,
      eb1aContribution: 'Supports product / original contribution criterion.',
      justification: `Product ${i + 1} synthesized from ${job ? `${job.title} @ ${job.company}` : 'documented technical narrative'} in ${field}.`,
    }))
  }

  const items: EnrichedProductItem[] = [
    {
      title: `Integrated ${field} Platform — Hardware Telemetry + Software Analytics Suite`,
      purpose: 'Demonstrable original contribution with third-party evaluable artifact.',
      keyFeatures: [
        'Edge acquisition module with calibrated sensors and secure firmware OTA',
        'Cloud analytics dashboard with reproducible experiment logs and API export',
        'Validation harness producing audit-ready performance benchmarks',
      ],
      marketPosition: `Positioned for ${field} practitioners requiring verifiable R&D outcomes — comparable to industry lab-in-a-box offerings with academic/enterprise dual licensing.`,
      roiOutline: '12–18 month payback via reduced prototyping cycles, grant reporting efficiency, and licensable reference implementation.',
      financialImpact: 'Documented cost avoidance in lab setup, potential licensing revenue, and grant/industry partnership eligibility.',
      socialImpact: 'Accelerates workforce-ready engineering training and open reproducibility in applied research settings.',
      hwSwCombination:
        'Deliver bundled hardware demonstrator (prototype PCB or instrumented kit) with companion software for acquisition, visualization, and export — suitable for independent technical review.',
      eb1aContribution: 'Supports product / original contribution criterion with externally testable system.',
      justification: `Product concept synthesized from ${job ? `${job.title} @ ${job.company}` : 'profile technical narrative'} in ${field}; hardware–software coupling maximizes verifiability for adjudication-ready exhibits.`,
    },
    {
      title: `${field} Reference Implementation — Audited Codebase + Technical Validation Report`,
      purpose: 'Shippable software artifact with measurable adoption or performance metrics.',
      keyFeatures: [
        'Modular architecture with documented APIs and test coverage',
        'Performance benchmarks vs. published baselines',
        'Third-party or departmental validation letter',
      ],
      marketPosition: 'Open-core or enterprise reference stack aligned to documented domain expertise.',
      roiOutline: 'Efficiency gains for institutional adopters; cite adoption metrics where verifiable.',
      financialImpact: 'Operational savings and partnership pipeline where metrics are documentable.',
      socialImpact: 'Knowledge transfer through reproducible tooling in education and industry.',
      justification: `Secondary prototype closes product quantity gap with profile-anchored scope in ${field}.`,
    },
  ]

  return items.slice(0, count)
}

function buildSupplementaryBlocks(
  profile: ExtractedProfileSignals,
  table: BenchmarkRoadmapRow[],
): SupplementaryEvidenceBlock[] {
  const field = primaryFieldForDeliverables(profile.domains, profile.fullText)

  const whiteQty = roadmapBuildQty(table, 'br-whitepaper', 'White Paper')
  const articleQty = roadmapBuildQty(table, 'br-articles', 'Industry Articles')
  const speakQty = roadmapBuildQty(table, 'br-speaking', 'Speaking')
  const judgeQty = roadmapBuildQty(table, 'br-judging', 'Judging')

  const blocks: SupplementaryEvidenceBlock[] = []

  if (whiteQty > 0) {
    const wpSpec = buildDeliverableSpec('br-whitepaper', profile, whiteQty)
    blocks.push({
      title: 'Technical White Papers & Research-Grade Articles',
      intro: `Consulting deliverables beyond core journal publications — ${whiteQty} structured white paper(s).`,
      items: (wpSpec?.suggestedTitles ?? [`${field} maturity model`]).slice(0, whiteQty).map((t) => ({
        title: t,
        detail: wpSpec?.outline ?? `Structured monograph with diagrams, citations, and executive summary in ${field}.`,
        justification: `Supports original contribution and authorship clusters; topic aligned to ${profile.workExperience[0]?.title ?? 'documented practice'}.`,
      })),
    })
  }

  if (articleQty > 0) {
    const mediaSpec = buildDeliverableSpec('br-articles', profile, articleQty)
    const titles =
      mediaSpec?.suggestedTitles?.length ?
        mediaSpec.suggestedTitles
      : [`Industry profile feature: leadership in ${field}`]
    blocks.push({
      title: 'Industry Articles, Media Placement & Published Material About the Candidate',
      intro: `${articleQty} third-party published material(s) per published-material criterion.`,
      items: titles.slice(0, articleQty).map((t) => ({
        title: t,
        detail: 'Trade press, professional society magazine, or major industry outlet — retain circulation data and author independence proof.',
        justification: `Media narrative must feature candidate's role in ${field}, not self-published blog content.`,
      })),
    })
  }

  if (speakQty > 0) {
    const speakSpec = buildDeliverableSpec('br-speaking', profile, speakQty)
    blocks.push({
      title: 'Conference Speaking, Keynote Targets & Scholarly Presentations',
      intro: `${speakQty} speaking engagement(s) with verifiable agenda and attendance.`,
      items: [
        {
          title: `Keynote / invited talk: Advances in ${field}`,
          detail: speakSpec?.outline ?? `Target IEEE-style symposium, university forum, or industry summit with published program.`,
          justification: 'Speaking criterion requires agenda, invitation, and organizer attestation — topic tied to profile expertise.',
        },
        {
          title: `Panel / guest lecture: ${profile.workExperience[0]?.highlights[0]?.slice(0, 60) ?? field}`,
          detail: 'Secondary engagement for breadth — record video or certificate where permitted.',
          justification: 'Demonstrates sustained recognition and field leadership beyond single event.',
        },
      ].slice(0, speakQty),
    })
  }

  blocks.push({
    title: 'Awards & Non-Government Recognition Opportunities',
    intro: 'Prioritize independent professional societies, foundations, and industry bodies — not government agencies.',
    items: [
      {
        title: 'Professional society fellow / senior member elevation',
        detail: `IEEE, ACM, ASME, or domain-equivalent body in ${field} with documented selection criteria.`,
        justification: 'Non-government recognition supports awards/prizes criterion when selection is competitive and field-specific.',
      },
      {
        title: 'Industry innovation or teaching excellence award (private foundation)',
        detail: 'Document nomination letter, selection committee independence, and competitive pool size.',
        justification: 'Must be nationally/internationally recognized in the field per regulatory consulting standard.',
      },
      {
        title: 'Competition jury outcome or hackathon grand prize (private sponsor)',
        detail: 'Only if candidate\'s role is central and verifiable; include sponsor entity registration.',
        justification: 'Supplements awards criterion when peer-reviewed publication pipeline is still maturing.',
      },
    ],
  })

  if (judgeQty > 0) {
    blocks.push({
      title: 'Judging, Peer Review & Panel Service',
      intro: `${judgeQty} judging / peer-review role(s).`,
      items: [
        {
          title: `Journal / conference reviewer — ${field}`,
          detail: buildDeliverableSpec('br-judging', profile, 1)?.outline ?? 'Formal appointment with review scope and dates.',
          justification: 'Maps to judging criterion — requires invitation or portal record, not self-declared.',
        },
      ],
    })
  }

  return blocks
}

function buildExecutionPlan(
  state: AssessmentState,
  report: BenchmarkReport,
  data: AttorneyDossierData,
  profile: ExtractedProfileSignals,
  field: string,
): ExecutionPlanEntry[] {
  const entries: ExecutionPlanEntry[] = []
  const seen = new Set<string>()

  for (const row of report.roadmapTable.filter((r) => r.quantityToBuild > 0)) {
    const spec = buildDeliverableSpec(row.id, profile, row.quantityToBuild)
    const key = `${row.id}::${row.areaOutline || row.area}`
    seen.add(key)
    entries.push({
      priority: row.priority === 'Critical' ? 1 : row.priority === 'High' ? 2 : row.priority === 'Medium' ? 3 : 4,
      title: row.areaOutline || row.area,
      area: row.area,
      factor: row.area,
      deliverable: spec?.outline ?? row.consultingResponsibility.slice(0, 200),
      timeframe: row.priority === 'Critical' ? '0–8 weeks' : row.priority === 'High' ? '4–12 weeks' : '8–16 weeks',
      readinessGain: Math.min(15, Math.max(3, row.targetScore - row.currentScore)),
      justifications: roadmapJustificationForRow(row, state, field),
    })
  }

  for (const action of [...data.actions].sort((a, b) => a.priority - b.priority)) {
    const key = `${action.evidenceArea ?? action.domain ?? 'general'}::${action.title}`
    if (seen.has(key)) continue
    seen.add(key)
    entries.push({
      priority: action.priority,
      title: action.title,
      area: action.evidenceArea ?? action.domain ?? 'Cross-cutting',
      factor: action.category,
      deliverable: action.deliverableOutline ?? action.description.slice(0, 200),
      timeframe: action.timeframe,
      readinessGain: action.expectedReadinessGain,
      justifications: [
        action.profileAnchor ? `Profile anchor: ${action.profileAnchor}` : '',
        action.metricGap ? `Closes quantified metric gap: +${action.metricGap}` : '',
        action.quantityToBuild ? `Quantity to build: ${action.quantityToBuild}` : '',
      ].filter(Boolean),
    })
  }

  return entries.sort((a, b) => a.priority - b.priority)
}

export function buildScientificFinalConclusion(report: BenchmarkReport): string {
  const themes = report.conclusion.positioningThemes.slice(0, 3).join('; ')
  return [
    `Independent consulting conclusion for ${report.candidateName}: the evidentiary record, as structured through multi-stage profile parsing and 8 CFR–aligned rubric scoring, presently supports a readiness index of ${report.baseline.readinessScore}/100 with evidence strength classified as ${report.baseline.evidenceStrength}.`,
    `This assessment is not an adjudication forecast; rather, it quantifies the delta between documented intake and the externally verifiable asset portfolio required for attorney-ready filing review.`,
    `Execution of ${report.totalAssetsToBuild} profile-matched build assets — spanning ${themes || 'publications, IP, products, and recognition vectors'} — is projected to elevate defensible readiness to ${report.conclusion.projectedReadinessMin}–${report.conclusion.projectedReadinessMax}/100, with counsel-review submission band ${report.conclusion.projectedAttorneyMin}–${report.conclusion.projectedAttorneyMax}/100 contingent on third-party verification of each deliverable.`,
    `Primary gap remains: ${report.baseline.primaryGap}. All scientific and legal claims in this dossier require independent verification under applicable INA and USCIS policy before petition filing.`,
  ].join(' ')
}

export function buildReadinessLegalPreamble(report: BenchmarkReport, pathways: string): string[] {
  return [
    'READINESS BENCHMARK REPORT — CONFIDENTIAL WORK PRODUCT',
    `Subject: ${report.candidateName} · Pathway(s): ${pathways}`,
    'This Part I analysis applies a quantified evidence-build methodology. Scores reflect consulting rubric alignment, not USCIS approval probability.',
    report.evaluationLogic[0] ?? 'Evaluation applies Kazarian-style two-step reasoning at consulting depth: regulatory criterion mapping followed by final-merits narrative readiness.',
  ]
}

export function buildDossierPdfEnrichment(
  state: AssessmentState,
  data: AttorneyDossierData,
): DossierPdfEnrichment {
  const report = data.report
  const profile = extractProfileSignals(state.uploads)
  const field = primaryFieldForDeliverables(profile.domains, profile.fullText)

  const paperQty = roadmapBuildQty(report.roadmapTable, 'br-pub', 'Publication')
  const patentQty = roadmapBuildQty(report.roadmapTable, 'br-patent', 'Patent')
  const productQty = roadmapBuildQty(report.roadmapTable, 'br-product', 'Product')

  const roadmapJustifications: Record<string, string[]> = {}
  for (const row of report.roadmapTable) {
    roadmapJustifications[row.id] = roadmapJustificationForRow(row, state, field)
  }

  const consultingAreas: EnrichedConsultingArea[] = report.roadmapTable.map((row) => ({
    area: row.area,
    areaOutline: row.areaOutline,
    consultingResponsibility: row.consultingResponsibility,
    justifications: roadmapJustifications[row.id] ?? [],
    recommendations: consultingRecommendationsForArea(row, state, profile, field),
  }))

  const enrichment: DossierPdfEnrichment = {
    parsingStages: buildParsingPhaseStages(state, data.structuredProfileSummary, profile),
    readinessLegalPreamble: buildReadinessLegalPreamble(report, data.pathways),
    evaluationLogicLegal: report.evaluationLogic,
    roadmapJustifications,
    consultingAreas,
    positioningParagraph: buildPositioningParagraph(state, report, profile),
    paperItems: enrichPaperItems(profile, paperQty),
    patentItems: enrichPatentItems(profile, patentQty),
    productItems: enrichProductItems(profile, productQty),
    supplementaryBlocks: buildSupplementaryBlocks(profile, report.roadmapTable),
    executionPlan: buildExecutionPlan(state, report, data, profile, field),
    finalConclusion: '',
  }

  enrichment.finalConclusion = buildScientificFinalConclusion(report)
  return enrichment
}

export function structuredProfileTableRows(sp: StructuredResumeProfile | null): string[][] {
  if (!sp) return [['Status', 'Awaiting structured extraction — upload resume PDF or DOCX']]
  return [
    ['Candidate', sp.candidateName],
    ['Extraction quality', sp.extractionQuality],
    ['Sections detected', String(sp.sectionsDetected)],
    ['Work experience entries', String(sp.workExperience.length)],
    ['Education entries', String(sp.education.length)],
    ['Publications (indexed)', String(sp.publications.length)],
    ['Patents (indexed)', String(sp.patents.length)],
    ['Skills', String(sp.skills.length)],
  ]
}
