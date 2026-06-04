import type { AssessmentState } from '../../types/assessment'
import type {
  BenchmarkBaseline,
  BenchmarkPriority,
  BenchmarkRoadmapRow,
} from '../../types/benchmark-report'
import { buildEvidenceBuildPlan } from '../evidence-build-plan'
import { formatFactInventoryForPrompt, buildProfileFactInventory } from '../scientific-assessment/profile-fact-inventory'
import {
  buildHeuristicPersonalizedPayload,
  type PersonalizedBenchmarkPayload,
} from './personalized-heuristic'
import { EB1A_ROADMAP_AREAS, ensureRoadmapRowOutlines } from './roadmap-areas'
import { computeScientificReadinessBaseline, projectReadinessAfterBuild } from './compute-readiness-baseline'
import { extractProfileSignals } from './extract-profile'
import {
  calibrateProjectedReadiness,
  calibrateReadinessScore,
  detectProfileArchetype,
} from '../reference-profile/profile-archetype'
import { positioningThemesAsStrings } from '../reference-profile/positioning-themes'

const MAX_SCORE_DELTA = 12

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(n)))
}

function normalizeArea(area: string): string {
  return area.toLowerCase().replace(/\s+/g, ' ').trim()
}

function findLlmRow(
  table: BenchmarkRoadmapRow[],
  canonicalArea: string,
): BenchmarkRoadmapRow | undefined {
  const key = normalizeArea(canonicalArea)
  return table.find(
    (r) =>
      normalizeArea(r.area) === key ||
      normalizeArea(r.area).includes(key.slice(0, 24)) ||
      key.includes(normalizeArea(r.area).slice(0, 24)),
  )
}

function mergeRoadmapRow(
  heuristic: BenchmarkRoadmapRow,
  llm: BenchmarkRoadmapRow | undefined,
): BenchmarkRoadmapRow {
  if (!llm) return heuristic

  const currentScore = clamp(
    heuristic.currentScore * 0.68 + llm.currentScore * 0.32,
    heuristic.currentScore - MAX_SCORE_DELTA,
    heuristic.currentScore + MAX_SCORE_DELTA,
  )

  const quantityToBuild =
    heuristic.quantityToBuild > 0
      ? heuristic.quantityToBuild
      : clamp(llm.quantityToBuild, 0, 8)

  const priorityOrder: Record<BenchmarkPriority, number> = {
    Critical: 0,
    High: 1,
    Medium: 2,
    Low: 3,
  }
  const priority =
    priorityOrder[heuristic.priority] <= priorityOrder[llm.priority]
      ? heuristic.priority
      : llm.priority

  const consulting =
    llm.consultingResponsibility.length > 60 &&
    !/template|example candidate|healthcare vaccine/i.test(llm.consultingResponsibility)
      ? llm.consultingResponsibility
      : heuristic.consultingResponsibility

  return {
    ...heuristic,
    currentScore,
    targetScore: clamp(Math.max(heuristic.targetScore, llm.targetScore), 55, 92),
    quantityToBuild: clamp(quantityToBuild, 0, 10),
    priority,
    areaOutline: llm.areaOutline?.trim() || heuristic.areaOutline,
    consultingResponsibility: consulting,
  }
}

function buildEvaluationLogic(
  state: AssessmentState,
  baseline: BenchmarkBaseline,
  llmLines: string[],
): string[] {
  const profile = extractProfileSignals(state.uploads)
  const inventory = buildProfileFactInventory(profile, state.structuredProfile)
  const factSnippet = inventory.verifiedFacts.slice(0, 3).map((f) => f.fact).join('; ')

  const core = [
    `Readiness ${baseline.readinessScore}/100 derived from ${state.criterionResults.length} criterion evaluations and reproducible 8 CFR rubric scores — not resume marketing text alone.`,
    `Primary field: ${profile.domains.join(', ') || 'from structured profile'}. Verified signals: ${factSnippet || 'see structured extraction'}.`,
    `Consulting must build new assets across publications, patents, products, white papers, media, speaking, and judging — uploads profile the candidate only.`,
    `Submission-ready status: ${baseline.attorneyReadyStatus}. ${state.gaps.length} documented gap(s); ${state.roadmap.length} prioritized build action(s) in assessment.`,
  ]

  const merged = [...core]
  for (const line of llmLines) {
    if (line.length > 40 && !merged.some((m) => m.slice(0, 50) === line.slice(0, 50))) {
      merged.push(line)
    }
  }
  return merged.slice(0, 5)
}

/**
 * Merge LLM benchmark JSON with rule-based heuristic — guarantees 12 areas and profile-grounded scores.
 */
export function reconcileBenchmarkPayload(
  state: AssessmentState,
  llm: PersonalizedBenchmarkPayload | null | undefined,
): PersonalizedBenchmarkPayload {
  const heuristic = buildHeuristicPersonalizedPayload(state)
  const scientificBaseline = computeScientificReadinessBaseline(state)

  if (!llm) {
    return {
      ...heuristic,
      baseline: {
        ...heuristic.baseline,
        readinessScore: scientificBaseline.readinessScore,
        evidenceStrength: scientificBaseline.evidenceStrength,
        attorneyReadyStatus: scientificBaseline.attorneyReadyStatus,
        primaryGap: scientificBaseline.primaryGap,
        consultingRequirement: scientificBaseline.consultingRequirement,
      },
    }
  }

  const heuristicByArea = new Map(heuristic.roadmapTable.map((r) => [normalizeArea(r.area), r]))
  const roadmapTable = EB1A_ROADMAP_AREAS.map((def) => {
    const h =
      heuristicByArea.get(normalizeArea(def.area)) ??
      heuristic.roadmapTable.find((r) => r.id === def.id)!
    const l = findLlmRow(llm.roadmapTable, def.area)
    return mergeRoadmapRow(
      { ...h, id: def.id, area: def.area },
      l ? { ...l, id: def.id, area: def.area } : undefined,
    )
  })

  const withOutlines = ensureRoadmapRowOutlines(roadmapTable)
  const attorneyRow = withOutlines.find((r) => r.id === 'br-attorney')
  if (attorneyRow) attorneyRow.quantityToBuild = 1

  const profile = extractProfileSignals(state.uploads)
  const totalAssets = withOutlines.reduce((s, r) => s + r.quantityToBuild, 0)
  const archetype = detectProfileArchetype(profile)
  const calibratedProjected = calibrateProjectedReadiness(archetype, totalAssets)
  const projections = projectReadinessAfterBuild(scientificBaseline, totalAssets)

  const buildPlan = buildEvidenceBuildPlan(state)
  const fromPlan = buildPlan.items
    .filter((i) => i.quantityToBuild > 0)
    .map((i) => `${i.quantityToBuild} × ${i.title.split('/')[0].trim()}`)
  const minimumBuildPackage =
    fromPlan.length > 0
      ? fromPlan
      : llm.minimumBuildPackage.length > 0
        ? llm.minimumBuildPackage
        : withOutlines.filter((r) => r.quantityToBuild > 0).map((r) => `${r.quantityToBuild} × ${r.area}`)

  const baseline = {
    readinessScore: calibrateReadinessScore(
      clamp(
        scientificBaseline.readinessScore * 0.7 + llm.baseline.readinessScore * 0.3,
        scientificBaseline.readinessScore - 8,
        scientificBaseline.readinessScore + 8,
      ),
      archetype,
    ),
    evidenceStrength: scientificBaseline.evidenceStrength,
    attorneyReadyStatus: scientificBaseline.attorneyReadyStatus,
    primaryGap: scientificBaseline.primaryGap,
    consultingRequirement: scientificBaseline.consultingRequirement,
    verificationOwner: 'Qualified immigration professional',
  }

  const profileThemes = positioningThemesAsStrings(profile)
  const themes =
    llm.positioningThemes.length > 0 &&
    !llm.positioningThemes.some((t) => /healthcare vaccine|template/i.test(t))
      ? llm.positioningThemes
      : profileThemes.length > 0
        ? profileThemes
        : profile.domains.slice(0, 4)

  return {
    baseline,
    roadmapTable: withOutlines,
    minimumBuildPackage:
      minimumBuildPackage.length > 0
        ? minimumBuildPackage
        : withOutlines.filter((r) => r.quantityToBuild > 0).map((r) => `${r.quantityToBuild} × ${r.area}`),
    evaluationLogic: buildEvaluationLogic(state, baseline, llm.evaluationLogic),
    conclusionSummary:
      llm.conclusionSummary.length > 80
        ? llm.conclusionSummary
        : `${profile.candidateName}: readiness ${baseline.readinessScore}/100 with ${totalAssets} build assets across ${withOutlines.filter((r) => r.quantityToBuild > 0).length} evidence areas — customized to ${profile.domains[0] ?? 'profile'}.`,
    projectedReadinessMin: Math.max(projections.min, calibratedProjected.min),
    projectedReadinessMax: Math.max(projections.max, calibratedProjected.max),
    projectedAttorneyMin: projections.attorneyMin,
    projectedAttorneyMax: projections.attorneyMax,
    positioningThemes: themes,
    sections: llm.sections,
    timeline: llm.timeline,
    personalizationSource: 'llm',
    llmModel: llm.llmModel,
  }
}

export function buildBenchmarkFactContext(state: AssessmentState): string {
  const profile = extractProfileSignals(state.uploads)
  const inventory = buildProfileFactInventory(profile, state.structuredProfile)
  return formatFactInventoryForPrompt(inventory)
}
