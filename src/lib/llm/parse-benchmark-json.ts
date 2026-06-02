import type {
  BenchmarkBaseline,
  BenchmarkPriority,
  BenchmarkRoadmapRow,
} from '../../types/benchmark-report'
import {
  EB1A_ROADMAP_AREAS,
  ensureRoadmapRowOutlines,
  type PersonalizedBenchmarkPayload,
} from '../benchmark-report/personalized-heuristic'

const PRIORITIES = new Set<BenchmarkPriority>(['Critical', 'High', 'Medium', 'Low'])
const STRENGTHS = new Set(['Strong', 'Moderate', 'Weak'])
const ATTORNEY = new Set(['Ready', 'Not Ready', 'Partial'])

const AREA_ORDER = [
  'Scholarly / Technical Publications',
  'Patent / IP Evidence',
  'Product / Technical Artifact',
  'Technical White Papers',
  'Industry Articles / Published Material About Candidate',
  'Conference / Speaking Evidence',
  'Judging / Reviewing Evidence',
  'Expert Profile / Recognition Assets',
  'Case-Study Style Technical Narratives',
  'Product Documentation and Validation Reports',
  'Citation / Visibility Development',
  'Counsel Review Package',
]

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(n)))
}

function normalizePriority(p: string): BenchmarkPriority {
  const cap = p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()
  if (PRIORITIES.has(cap as BenchmarkPriority)) return cap as BenchmarkPriority
  return 'Medium'
}

function matchArea(area: string): string {
  const found = AREA_ORDER.find(
    (a) => a.toLowerCase() === area.toLowerCase() || area.toLowerCase().includes(a.toLowerCase().slice(0, 20)),
  )
  return found ?? area
}

import { extractJsonObject, parseJsonLenient } from './parse-json-lenient'

export function parseBenchmarkJsonLenient(text: string): PersonalizedBenchmarkPayload | null {
  try {
    return parseBenchmarkJson(text)
  } catch {
    return null
  }
}

export function parseBenchmarkJson(text: string): PersonalizedBenchmarkPayload {
  const cleaned = extractJsonObject(text)

  const parsed = parseJsonLenient(cleaned, 'Benchmark') as {
    baseline?: Record<string, unknown>
    roadmapTable?: Record<string, unknown>[]
    minimumBuildPackage?: string[]
    evaluationLogic?: string[] | string
    conclusionSummary?: string
    projectedReadinessMin?: number
    projectedReadinessMax?: number
    projectedAttorneyMin?: number
    projectedAttorneyMax?: number
    positioningThemes?: string[]
  }

  const b = parsed.baseline ?? {}
  const readinessScore = clamp(Number(b.readinessScore) || 50, 0, 100)
  const evidenceStrength = STRENGTHS.has(String(b.evidenceStrength))
    ? (String(b.evidenceStrength) as BenchmarkBaseline['evidenceStrength'])
    : 'Moderate'
  const attorneyReadyStatus = ATTORNEY.has(String(b.attorneyReadyStatus))
    ? (String(b.attorneyReadyStatus) as BenchmarkBaseline['attorneyReadyStatus'])
    : 'Not Ready'

  const baseline: BenchmarkBaseline = {
    readinessScore,
    evidenceStrength,
    attorneyReadyStatus,
    primaryGap: String(b.primaryGap ?? 'Evidence gaps require profile-building'),
    consultingRequirement: String(b.consultingRequirement ?? 'Build pathway-specific evidence'),
    verificationOwner: 'Qualified immigration professional',
  }

  const rawRows = parsed.roadmapTable ?? []
  if (!Array.isArray(rawRows) || rawRows.length < 4) {
    throw new Error('LLM benchmark missing roadmapTable rows')
  }

  const byArea = new Map<string, BenchmarkRoadmapRow>()
  rawRows.forEach((row, i) => {
    const area = matchArea(String(row.area ?? AREA_ORDER[i] ?? 'Unknown'))
    const def = EB1A_ROADMAP_AREAS.find((d) => matchArea(d.area) === area)
    byArea.set(area, {
      id: def?.id ?? `br-llm-${i}`,
      area: def?.area ?? area,
      areaOutline: String(row.areaOutline ?? '').trim(),
      currentScore: clamp(Number(row.currentScore) || 0, 0, 100),
      targetScore: clamp(Number(row.targetScore) || 70, 50, 95),
      quantityToBuild: clamp(Number(row.quantityToBuild) || 0, 0, 10),
      priority: normalizePriority(String(row.priority ?? 'Medium')),
      consultingResponsibility: String(
        row.consultingResponsibility ?? `Build evidence for ${area}`,
      ),
    })
  })

  const roadmapTable: BenchmarkRoadmapRow[] = EB1A_ROADMAP_AREAS.map((def) => {
    const existing = byArea.get(matchArea(def.area))
    if (existing) return { ...existing, id: def.id, area: def.area }
    return {
      id: def.id,
      area: def.area,
      areaOutline: '',
      currentScore: 15,
      targetScore: def.targetScore,
      quantityToBuild: 2,
      priority: def.defaultPriority,
      consultingResponsibility: `Build customized evidence for ${def.area}.`,
    }
  })

  const counselRow = roadmapTable.find((r) => r.id === 'br-attorney')
  if (counselRow) counselRow.quantityToBuild = 1

  const roadmapWithOutlines = ensureRoadmapRowOutlines(roadmapTable)

  const evaluationLogic = Array.isArray(parsed.evaluationLogic)
    ? parsed.evaluationLogic.map(String)
    : String(parsed.evaluationLogic ?? '')
        .split(/\n+/)
        .filter(Boolean)

  const minimumBuildPackage =
    Array.isArray(parsed.minimumBuildPackage) && parsed.minimumBuildPackage.length > 0
      ? parsed.minimumBuildPackage.map(String)
      : roadmapWithOutlines
          .filter((r) => r.quantityToBuild > 0)
          .map((r) => `${r.quantityToBuild} × ${r.area}`)

  const projMin = clamp(Number(parsed.projectedReadinessMin) || readinessScore + 20, 0, 100)
  const projMax = clamp(
    Number(parsed.projectedReadinessMax) || projMin + 8,
    projMin,
    100,
  )

  return {
    baseline,
    roadmapTable: roadmapWithOutlines,
    minimumBuildPackage,
    evaluationLogic: evaluationLogic.length > 0 ? evaluationLogic : [parsed.conclusionSummary ?? ''],
    conclusionSummary: String(
      parsed.conclusionSummary ??
        `Customized roadmap for readiness ${readinessScore}/100.`,
    ),
    projectedReadinessMin: projMin,
    projectedReadinessMax: projMax,
    projectedAttorneyMin: clamp(Number(parsed.projectedAttorneyMin) || projMin - 5, 0, 100),
    projectedAttorneyMax: clamp(Number(parsed.projectedAttorneyMax) || projMax - 3, 0, 100),
    positioningThemes: Array.isArray(parsed.positioningThemes)
      ? parsed.positioningThemes.map(String).slice(0, 6)
      : [],
    personalizationSource: 'llm',
  }
}
