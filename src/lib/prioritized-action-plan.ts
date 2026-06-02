import type { AssessmentState, RoadmapAction, VisaCategory } from '../types/assessment'
import type { BenchmarkPriority, BenchmarkRoadmapRow } from '../types/benchmark-report'
import { extractProfileSignals } from './benchmark-report/extract-profile'
import { pickSubstantiveProfileAnchor, primaryFieldForDeliverables } from './profile-field-inference'
import { buildHeuristicPersonalizedPayload, ensureRoadmapRowOutlines } from './benchmark-report/personalized-heuristic'
import { displayRoadmapArea } from './user-facing-labels'
import { buildDeliverableSpec, type ActionDeliverableSpec } from './action-deliverable-spec'
import {
  buildMetricGapActions,
  buildQuantifiedRoadmaps,
  extractProfileMetricCounts,
} from './quantified-roadmap'

const PRIORITY_RANK: Record<BenchmarkPriority, number> = {
  Critical: 0,
  High: 1,
  Medium: 2,
  Low: 3,
}

function isCounselReviewArea(area: string): boolean {
  return /counsel review|attorney-review|professional review package/i.test(area)
}

function timeframeFor(priority: BenchmarkPriority): string {
  if (priority === 'Critical') return '6–10 weeks'
  if (priority === 'High') return '8–12 weeks'
  if (priority === 'Medium') return '10–14 weeks'
  return '12–16 weeks'
}

function readinessGain(current: number, target: number, priority: BenchmarkPriority): number {
  const base = Math.min(18, Math.max(4, Math.round((target - current) / 4)))
  if (priority === 'Critical') return Math.min(18, base + 2)
  if (priority === 'High') return base
  return Math.max(3, base - 2)
}

function pickProfileAnchor(
  profile: ReturnType<typeof extractProfileSignals>,
  areaId: string,
): string | undefined {
  const areaHints: Record<string, RegExp> = {
    'br-pub': /publish|paper|journal|research|author|ph\.?\s*d/i,
    'br-patent': /patent|invent|ip|filing/i,
    'br-product': /product|platform|built|launch|renewable|prototype/i,
    'br-speaking': /speak|conference|lecture|present|seminar|workshop/i,
    'br-judging': /judge|review|panel|committee|examiner/i,
    'br-articles': /media|article|press|featured|faculty/i,
    'br-expert': /lead|director|principal|professor|h\.?o\.?d/i,
    'br-case': /project|client|enterprise|case|student/i,
  }
  return pickSubstantiveProfileAnchor(profile, areaHints[areaId])
}

function buildTitle(
  row: BenchmarkRoadmapRow,
  profile: ReturnType<typeof extractProfileSignals>,
): string {
  const domain = primaryFieldForDeliverables(profile.domains, profile.fullText)
  const qty = row.quantityToBuild
  const outline = row.areaOutline || row.area
  const areaShort = displayRoadmapArea(row.area).split('/')[0]?.trim() ?? row.area

  if (qty === 1) {
    return `${outline} — ${domain} (${areaShort})`
  }
  return `Build ${qty}× ${outline.toLowerCase()} — ${domain}`
}

function actionFromRoadmapRow(
  row: BenchmarkRoadmapRow,
  profile: ReturnType<typeof extractProfileSignals>,
  visaCategory: VisaCategory,
  priorityIndex: number,
): RoadmapAction {
  const areaLabel = displayRoadmapArea(row.area)
  const deliverableSpec = buildDeliverableSpec(row.id, profile, row.quantityToBuild)
  return {
    id: `plan-${row.id}`,
    priority: priorityIndex,
    title: buildTitle(row, profile),
    domain:
      deliverableSpec?.domain ??
      (profile.domains.slice(0, 2).join(' · ') || 'Professional practice'),
    evidenceArea: areaLabel,
    deliverableOutline: row.areaOutline,
    deliverableSpec,
    profileAnchor: pickProfileAnchor(profile, row.id),
    quantityToBuild: row.quantityToBuild,
    description: row.consultingResponsibility,
    timeframe: timeframeFor(row.priority),
    expectedReadinessGain: readinessGain(row.currentScore, row.targetScore, row.priority),
    category: 'add',
    visaCategory,
  }
}

function actionFromMetricGap(
  profile: ReturnType<typeof extractProfileSignals>,
  item: ReturnType<typeof buildMetricGapActions>[0],
  priorityIndex: number,
): RoadmapAction {
  const domain = primaryFieldForDeliverables(profile.domains, profile.fullText)
  return {
    id: `plan-metric-${item.metric}-${item.visaCategory}`,
    priority: priorityIndex,
    title: `Quantified gap: ${item.gap}× ${item.metric} for ${item.visaCategory}`,
    domain,
    evidenceArea: item.metric,
    deliverableOutline: `Raise ${item.metric} from current levels toward pathway benchmark`,
    profileAnchor: pickSubstantiveProfileAnchor(profile),
    description: item.description,
    timeframe: '4–8 weeks',
    expectedReadinessGain: Math.min(14, Math.max(4, item.gap * 2)),
    category: 'add',
    metricKey: item.metric,
    metricGap: item.gap,
    visaCategory: item.visaCategory,
  }
}

function mergeLlmEnrichment(
  base: RoadmapAction[],
  llmActions: RoadmapAction[] | undefined,
): RoadmapAction[] {
  if (!llmActions?.length) return base

  const used = new Set<number>()
  const enriched = base.map((action) => {
    const matchIdx = llmActions.findIndex(
      (l, i) =>
        !used.has(i) &&
        (l.evidenceArea?.toLowerCase() === action.evidenceArea?.toLowerCase() ||
          l.title.toLowerCase().includes((action.evidenceArea ?? '').slice(0, 12).toLowerCase())),
    )
    if (matchIdx === -1) return action
    used.add(matchIdx)
    const l = llmActions[matchIdx]
    const llmAnchor = l.profileAnchor?.trim()
    return {
      ...action,
      title: l.title?.trim() || action.title,
      domain: action.domain,
      deliverableOutline: l.deliverableOutline?.trim() || action.deliverableOutline,
      deliverableSpec: action.deliverableSpec,
      description: l.description?.trim() || action.description,
      profileAnchor:
        llmAnchor && !/^Metric:\s*\d+%?\s*$/i.test(llmAnchor) ? llmAnchor : action.profileAnchor,
      timeframe: l.timeframe?.trim() || action.timeframe,
      expectedReadinessGain: l.expectedReadinessGain ?? action.expectedReadinessGain,
      category: l.category ?? action.category,
    }
  })

  const extras = llmActions
    .filter((_, i) => !used.has(i))
    .slice(0, 3)
    .map((l, i) => ({
      ...l,
      id: l.id || `plan-llm-extra-${i}`,
      priority: enriched.length + i + 1,
    }))

  return [...enriched, ...extras].map((a, i) => ({ ...a, priority: i + 1 }))
}

/** Profile- and benchmark-aware prioritized plan (optionally enriched by LLM). */
export function buildPrioritizedActionPlan(
  state: AssessmentState,
  llmActions?: RoadmapAction[],
): RoadmapAction[] {
  const profile = extractProfileSignals(state.uploads)
  const visaCategory = state.selectedCategories[0] ?? 'EB1A'

  const table = ensureRoadmapRowOutlines(
    state.benchmarkReport?.roadmapTable ??
      buildHeuristicPersonalizedPayload(state, profile).roadmapTable,
  )

  const roadmapRows = table
    .filter((r) => r.quantityToBuild > 0 && !isCounselReviewArea(r.area))
    .sort(
      (a, b) =>
        PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] ||
        b.quantityToBuild - a.quantityToBuild ||
        a.currentScore - b.currentScore,
    )

  const fromBenchmark = roadmapRows.map((row, i) =>
    actionFromRoadmapRow(row, profile, visaCategory, i + 1),
  )

  const counts = state.quantifiedRoadmap?.current ?? extractProfileMetricCounts(state)
  const roadmaps = buildQuantifiedRoadmaps(state.selectedCategories, counts)
  const metricGaps = buildMetricGapActions(roadmaps)
    .filter((m) => m.gap > 0)
    .slice(0, 3)

  const fromMetrics = metricGaps.map((m, i) =>
    actionFromMetricGap(profile, m, fromBenchmark.length + i + 1),
  )

  const combined = [...fromBenchmark, ...fromMetrics].slice(0, 12)
  const merged = mergeLlmEnrichment(combined, llmActions)
  return merged.map((action) => ensureDeliverableSpec(action, profile))
}

const METRIC_TO_AREA: Record<string, string> = {
  sci: 'br-pub',
  scopus: 'br-pub',
  conference: 'br-speaking',
  patent: 'br-patent',
  product: 'br-product',
  bookChapter: 'br-whitepaper',
  guestLecture: 'br-speaking',
}

function inferAreaRowId(action: RoadmapAction): string | undefined {
  const fromId = action.id.replace(/^plan-/, '').replace(/^rm-/, '').split('-metric')[0]
  if (fromId.startsWith('br-')) return fromId
  if (action.metricKey && METRIC_TO_AREA[action.metricKey]) return METRIC_TO_AREA[action.metricKey]
  const area = (action.evidenceArea ?? '').toLowerCase()
  if (/publication|paper|journal|sci|scopus/i.test(area)) return 'br-pub'
  if (/patent/i.test(area)) return 'br-patent'
  if (/product|platform/i.test(area)) return 'br-product'
  if (/speak|lecture|conference/i.test(area)) return 'br-speaking'
  if (/media|article|press/i.test(area)) return 'br-articles'
  if (/judg|review|panel/i.test(area)) return 'br-judging'
  if (/white\s*paper/i.test(area)) return 'br-whitepaper'
  if (/case/i.test(area)) return 'br-case'
  return fromId ? `br-${fromId}` : undefined
}

function ensureDeliverableSpec(
  action: RoadmapAction,
  profile: ReturnType<typeof extractProfileSignals>,
): RoadmapAction {
  if (action.deliverableSpec?.outline || action.deliverableSpec?.suggestedTitles?.length) {
    return action
  }
  const rowId = inferAreaRowId(action)
  if (!rowId) return action
  const spec = buildDeliverableSpec(rowId, profile, action.quantityToBuild ?? action.metricGap ?? 1)
  if (!spec) return action
  return {
    ...action,
    deliverableSpec: mergeDeliverableSpecs(spec, action.deliverableSpec),
    domain: action.domain ?? spec.domain,
  }
}

function mergeDeliverableSpecs(
  base: ActionDeliverableSpec,
  llm?: ActionDeliverableSpec,
): ActionDeliverableSpec {
  if (!llm) return base
  return {
    kind: llm.kind ?? base.kind,
    domain: llm.domain?.trim() || base.domain,
    suggestedTitles:
      llm.suggestedTitles?.length ? llm.suggestedTitles : base.suggestedTitles,
    outline: llm.outline?.trim() || base.outline,
  }
}
