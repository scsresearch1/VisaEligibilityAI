import type { VisaCategory } from '../../types/assessment'

/** Reference dossier archetypes (RM USA Works profiles 1–3). */
export type ProfileArchetype =
  | 'academic_teaching'
  | 'research_phd'
  | 'industry_senior'
  | 'mixed_professional'

export type PathwayReadinessStatus = 'Build required' | 'Conditional' | 'Not ready' | 'Long-term build'

export interface PathwayBaselineRow {
  pathway: VisaCategory
  readinessScore: number
  status: PathwayReadinessStatus
  finding: string
}

export interface PathwayRecommendation {
  primary: VisaCategory
  secondary?: VisaCategory
  notRecommended?: VisaCategory[]
  rows: PathwayBaselineRow[]
  filingStatus: 'Not ready' | 'Conditional' | 'Do not file now'
  buildFocus: string
}

export type ClaimRiskSeverity = 'Critical' | 'High' | 'Medium' | 'Low'

export interface ScannedClaimRisk {
  claim: string
  severity: ClaimRiskSeverity
  recommendation: string
  category: 'superlative' | 'financial' | 'contribution' | 'recognition' | 'role' | 'general'
}

export interface ResumeSectionTaxonomy {
  sectionsDetected: number
  workExperienceEntries: number
  educationEntries: number
  publicationEntries: number
  patentEntries: number
  productOrProjectEntries: number
  certificationEntries: number
  awardEntries: number
  conferenceOrWorkshopEntries: number
  parsedAchievements: number
  skillsDetected: number
  leadershipSignals: number
  managerialSignals: number
  researchSignals: number
  employersAndClients: string[]
  sectionHeadings: string[]
  inferredDomain: string
}

export interface ArchetypeCalibration {
  archetype: ProfileArchetype
  readinessBand: { min: number; max: number }
  projectedBand: { min: number; max: number }
  targetTotalAssets: number
  label: string
}
