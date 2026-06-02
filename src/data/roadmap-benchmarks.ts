import type { VisaCategory } from '../types/assessment'

/** Quantified petition-readiness targets per visa category (RM benchmark table) */
export type RoadmapMetricKey =
  | 'sci'
  | 'scopus'
  | 'conference'
  | 'patent'
  | 'product'
  | 'bookChapter'
  | 'guestLecture'

export interface RoadmapMetricDef {
  key: RoadmapMetricKey
  label: string
  shortLabel: string
}

export const ROADMAP_METRICS: RoadmapMetricDef[] = [
  { key: 'sci', label: 'SCI', shortLabel: 'SCI' },
  { key: 'scopus', label: 'SCOPUS', shortLabel: 'SCOPUS' },
  { key: 'conference', label: 'CONFERENCE', shortLabel: 'CONF' },
  { key: 'patent', label: 'PATENT', shortLabel: 'PATENT' },
  { key: 'product', label: 'PRODUCT', shortLabel: 'PRODUCT' },
  { key: 'bookChapter', label: 'BOOK CHAPTER', shortLabel: 'BOOK' },
  { key: 'guestLecture', label: 'GUEST LECTURE', shortLabel: 'GUEST' },
]

export type RoadmapBenchmarkTargets = Record<RoadmapMetricKey, number>

/** Official RM target matrix — aligned to EB-1A / EB-1B / EB-1C readiness standards */
export const ROADMAP_BENCHMARKS: Record<VisaCategory, RoadmapBenchmarkTargets> = {
  EB1A: {
    sci: 8,
    scopus: 8,
    conference: 12,
    patent: 5,
    product: 3,
    bookChapter: 5,
    guestLecture: 5,
  },
  EB1B: {
    sci: 7,
    scopus: 7,
    conference: 11,
    patent: 4,
    product: 2,
    bookChapter: 4,
    guestLecture: 4,
  },
  EB1C: {
    sci: 6,
    scopus: 6,
    conference: 10,
    patent: 3,
    product: 1,
    bookChapter: 3,
    guestLecture: 3,
  },
}

export const VISA_CATEGORY_ROADMAP_LABELS: Record<
  VisaCategory,
  { title: string; icon: 'star' | 'ribbon' | 'medal' }
> = {
  EB1A: { title: 'EB-1A — Extraordinary Ability', icon: 'star' },
  EB1B: { title: 'EB-1B — Outstanding Researcher', icon: 'ribbon' },
  EB1C: { title: 'EB-1C — Multinational Manager', icon: 'medal' },
}
