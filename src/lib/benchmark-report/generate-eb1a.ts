import type { AssessmentState } from '../../types/assessment'
import type { BenchmarkReport, BenchmarkRoadmapRow } from '../../types/benchmark-report'
import { getDisplayCandidateName } from '../candidate-display'
import { extractProfileSignals } from './extract-profile'
import {
  buildDynamicDetailedSections,
  buildDynamicTimeline,
} from './dynamic-sections'
import { displayRoadmapArea } from '../user-facing-labels'
import {
  buildHeuristicPersonalizedPayload,
  ensureRoadmapRowOutlines,
  type PersonalizedBenchmarkPayload,
} from './personalized-heuristic'
import { buildPathwayRecommendation } from '../reference-profile/pathway-recommendation'
import {
  archetypeLabel,
  detectProfileArchetype,
} from '../reference-profile/profile-archetype'
import { buildPositioningThemeTable } from '../reference-profile/positioning-themes'

function isCounselReviewArea(area: string): boolean {
  return /counsel review|attorney-review/i.test(area)
}

function deriveAttorneyPackage(table: BenchmarkRoadmapRow[], total: number): {
  items: string[]
  totalLine: string
} {
  const items = [
    '1 EB-1 readiness report',
    '1 evidence-to-criterion mapping matrix',
    '1 profile-building roadmap',
  ]
  for (const row of table) {
    if (row.quantityToBuild > 0 && !isCounselReviewArea(row.area)) {
      items.push(`${row.quantityToBuild} × ${displayRoadmapArea(row.area)}`)
    }
  }
  if (table.some((r) => isCounselReviewArea(r.area) && r.quantityToBuild > 0)) {
    items.push('1 professional review dossier')
  }
  return {
    items,
    totalLine: `${total} total roadmap assets + 3 system reports`,
  }
}

export function generateEb1aBenchmarkReport(
  state: AssessmentState,
  personalization?: PersonalizedBenchmarkPayload,
): BenchmarkReport {
  const profile = extractProfileSignals(state.uploads)
  const candidateName = getDisplayCandidateName(state)
  const payload = personalization ?? buildHeuristicPersonalizedPayload(state, profile)

  const { baseline, minimumBuildPackage, evaluationLogic } = payload
  const roadmapTable = ensureRoadmapRowOutlines(payload.roadmapTable)
  const totalAssets = roadmapTable.reduce((s, r) => s + r.quantityToBuild, 0)
  const attorneyPkg = deriveAttorneyPackage(roadmapTable, totalAssets)

  const domainSummary =
    profile.domains.length > 0
      ? profile.domains.join(', ')
      : 'the candidate\'s documented professional field'

  const logic =
    evaluationLogic.length > 0
      ? evaluationLogic
      : [
          `Personalized quantification for ${profile.candidateName} in ${domainSummary}.`,
          'Quantified against official EB-1A extraordinary ability criteria for this profile.',
        ]

  const sourceNote =
    'Quantified from this candidate\'s profile and selected pathway criteria. Professional review recommended before filing.'

  const archetype = detectProfileArchetype(profile)
  const pathwayRec = buildPathwayRecommendation(profile, state.selectedCategories)
  const themeRows = buildPositioningThemeTable(profile)

  return {
    id: `benchmark-${Date.now()}`,
    generatedAt: new Date().toISOString(),
    candidateName,
    visaCategory: 'EB1A',
    reportTitle: `EB1A Profile-Building Roadmap for ${candidateName}`,
    evaluationLogic: logic,
    baseline,
    roadmapTable,
    minimumBuildPackage,
    totalAssetsToBuild: totalAssets,
    sections:
      personalization?.sections?.length
        ? personalization.sections
        : buildDynamicDetailedSections(profile, state, roadmapTable),
    timeline:
      personalization?.timeline?.length
        ? personalization.timeline
        : buildDynamicTimeline(profile, roadmapTable),
    attorneyPackageItems: attorneyPkg.items,
    attorneyPackageTotal: attorneyPkg.totalLine,
    conclusion: {
      summary: payload.conclusionSummary,
      currentReadiness: baseline.readinessScore,
      projectedReadinessMin: payload.projectedReadinessMin,
      projectedReadinessMax: payload.projectedReadinessMax,
      projectedAttorneyMin: payload.projectedAttorneyMin,
      projectedAttorneyMax: payload.projectedAttorneyMax,
      totalAssets,
      executionOwner: 'Consulting team',
      verificationOwner: 'Qualified immigration professional',
      positioningThemes:
        payload.positioningThemes.length > 0
          ? payload.positioningThemes
          : profile.domains.slice(0, 4),
      positioningThemeRows: themeRows,
      pathwayRecommendation: {
        primary: pathwayRec.primary,
        secondary: pathwayRec.secondary,
        notRecommended: pathwayRec.notRecommended,
        filingStatus: pathwayRec.filingStatus,
        buildFocus: pathwayRec.buildFocus,
        rows: pathwayRec.rows.map((r) => ({
          pathway: r.pathway,
          readinessScore: r.readinessScore,
          status: r.status,
          finding: r.finding,
        })),
      },
      profileArchetype: archetypeLabel(archetype),
    },
    sourceNote,
    personalizationSource: payload.personalizationSource,
    llmModel: payload.llmModel,
  }
}
