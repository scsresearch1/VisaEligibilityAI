import {
  ROADMAP_BENCHMARKS,
  ROADMAP_METRICS,
  type RoadmapMetricKey,
} from '../data/roadmap-benchmarks'
import type { AssessmentState, ProfileMetricCounts, VisaCategory } from '../types/assessment'

export interface MetricGapCell {
  key: RoadmapMetricKey
  label: string
  current: number
  target: number
  gap: number
  met: boolean
  percentOfTarget: number
}

export interface QuantifiedCategoryRoadmap {
  visaCategory: VisaCategory
  metrics: MetricGapCell[]
  overallCompletionPercent: number
  totalGap: number
}

const EMPTY_COUNTS: ProfileMetricCounts = {
  sci: 0,
  scopus: 0,
  conference: 0,
  patent: 0,
  product: 0,
  bookChapter: 0,
  guestLecture: 0,
}

/** Infer counts from uploads + NLP achievements (extend with real parsing later) */
export function extractProfileMetricCounts(state: Pick<
  AssessmentState,
  'uploads' | 'parsedAchievements'
>): ProfileMetricCounts {
  const counts = { ...EMPTY_COUNTS }

  for (const upload of state.uploads) {
    switch (upload.category) {
      case 'publication':
        counts.sci += 1
        counts.scopus += 1
        break
      case 'patent':
        counts.patent += 1
        break
      case 'recommendation':
      case 'experience_letter':
        counts.conference += 1
        break
      case 'award':
        counts.guestLecture += 1
        break
      case 'company_doc':
        counts.product += 1
        break
      default:
        break
    }
    const text = (upload.textSnippet ?? upload.name).toLowerCase()
    if (/scopus|journal|paper|publication|cite/i.test(text)) {
      counts.scopus += 1
      counts.sci += 1
    }
    if (/conference|proceedings|keynote|symposium/i.test(text)) counts.conference += 1
    if (/patent|invention|uspto/i.test(text)) counts.patent += 1
    if (/product|launch|revenue|p&l|platform/i.test(text)) counts.product += 1
    if (/book chapter|textbook|isbn/i.test(text)) counts.bookChapter += 1
    if (/guest lecture|invited talk|seminar|lecture/i.test(text)) counts.guestLecture += 1
  }

  for (const a of state.parsedAchievements) {
    const t = `${a.type} ${a.summary}`.toLowerCase()
    if (/publication|research|citation|journal|paper/i.test(t)) {
      counts.sci += 2
      counts.scopus += 2
    }
    if (/conference|present|speaker/i.test(t)) counts.conference += 2
    if (/patent/i.test(t)) counts.patent += 1
    if (/product|executive|p&l|manager/i.test(t)) counts.product += 1
    if (/book|chapter|scholarly/i.test(t)) counts.bookChapter += 1
    if (/lecture|judging|review/i.test(t)) counts.guestLecture += 1
  }

  return capCounts(counts)
}

function capCounts(c: ProfileMetricCounts): ProfileMetricCounts {
  return {
    sci: Math.min(c.sci, 20),
    scopus: Math.min(c.scopus, 20),
    conference: Math.min(c.conference, 24),
    patent: Math.min(c.patent, 12),
    product: Math.min(c.product, 8),
    bookChapter: Math.min(c.bookChapter, 12),
    guestLecture: Math.min(c.guestLecture, 12),
  }
}

/** Demo-friendly counts when profile is sparse but analysis ran */
export function deriveDemoMetricCounts(
  uploadCount: number,
  categories: VisaCategory[],
): ProfileMetricCounts {
  const primary = categories[0] ?? 'EB1A'
  const targets = ROADMAP_BENCHMARKS[primary]
  const factor = Math.min(0.85, 0.45 + uploadCount * 0.08)

  return {
    sci: Math.max(1, Math.floor(targets.sci * factor)),
    scopus: Math.max(1, Math.floor(targets.scopus * factor)),
    conference: Math.max(1, Math.floor(targets.conference * factor)),
    patent: Math.max(0, Math.floor(targets.patent * factor * 0.9)),
    product: Math.max(0, Math.floor(targets.product * factor * 0.8)),
    bookChapter: Math.max(0, Math.floor(targets.bookChapter * factor * 0.85)),
    guestLecture: Math.max(0, Math.floor(targets.guestLecture * factor * 0.85)),
  }
}

export function buildQuantifiedRoadmaps(
  categories: VisaCategory[],
  current: ProfileMetricCounts,
): QuantifiedCategoryRoadmap[] {
  return categories.map((visaCategory) => {
    const targets = ROADMAP_BENCHMARKS[visaCategory]
    const metrics: MetricGapCell[] = ROADMAP_METRICS.map(({ key, label }) => {
      const target = targets[key]
      const cur = current[key]
      const gap = Math.max(0, target - cur)
      const percentOfTarget = target > 0 ? Math.min(100, Math.round((cur / target) * 100)) : 100
      return {
        key,
        label,
        current: cur,
        target,
        gap,
        met: cur >= target,
        percentOfTarget,
      }
    })

    const totalTarget = metrics.reduce((s, m) => s + m.target, 0)
    const totalCurrent = metrics.reduce((s, m) => s + Math.min(m.current, m.target), 0)
    const overallCompletionPercent =
      totalTarget > 0 ? Math.round((totalCurrent / totalTarget) * 100) : 0
    const totalGap = metrics.reduce((s, m) => s + m.gap, 0)

    return { visaCategory, metrics, overallCompletionPercent, totalGap }
  })
}

export function buildMetricGapActions(
  roadmaps: QuantifiedCategoryRoadmap[],
): { title: string; description: string; metric: string; gap: number; visaCategory: VisaCategory }[] {
  const actions: { title: string; description: string; metric: string; gap: number; visaCategory: VisaCategory }[] = []

  for (const rm of roadmaps) {
    for (const m of rm.metrics.filter((x) => x.gap > 0)) {
      actions.push({
        visaCategory: rm.visaCategory,
        metric: m.label,
        gap: m.gap,
        title: `Add ${m.gap} more ${m.label} artifact(s) for ${rm.visaCategory}`,
        description: `Current: ${m.current} · Target: ${m.target} · ${m.percentOfTarget}% of benchmark met.`,
      })
    }
  }

  return actions.sort((a, b) => b.gap - a.gap)
}
