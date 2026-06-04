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
import {
  calibrateProjectedReadiness,
  calibrateReadinessScore,
  detectProfileArchetype,
  getArchetypeCalibration,
  scaleBuildQuantitiesToTarget,
} from '../reference-profile/profile-archetype'
import { buildPathwayRecommendation } from '../reference-profile/pathway-recommendation'
import {
  computeInventoryRoadmapScores,
  mergeInventoryWithCriterionScore,
} from '../reference-profile/roadmap-inventory-scores'
import { positioningThemesAsStrings } from '../reference-profile/positioning-themes'
import { EB1A_ROADMAP_AREAS, outlineForArea, type RoadmapAreaDef } from './roadmap-areas'

export { EB1A_ROADMAP_AREAS, ensureRoadmapRowOutlines } from './roadmap-areas'

const STRENGTH_SCORE: Record<EvidenceStrength, number> = {
  strong: 88,
  moderate: 58,
  weak: 38,
  attorney_review: 52,
  unsupported: 22,
  missing: 8,
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
  def: RoadmapAreaDef,
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
  def: RoadmapAreaDef,
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
  const areas = EB1A_ROADMAP_AREAS
  const inventoryScores = computeInventoryRoadmapScores(state, profile)

  const rows = areas.map((def) => {
    const criterionScore = scoreForCriteria(state, def.criterionIds)
    let current = mergeInventoryWithCriterionScore(
      inventoryScores[def.id] ?? criterionScore,
      criterionScore,
    )
    if (def.id === 'br-attorney') {
      current = inventoryScores['br-attorney'] ?? current
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

  const archetype = detectProfileArchetype(profile)
  const scaledQty = scaleBuildQuantitiesToTarget(rows, archetype)
  return rows.map((r, i) => ({
    ...r,
    quantityToBuild: scaledQty[i],
    consultingResponsibility: responsibilityForArea(
      areas.find((a) => a.id === r.id)!,
      profile,
      Math.max(scaledQty[i], 1),
    ),
  }))
}

export function buildHeuristicPersonalizedPayload(
  state: AssessmentState,
  profile?: ExtractedProfileSignals,
): PersonalizedBenchmarkPayload {
  const p = profile ?? extractProfileSignals(state.uploads)
  const roadmapTable = computeProfileAwareRoadmapTable(state, p)
  const totalAssets = roadmapTable.reduce((s, r) => s + r.quantityToBuild, 0)

  const archetype = detectProfileArchetype(p)
  const calibration = getArchetypeCalibration(archetype)
  const pathway = buildPathwayRecommendation(p, state.selectedCategories)

  const criterionPct =
    state.criterionResults.length > 0
      ? state.criterionResults.filter((c) => c.status === 'satisfied' || c.status === 'partial')
          .length / state.criterionResults.length
      : 0.3
  const computedReadiness = Math.round(
    roadmapTable.reduce((s, r) => s + r.currentScore, 0) / roadmapTable.length +
      criterionPct * 8 +
      p.keyClaims.length * 1.5,
  )
  const readiness = calibrateReadinessScore(computedReadiness, archetype)

  const pathways = state.selectedCategories.join(', ') || 'EB1A'
  const domainSummary =
    p.domains.length > 0 ? p.domains.join(', ') : 'the candidate\'s documented professional field'

  const minimumBuildPackage = roadmapTable
    .filter((r) => r.quantityToBuild > 0 && !isCounselReviewArea(r.area))
    .map((r) => `${r.quantityToBuild} × ${r.area}`)

  if (roadmapTable.find((r) => r.id === 'br-attorney')?.quantityToBuild) {
    minimumBuildPackage.push('1 counsel-review dossier')
  }

  const projected = calibrateProjectedReadiness(archetype, totalAssets)

  const primaryPathRow = pathway.rows.find((r) => r.pathway === pathway.primary)
  const primaryGap =
    (state.gaps ?? []).find((g) => g.severity === 'critical')?.title ??
    primaryPathRow?.finding ??
    'Insufficient externally verifiable evidence density'

  return {
    baseline: {
      readinessScore: readiness,
      evidenceStrength: readiness >= 65 ? 'Strong' : readiness >= 48 ? 'Moderate' : 'Weak',
      attorneyReadyStatus: readiness >= 78 ? 'Partial' : 'Not Ready',
      primaryGap,
      consultingRequirement: `Produce ${totalAssets} new evidence assets (${calibration.label}) — ${pathway.buildFocus} — aligned to ${pathways}`,
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
    projectedReadinessMin: projected.min,
    projectedReadinessMax: projected.max,
    projectedAttorneyMin: Math.max(70, projected.min - 4),
    projectedAttorneyMax: Math.max(75, projected.max - 3),
    positioningThemes:
      positioningThemesAsStrings(p).length > 0
        ? positioningThemesAsStrings(p)
        : p.domains.length > 0
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
