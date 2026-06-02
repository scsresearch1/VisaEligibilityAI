import { VISA_CRITERIA } from '../../data/visa-criteria'
import type { AssessmentState, EvidenceStrength, VisaCategory } from '../../types/assessment'
import type {
  BenchmarkBaseline,
  BenchmarkPriority,
  BenchmarkRoadmapRow,
  BenchmarkReport,
  BenchmarkSection,
  BenchmarkTimelinePhase,
} from '../../types/benchmark-report'
import type { ExtractedProfileSignals } from './extract-profile'
import { extractProfileSignals, formatProfileKeySignals } from './extract-profile'

const STRENGTH_SCORE: Record<EvidenceStrength, number> = {
  strong: 88,
  moderate: 58,
  weak: 38,
  attorney_review: 52,
  unsupported: 22,
  missing: 8,
}

interface AreaDef {
  id: string
  area: string
  criterionIds: string[]
  targetScore: number
  defaultPriority: BenchmarkPriority
}

const EB1A_AREAS: AreaDef[] = [
  {
    id: 'br-pub',
    area: 'Scholarly / Technical Publications',
    criterionIds: ['eb1a-6'],
    targetScore: 75,
    defaultPriority: 'High',
  },
  {
    id: 'br-patent',
    area: 'Patent / IP Evidence',
    criterionIds: ['eb1a-5'],
    targetScore: 70,
    defaultPriority: 'Critical',
  },
  {
    id: 'br-product',
    area: 'Product / Technical Artifact',
    criterionIds: ['eb1a-5'],
    targetScore: 80,
    defaultPriority: 'Critical',
  },
  {
    id: 'br-whitepaper',
    area: 'Technical White Papers',
    criterionIds: ['eb1a-5', 'eb1a-6'],
    targetScore: 75,
    defaultPriority: 'High',
  },
  {
    id: 'br-articles',
    area: 'Industry Articles / Published Material About Candidate',
    criterionIds: ['eb1a-3'],
    targetScore: 65,
    defaultPriority: 'High',
  },
  {
    id: 'br-speaking',
    area: 'Conference / Speaking Evidence',
    criterionIds: ['eb1a-7', 'eb1a-8'],
    targetScore: 65,
    defaultPriority: 'High',
  },
  {
    id: 'br-judging',
    area: 'Judging / Reviewing Evidence',
    criterionIds: ['eb1a-4'],
    targetScore: 60,
    defaultPriority: 'Medium',
  },
  {
    id: 'br-expert',
    area: 'Expert Profile / Recognition Assets',
    criterionIds: ['eb1a-1', 'eb1a-11'],
    targetScore: 75,
    defaultPriority: 'Critical',
  },
  {
    id: 'br-case',
    area: 'Case-Study Style Technical Narratives',
    criterionIds: ['eb1a-5', 'eb1a-8'],
    targetScore: 75,
    defaultPriority: 'High',
  },
  {
    id: 'br-proddoc',
    area: 'Product Documentation and Validation Reports',
    criterionIds: ['eb1a-5'],
    targetScore: 75,
    defaultPriority: 'Critical',
  },
  {
    id: 'br-visibility',
    area: 'Citation / Visibility Development',
    criterionIds: ['eb1a-6', 'eb1a-3'],
    targetScore: 55,
    defaultPriority: 'Medium',
  },
  {
    id: 'br-attorney',
    area: 'Professional Review Package',
    criterionIds: [],
    targetScore: 85,
    defaultPriority: 'Critical',
  },
]

const AREA_OUTLINE: Record<string, string> = {
  'br-pub': 'Peer-reviewed or indexed technical publications',
  'br-patent': 'Patent concepts, filings, or IP documentation',
  'br-product': 'Demonstrable prototypes or technical artifacts',
  'br-whitepaper': 'Structured white papers and technical frameworks',
  'br-articles': 'Third-party articles featuring the candidate',
  'br-speaking': 'Speaking, webinars, and conference evidence',
  'br-judging': 'Peer review, panels, and judging documentation',
  'br-expert': 'Expert profile and recognition assets',
  'br-case': 'Sanitized technical case studies',
  'br-proddoc': 'Product validation and architecture documentation',
  'br-visibility': 'Citations, indexing, and professional visibility',
  'br-attorney': 'Consolidated professional review dossier and claim map',
}

function outlineForArea(def: AreaDef): string {
  return AREA_OUTLINE[def.id] ?? `Evidence build: ${def.area}`
}

export function ensureRoadmapRowOutlines(rows: BenchmarkRoadmapRow[]): BenchmarkRoadmapRow[] {
  return rows.map((r) => ({
    ...r,
    areaOutline: r.areaOutline?.trim() || AREA_OUTLINE[r.id] || `Evidence build: ${r.area}`,
  }))
}

function isCounselReviewArea(area: string): boolean {
  return /counsel review|attorney-review/i.test(area)
}

function scoreForCriteria(state: AssessmentState, criterionIds: string[]): number {
  if (criterionIds.length === 0) return 42
  const items = state.evidenceItems.filter((e) => criterionIds.includes(e.criterionId))
  if (items.length === 0) return 12
  const avg =
    items.reduce((s, e) => s + STRENGTH_SCORE[e.strength], 0) / items.length
  return Math.round(avg)
}

function quantityFromGap(current: number, target: number, profile: ExtractedProfileSignals, areaId: string): number {
  if (areaId === 'br-attorney') return 1
  const deficit = target - current
  if (deficit <= 8) return 0
  let qty = Math.ceil(deficit / 18)
  if (areaId === 'br-pub' && profile.hasPublication) qty = Math.max(1, qty - 1)
  if (areaId === 'br-patent' && profile.hasPatent) qty = Math.max(1, qty - 1)
  if (areaId === 'br-product' && profile.hasProductClaim) qty = Math.max(1, qty - 1)
  return Math.min(8, Math.max(1, qty))
}

function priorityForRow(
  def: AreaDef,
  current: number,
  qty: number,
  state: AssessmentState,
): BenchmarkPriority {
  if (qty === 0) return 'Low'
  const relatedGaps = (state.gaps ?? []).filter(
    (g) => g.criterionId && def.criterionIds.includes(g.criterionId),
  )
  if (relatedGaps.some((g) => g.severity === 'critical')) return 'Critical'
  if (current < 25 && qty >= 3) return 'Critical'
  if (relatedGaps.some((g) => g.severity === 'high')) return 'High'
  return def.defaultPriority
}

function responsibilityForArea(
  def: AreaDef,
  profile: ExtractedProfileSignals,
  qty: number,
): string {
  const domainHint =
    profile.domains.length > 0
      ? profile.domains.slice(0, 3).join(', ')
      : 'the candidate\'s primary technical field'
  const claimHint =
    profile.keyClaims.length > 0
      ? ` Ground in verified profile signals: ${profile.keyClaims[0].slice(0, 120)}.`
      : ''

  const templates: Record<string, string> = {
    'br-pub': `Build ${qty} domain-aligned scholarly or technical publication(s) in ${domainHint} with verifiable authorship and indexing.`,
    'br-patent': `Prepare ${qty} patent concept(s) or filings tied to the candidate's documented technical contributions.${claimHint}`,
    'br-product': `Deliver ${qty} demonstrable prototype(s) or technical artifacts that external reviewers can evaluate.`,
    'br-whitepaper': `Author ${qty} structured white paper(s) converting career expertise in ${domainHint} into citable frameworks.`,
    'br-articles': `Secure ${qty} third-party or industry articles featuring the candidate's technical perspective.`,
    'br-speaking': `Schedule ${qty} speaking, webinar, or guest-lecture activities with documented agendas and attendance proof.`,
    'br-judging': `Document ${qty} legitimate peer-review, panel, or hackathon judging activities with certificates.`,
    'br-expert': `Create ${qty} expert-positioning assets (bio, portfolio, authority page, media kit, evidence index).`,
    'br-case': `Produce ${qty} sanitized technical case studies from enterprise projects in ${domainHint}.`,
    'br-proddoc': `Compile ${qty} validation reports, architecture notes, and user-facing documentation for built tools.`,
    'br-visibility': `Execute ${qty} visibility actions (repository indexing, citations, professional syndication).`,
    'br-attorney':
      'Consolidate all built assets into one counsel-review dossier with claim-safety mapping.',
  }
  return templates[def.id] ?? `Build ${qty} evidence asset(s) for ${def.area}.`
}

export interface PersonalizedBenchmarkPayload {
  baseline: BenchmarkBaseline
  roadmapTable: BenchmarkRoadmapRow[]
  minimumBuildPackage: string[]
  evaluationLogic: string[]
  conclusionSummary: string
  projectedReadinessMin: number
  projectedReadinessMax: number
  projectedAttorneyMin: number
  projectedAttorneyMax: number
  positioningThemes: string[]
  sections?: BenchmarkSection[]
  timeline?: BenchmarkTimelinePhase[]
  personalizationSource: 'llm' | 'heuristic'
  llmModel?: string
}

export function computeProfileAwareRoadmapTable(
  state: AssessmentState,
  profile: ExtractedProfileSignals,
): BenchmarkRoadmapRow[] {
  const areas = EB1A_AREAS

  return areas.map((def) => {
    let current = scoreForCriteria(state, def.criterionIds)
    if (def.id === 'br-pub' && profile.hasPublication) current = Math.max(current, 32)
    if (def.id === 'br-patent' && profile.hasPatent) current = Math.max(current, 28)
    if (def.id === 'br-product' && profile.hasProductClaim) current = Math.max(current, 30)
    if (def.id === 'br-articles') current = Math.min(current, profile.keyClaims.length > 2 ? 18 : 8)
    if (def.id === 'br-judging') current = Math.min(current, 12)
    if (def.id === 'br-attorney') {
      current = Math.min(70, Math.max(35, Math.round(state.criterionResults.length * 3.5)))
    }

    const target = def.targetScore
    const quantityToBuild = quantityFromGap(current, target, profile, def.id)
    const priority = priorityForRow(def, current, quantityToBuild, state)

    return {
      id: def.id,
      area: def.area,
      areaOutline: outlineForArea(def),
      currentScore: Math.min(99, current),
      targetScore: target,
      quantityToBuild,
      priority,
      consultingResponsibility: responsibilityForArea(def, profile, Math.max(quantityToBuild, 1)),
    }
  })
}

export function buildHeuristicPersonalizedPayload(
  state: AssessmentState,
  profile?: ExtractedProfileSignals,
): PersonalizedBenchmarkPayload {
  const p = profile ?? extractProfileSignals(state.uploads)
  const roadmapTable = computeProfileAwareRoadmapTable(state, p)
  const totalAssets = roadmapTable.reduce((s, r) => s + r.quantityToBuild, 0)

  const criterionPct =
    state.criterionResults.length > 0
      ? state.criterionResults.filter((c) => c.status === 'satisfied' || c.status === 'partial')
          .length / state.criterionResults.length
      : 0.3
  const readiness = Math.min(
    72,
    Math.max(
      38,
      Math.round(
        roadmapTable.reduce((s, r) => s + r.currentScore, 0) / roadmapTable.length +
          criterionPct * 8 +
          p.keyClaims.length * 1.5,
      ),
    ),
  )

  const pathways = state.selectedCategories.join(', ') || 'EB1A'
  const domainSummary =
    p.domains.length > 0 ? p.domains.join(', ') : 'the candidate\'s documented professional field'

  const minimumBuildPackage = roadmapTable
    .filter((r) => r.quantityToBuild > 0 && !isCounselReviewArea(r.area))
    .map((r) => `${r.quantityToBuild} × ${r.area}`)

  if (roadmapTable.find((r) => r.id === 'br-attorney')?.quantityToBuild) {
    minimumBuildPackage.push('1 counsel-review dossier')
  }

  const projectedMin = Math.min(95, readiness + Math.round(totalAssets * 0.45))
  const projectedMax = Math.min(98, projectedMin + 6)

  return {
    baseline: {
      readinessScore: readiness,
      evidenceStrength: readiness >= 65 ? 'Strong' : readiness >= 48 ? 'Moderate' : 'Weak',
      attorneyReadyStatus: readiness >= 78 ? 'Partial' : 'Not Ready',
      primaryGap:
        (state.gaps ?? []).find((g) => g.severity === 'critical')?.title ??
        'Insufficient externally verifiable evidence density',
      consultingRequirement: `Produce ${totalAssets} new evidence assets (papers, patents, products, etc.) — not collect existing documents — aligned to ${pathways}`,
      verificationOwner: 'Qualified immigration professional',
    },
    roadmapTable,
    minimumBuildPackage,
    evaluationLogic: [
      `This roadmap quantifies what the consulting team must build for ${p.candidateName} (${pathways}). Uploads profile the candidate only; petition-grade papers, patents, and products must be newly produced and matched to their field.`,
      `Professional substance appears in ${domainSummary}. Key signals: ${formatProfileKeySignals(p, p.keyClaims)}.`,
      `Quantities to build vary by area based on current scores (${roadmapTable.map((r) => `${r.area.split('/')[0].trim()}: ${r.currentScore}`).join('; ')}).`,
      'Final eligibility requires independent professional review under applicable USCIS extraordinary-ability standards.',
    ],
    conclusionSummary: `${p.candidateName}'s petition readiness is estimated at ${readiness}/100 with ${totalAssets} build actions across ${roadmapTable.filter((r) => r.quantityToBuild > 0).length} roadmap areas — customized to this profile and criteria selection.`,
    projectedReadinessMin: projectedMin,
    projectedReadinessMax: projectedMax,
    projectedAttorneyMin: Math.max(70, projectedMin - 4),
    projectedAttorneyMax: Math.max(75, projectedMax - 3),
    positioningThemes:
      p.domains.length > 0
        ? p.domains.slice(0, 4)
        : ['Technical leadership', 'Original contribution', 'Field expertise'],
    personalizationSource: 'heuristic',
  }
}

export function getPreviewBenchmarkFromState(state: AssessmentState): Pick<
  BenchmarkReport,
  'roadmapTable' | 'totalAssetsToBuild' | 'baseline'
> {
  const payload = buildHeuristicPersonalizedPayload(state)
  return {
    roadmapTable: payload.roadmapTable,
    totalAssetsToBuild: payload.roadmapTable.reduce((s, r) => s + r.quantityToBuild, 0),
    baseline: payload.baseline,
  }
}

export function criterionLabelsForCategories(categories: VisaCategory[]): string {
  const criteria = VISA_CRITERIA.filter((c) => categories.includes(c.category))
  return criteria.map((c) => `${c.code} ${c.title}`).join('; ')
}
