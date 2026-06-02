export type VisaCategory = 'EB1A' | 'EB1B' | 'EB1C'

export type EvidenceStrength =
  | 'strong'
  | 'moderate'
  | 'weak'
  | 'unsupported'
  | 'missing'
  | 'attorney_review'

export type CriterionStatus =
  | 'satisfied'
  | 'partial'
  | 'unsupported'
  | 'missing'

export type DocumentCategory =
  | 'resume'
  | 'linkedin'
  | 'experience_letter'
  | 'recommendation'
  | 'publication'
  | 'patent'
  | 'award'
  | 'salary_proof'
  | 'company_doc'
  | 'other'

export interface UploadedFile {
  id: string
  name: string
  category: DocumentCategory
  size: number
  uploadedAt: string
  detectedInProfile: boolean
  textSnippet?: string
}

/** RM / strategy table row generated per profile (LLM or fallback) */
export interface ProfileInsightRow {
  id: string
  categoryOfficialName: string
  actionableItems: string[]
  rmTeamRecommendedServices: string[]
  sourceStrategicBasis: string
  visaCategory?: VisaCategory
}

export type LlmProviderUsed = 'gemini' | 'groq' | 'fallback' | 'none'

export interface LlmRunMeta {
  provider: LlmProviderUsed
  model?: string
  generatedAt: string
  error?: string
  /** Must match AssessmentState.profileRevision or outputs are treated stale. */
  profileRevision?: number
}

export interface VisaCriterion {
  id: string
  category: VisaCategory
  code: string
  title: string
  description: string
}

export interface ParsedAchievement {
  id: string
  type: string
  summary: string
  domain?: string
  confidence: number
}

export interface EvidenceItem {
  id: string
  criterionId: string
  documentId?: string
  label: string
  strength: EvidenceStrength
  notes: string
}

export interface CriterionResult {
  criterionId: string
  status: CriterionStatus
  strength: EvidenceStrength
  evidenceIds: string[]
  summary: string
}

export interface GapItem {
  id: string
  category: VisaCategory
  criterionId?: string
  severity: 'critical' | 'high' | 'medium'
  title: string
  description: string
  impactScore: number
}

export interface DocumentRecommendation {
  id: string
  category: VisaCategory
  documentType: string
  purpose: string
  priority: 'critical' | 'high' | 'medium'
  estimatedImpactPercent: number
  quantifiedBenefit: string
}

export interface RiskFlag {
  id: string
  claim: string
  riskType: 'exaggerated' | 'unsupported' | 'legally_sensitive' | 'weak'
  severity: 'high' | 'medium' | 'low'
  recommendation: string
}

export interface ProfileMetricCounts {
  sci: number
  scopus: number
  conference: number
  patent: number
  product: number
  bookChapter: number
  guestLecture: number
}

export interface RoadmapAction {
  id: string
  priority: number
  title: string
  description: string
  timeframe: string
  expectedReadinessGain: number
  category: 'add' | 'improve' | 'document' | 'validate'
  /** Primary field / industry domain from profile analysis */
  domain?: string
  /** EB-1 evidence area or metric label */
  evidenceArea?: string
  /** One-line deliverable summary */
  deliverableOutline?: string
  /** Resume or profile signal this action is grounded in */
  profileAnchor?: string
  quantityToBuild?: number
  /** Linked quantified metric when generated from benchmark gap */
  metricKey?: string
  metricGap?: number
  visaCategory?: VisaCategory
  /** Papers: suggested titles; patents/products: 2–3 line outlines */
  deliverableSpec?: import('../lib/action-deliverable-spec').ActionDeliverableSpec
}

export interface QuantifiedRoadmapSnapshot {
  current: ProfileMetricCounts
  computedAt: string
}

import type { BenchmarkReport } from './benchmark-report'
import type { StructuredResumeProfile } from '../lib/resume-deep-extract'

export type { StructuredResumeProfile }

export interface AssessmentState {
  uploads: UploadedFile[]
  selectedCategories: VisaCategory[]
  analysisComplete: boolean
  reportGenerated: boolean
  parsedAchievements: ParsedAchievement[]
  evidenceItems: EvidenceItem[]
  criterionResults: CriterionResult[]
  gaps: GapItem[]
  recommendations: DocumentRecommendation[]
  riskFlags: RiskFlag[]
  techDomains: string[]
  roadmap: RoadmapAction[]
  quantifiedRoadmap: QuantifiedRoadmapSnapshot | null
  profileInsights: ProfileInsightRow[]
  llmMeta: LlmRunMeta | null
  analysisMeta: LlmRunMeta | null
  structuredProfile: StructuredResumeProfile | null
  /** User-corrected display name (overrides extraction) */
  candidateNameOverride: string | null
  benchmarkReport: BenchmarkReport | null
  /** Incremented when uploads or pathways change — invalidates cached LLM outputs. */
  profileRevision: number
}
