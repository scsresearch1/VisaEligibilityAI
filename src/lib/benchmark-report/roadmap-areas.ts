import type { BenchmarkPriority, BenchmarkRoadmapRow } from '../../types/benchmark-report'

export interface RoadmapAreaDef {
  id: string
  area: string
  criterionIds: string[]
  targetScore: number
  defaultPriority: BenchmarkPriority
}

export const EB1A_ROADMAP_AREAS: RoadmapAreaDef[] = [
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

export function outlineForArea(def: RoadmapAreaDef): string {
  return AREA_OUTLINE[def.id] ?? `Evidence build: ${def.area}`
}

export function ensureRoadmapRowOutlines(rows: BenchmarkRoadmapRow[]): BenchmarkRoadmapRow[] {
  return rows.map((r) => ({
    ...r,
    areaOutline: r.areaOutline?.trim() || AREA_OUTLINE[r.id] || `Evidence build: ${r.area}`,
  }))
}
