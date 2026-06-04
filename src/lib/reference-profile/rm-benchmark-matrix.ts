import {
  ROADMAP_BENCHMARKS,
  ROADMAP_METRICS,
  type RoadmapMetricKey,
} from '../../data/roadmap-benchmarks'
import type { AssessmentState, ProfileMetricCounts, VisaCategory } from '../../types/assessment'
import { extractProfileMetricCounts, type MetricGapCell } from '../quantified-roadmap'
import { detectProfileArchetype } from './profile-archetype'

export interface RmBenchmarkMatrixRow {
  metric: string
  current: number
  rmTarget: number
  gap: number
  status: 'Target met' | 'Build required'
  pathway: VisaCategory
}

function archetypeAdjustedCurrent(
  counts: ProfileMetricCounts,
  archetype: ReturnType<typeof detectProfileArchetype>,
): ProfileMetricCounts {
  const c = { ...counts }
  if (archetype === 'academic_teaching') {
    c.sci = Math.min(c.sci, 3)
    c.scopus = Math.min(c.scopus, 3)
    c.patent = Math.min(c.patent, 0)
  }
  if (archetype === 'research_phd') {
    c.sci = Math.max(c.sci, Math.min(6, counts.sci))
    c.patent = Math.max(c.patent, Math.min(5, counts.patent))
  }
  if (archetype === 'industry_senior') {
    c.product = Math.max(c.product, 1)
    c.patent = Math.min(c.patent, 1)
    c.sci = Math.min(c.sci, 2)
  }
  return c
}

export function buildRmBenchmarkMatrix(
  state: Pick<AssessmentState, 'uploads' | 'parsedAchievements' | 'structuredProfile' | 'quantifiedRoadmap' | 'selectedCategories'>,
  profile?: import('../benchmark-report/extract-profile').ExtractedProfileSignals,
): RmBenchmarkMatrixRow[] {
  const archetype = profile ? detectProfileArchetype(profile) : 'mixed_professional'

  const raw = state.quantifiedRoadmap?.current ?? extractProfileMetricCounts(state)
  const counts = archetypeAdjustedCurrent(raw, archetype)
  const categories = state.selectedCategories.length
    ? state.selectedCategories
    : (['EB1A'] as VisaCategory[])

  const rows: RmBenchmarkMatrixRow[] = []

  for (const cat of categories) {
    const targets = ROADMAP_BENCHMARKS[cat]
    for (const def of ROADMAP_METRICS) {
      const current = counts[def.key as RoadmapMetricKey]
      const rmTarget = targets[def.key as RoadmapMetricKey]
      const gap = Math.max(0, rmTarget - current)
      rows.push({
        metric: def.label,
        current,
        rmTarget,
        gap,
        status: gap === 0 ? 'Target met' : 'Build required',
        pathway: cat,
      })
    }
  }

  return rows
}

/** Enhance metric gap cells with archetype-realistic currents (not demo inflation). */
export function buildArchetypeAwareMetricCounts(
  state: AssessmentState,
  profile: import('../benchmark-report/extract-profile').ExtractedProfileSignals,
): ProfileMetricCounts {
  const counts = extractProfileMetricCounts(state)
  return archetypeAdjustedCurrent(counts, detectProfileArchetype(profile))
}

export function rmMatrixToMetricCells(rows: RmBenchmarkMatrixRow[]): MetricGapCell[] {
  return rows.map((r) => ({
    key: ROADMAP_METRICS.find((m) => m.label === r.metric)?.key ?? 'sci',
    label: r.metric,
    current: r.current,
    target: r.rmTarget,
    gap: r.gap,
    met: r.status === 'Target met',
    percentOfTarget: r.rmTarget > 0 ? Math.round((r.current / r.rmTarget) * 100) : 0,
  }))
}
