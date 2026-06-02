import type { ActionDeliverableSpec } from './action-deliverable-spec'
import { buildDeliverableSpec } from './action-deliverable-spec'
import {
  buildHeuristicPersonalizedPayload,
  ensureRoadmapRowOutlines,
} from './benchmark-report/personalized-heuristic'
import { extractProfileSignals } from './benchmark-report/extract-profile'
import {
  buildQuantifiedRoadmaps,
  extractProfileMetricCounts,
  type QuantifiedCategoryRoadmap,
} from './quantified-roadmap'
import { ROADMAP_METRICS, type RoadmapMetricKey } from '../data/roadmap-benchmarks'
import type {
  AssessmentState,
  DocumentRecommendation,
  RoadmapAction,
  VisaCategory,
} from '../types/assessment'
import type { BenchmarkPriority, BenchmarkRoadmapRow } from '../types/benchmark-report'

export type EvidenceBuildGroup =
  | 'publications'
  | 'patents'
  | 'products'
  | 'whitepapers'
  | 'media'
  | 'speaking'
  | 'judging'
  | 'recognition'
  | 'case_studies'
  | 'documentation'
  | 'visibility'
  | 'counsel_review'

export interface EvidenceBuildPlanItem {
  id: string
  areaId: string
  group: EvidenceBuildGroup
  title: string
  outline: string
  quantityToBuild: number
  currentScore: number
  targetScore: number
  priority: 'critical' | 'high' | 'medium' | 'low'
  status: 'build' | 'met' | 'strengthen'
  consultingDeliverable: string
  estimatedImpactPercent: number
  visaCategory: VisaCategory
  linkedMetrics: string[]
  deliverableSpec?: ActionDeliverableSpec
  profileAnchor?: string
  roadmapActionId?: string
}

const AREA_GROUP: Record<string, EvidenceBuildGroup> = {
  'br-pub': 'publications',
  'br-patent': 'patents',
  'br-product': 'products',
  'br-whitepaper': 'whitepapers',
  'br-articles': 'media',
  'br-speaking': 'speaking',
  'br-judging': 'judging',
  'br-expert': 'recognition',
  'br-case': 'case_studies',
  'br-proddoc': 'documentation',
  'br-visibility': 'visibility',
  'br-attorney': 'counsel_review',
}

const AREA_METRICS: Record<string, RoadmapMetricKey[]> = {
  'br-pub': ['sci', 'scopus'],
  'br-patent': ['patent'],
  'br-product': ['product'],
  'br-whitepaper': ['bookChapter'],
  'br-articles': [],
  'br-speaking': ['conference', 'guestLecture'],
  'br-judging': [],
  'br-expert': [],
  'br-case': [],
  'br-proddoc': ['product'],
  'br-visibility': ['sci', 'scopus'],
  'br-attorney': [],
}

const GROUP_LABELS: Record<EvidenceBuildGroup, string> = {
  publications: 'Scholarly & technical publications',
  patents: 'Patents & intellectual property',
  products: 'Products & technical artifacts',
  whitepapers: 'Technical white papers',
  media: 'Published material about the candidate',
  speaking: 'Conference, speaking & guest lectures',
  judging: 'Judging, peer review & panels',
  recognition: 'Awards & expert recognition assets',
  case_studies: 'Technical case studies',
  documentation: 'Product documentation & validation',
  visibility: 'Citations & professional visibility',
  counsel_review: 'Counsel review package',
}

function priorityToRec(p: BenchmarkPriority): 'critical' | 'high' | 'medium' {
  if (p === 'Critical') return 'critical'
  if (p === 'High') return 'high'
  return 'medium'
}

function impactFromRow(row: BenchmarkRoadmapRow): number {
  return Math.min(24, Math.max(4, Math.round((row.targetScore - row.currentScore) / 4)))
}

function findRoadmapAction(
  actions: RoadmapAction[],
  areaId: string,
): RoadmapAction | undefined {
  return actions.find((a) => {
    const id = a.id.replace(/^plan-/, '').replace(/^rm-/, '').split('-metric')[0]
    if (id === areaId || id === areaId.replace('br-', '')) return true
    const area = (a.evidenceArea ?? a.title).toLowerCase()
    if (areaId === 'br-pub' && /publication|paper|journal/i.test(area)) return true
    if (areaId === 'br-patent' && /patent/i.test(area)) return true
    if (areaId === 'br-product' && /product|artifact|platform/i.test(area)) return true
    if (areaId === 'br-whitepaper' && /white\s*paper/i.test(area)) return true
    if (areaId === 'br-articles' && /media|article|press/i.test(area)) return true
    if (areaId === 'br-speaking' && /speak|conference|lecture/i.test(area)) return true
    if (areaId === 'br-judging' && /judg|review|panel/i.test(area)) return true
    return false
  })
}

export function getRoadmapTableForPlan(state: AssessmentState): BenchmarkRoadmapRow[] {
  const table =
    state.benchmarkReport?.roadmapTable ??
    buildHeuristicPersonalizedPayload(state).roadmapTable
  return ensureRoadmapRowOutlines(table)
}

export function buildEvidenceBuildPlan(state: AssessmentState): {
  items: EvidenceBuildPlanItem[]
  roadmaps: QuantifiedCategoryRoadmap[]
  totalToBuild: number
  totalImpact: number
  groupLabels: typeof GROUP_LABELS
} {
  const visaCategory = state.selectedCategories[0] ?? 'EB1A'
  const profile = extractProfileSignals(state.uploads)
  const table = getRoadmapTableForPlan(state)
  const counts = state.quantifiedRoadmap?.current ?? extractProfileMetricCounts(state)
  const roadmaps = buildQuantifiedRoadmaps(state.selectedCategories, counts)

  const metricLabel = (key: RoadmapMetricKey) =>
    ROADMAP_METRICS.find((m) => m.key === key)?.label ?? key

  const items: EvidenceBuildPlanItem[] = table.map((row) => {
    const group = AREA_GROUP[row.id] ?? 'publications'
    const linked = (AREA_METRICS[row.id] ?? []).map(metricLabel)
    const action = findRoadmapAction(state.roadmap, row.id)
    const qty = row.quantityToBuild
    const status: EvidenceBuildPlanItem['status'] =
      qty <= 0 ? (row.currentScore >= row.targetScore ? 'met' : 'strengthen') : 'build'

    let deliverableSpec = action?.deliverableSpec
    if (!deliverableSpec?.outline && !deliverableSpec?.suggestedTitles?.length) {
      deliverableSpec = buildDeliverableSpec(row.id, profile, Math.max(qty, 1)) ?? deliverableSpec
    }

    return {
      id: `ebp-${row.id}`,
      areaId: row.id,
      group,
      title: row.area,
      outline: row.areaOutline,
      quantityToBuild: Math.max(0, qty),
      currentScore: row.currentScore,
      targetScore: row.targetScore,
      priority: priorityToRec(row.priority),
      status,
      consultingDeliverable: row.consultingResponsibility,
      estimatedImpactPercent: qty > 0 ? impactFromRow(row) : Math.max(2, Math.round(impactFromRow(row) / 2)),
      visaCategory,
      linkedMetrics: linked,
      deliverableSpec,
      profileAnchor: action?.profileAnchor,
      roadmapActionId: action?.id,
    }
  })

  const totalToBuild = items.reduce((s, i) => s + i.quantityToBuild, 0)
  const totalImpact = items.reduce((s, i) => s + i.estimatedImpactPercent, 0)

  return { items, roadmaps, totalToBuild, totalImpact, groupLabels: GROUP_LABELS }
}

/** Full recommendations list across all evidence fields (papers, patents, products, …). */
export function buildComprehensiveRecommendations(state: AssessmentState): DocumentRecommendation[] {
  const plan = buildEvidenceBuildPlan(state)
  const recs: DocumentRecommendation[] = []

  for (const item of plan.items) {
    if (item.status === 'met' && item.quantityToBuild === 0) continue

    const qtyLabel =
      item.quantityToBuild > 0
        ? `Build ${item.quantityToBuild} × `
        : 'Strengthen '

    recs.push({
      id: `rec-${item.areaId}`,
      category: item.visaCategory,
      documentType: `${qtyLabel}${item.title.split('/')[0].trim()}`,
      purpose: item.consultingDeliverable,
      priority: item.priority === 'low' ? 'medium' : item.priority,
      estimatedImpactPercent: item.estimatedImpactPercent,
      quantifiedBenefit:
        item.linkedMetrics.length > 0
          ? `Targets: ${item.linkedMetrics.join(', ')} · ${item.currentScore}→${item.targetScore}/100`
          : `Evidence index ${item.currentScore}→${item.targetScore}/100`,
    })
  }

  if (recs.length === 0) {
    for (const item of plan.items.filter((i) => i.group !== 'counsel_review').slice(0, 8)) {
      recs.push({
        id: `rec-${item.areaId}`,
        category: item.visaCategory,
        documentType: item.title,
        purpose: item.consultingDeliverable,
        priority: 'high',
        estimatedImpactPercent: 8,
        quantifiedBenefit: item.outline,
      })
    }
  }

  return recs.slice(0, 14)
}

export function mergeRecommendationsWithBuildPlan(
  llmRecs: DocumentRecommendation[],
  state: AssessmentState,
): DocumentRecommendation[] {
  const comprehensive = buildComprehensiveRecommendations(state)
  if (llmRecs.length >= 8) {
    const keys = new Set(llmRecs.map((r) => r.documentType.toLowerCase().slice(0, 40)))
    const extra = comprehensive.filter(
      (r) => !keys.has(r.documentType.toLowerCase().slice(0, 40)),
    )
    return [...llmRecs, ...extra].slice(0, 14)
  }
  return comprehensive
}
