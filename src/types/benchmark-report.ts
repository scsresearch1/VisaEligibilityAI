import type { VisaCategory } from './assessment'

export type BenchmarkPriority = 'Critical' | 'High' | 'Medium' | 'Low'

export interface BenchmarkBaseline {
  readinessScore: number
  evidenceStrength: 'Strong' | 'Moderate' | 'Weak'
  attorneyReadyStatus: 'Ready' | 'Not Ready' | 'Partial'
  primaryGap: string
  consultingRequirement: string
  verificationOwner: string
}

export interface BenchmarkRoadmapRow {
  id: string
  area: string
  /** One-line deliverable title shown in dossier section I.4 */
  areaOutline: string
  currentScore: number
  targetScore: number
  quantityToBuild: number
  priority: BenchmarkPriority
  consultingResponsibility: string
}

export interface BenchmarkDetailedItem {
  title: string
  purpose?: string
  eb1aContribution?: string
  technicalBasis?: string
  coreModules?: string[]
  expectedOutput?: string
  theme?: string
}

export interface BenchmarkSection {
  id: string
  number: number
  title: string
  intro?: string
  items?: BenchmarkDetailedItem[]
  bullets?: string[]
  table?: { label: string; current: string; build: string; target: string }[]
}

export interface BenchmarkTimelinePhase {
  phase: string
  duration: string
  outputs: string[]
}

export interface BenchmarkConclusion {
  summary: string
  currentReadiness: number
  projectedReadinessMin: number
  projectedReadinessMax: number
  projectedAttorneyMin: number
  projectedAttorneyMax: number
  totalAssets: number
  executionOwner: string
  verificationOwner: string
  positioningThemes: string[]
}

export interface BenchmarkReport {
  id: string
  generatedAt: string
  candidateName: string
  visaCategory: VisaCategory
  reportTitle: string
  evaluationLogic: string[]
  baseline: BenchmarkBaseline
  roadmapTable: BenchmarkRoadmapRow[]
  minimumBuildPackage: string[]
  totalAssetsToBuild: number
  sections: BenchmarkSection[]
  timeline: BenchmarkTimelinePhase[]
  attorneyPackageItems: string[]
  attorneyPackageTotal: string
  conclusion: BenchmarkConclusion
  sourceNote: string
  personalizationSource?: 'llm' | 'heuristic'
  llmModel?: string
}
