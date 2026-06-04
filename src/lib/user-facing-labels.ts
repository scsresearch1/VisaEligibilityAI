import type { BenchmarkReport } from '../types/benchmark-report'
import type { ProfileInsightRow } from '../types/assessment'

const HIDDEN_TERMS: [RegExp, string][] = [
  [/\bRM USA Works\b/gi, 'pathway eligibility standards'],
  [/\bRM\b/gi, ''],
  [/\bCounsel verification required\b/gi, ''],
  [/\bcounsel verification\b/gi, 'professional review'],
  [/\bCounsel review\b/gi, 'Professional review'],
  [/\bCounsel Review\b/gi, 'Professional review'],
  [/\battorney-review\b/gi, 'professional review'],
  [/\bAttorney-Review\b/gi, 'Professional review'],
  [/\bAttorney-Ready\b/gi, 'Submission-ready'],
  [/\bImmigration attorney\b/gi, 'Qualified immigration professional'],
  [/\battorney\b/gi, 'professional'],
  [/\bcounsel\b/gi, 'professional'],
  [/\bLLM\b/gi, 'profile intelligence'],
  [/\bAPI key\b/gi, 'configuration'],
  [/\bVEAI-[A-Z0-9-]+\b/g, ''],
  [/\s{2,}/g, ' '],
]

/** Neutral labels for UI — no internal org names, legal-role jargon, or document IDs. */
export function displayRoadmapArea(area: string): string {
  return sanitizeUserFacingText(
    area
      .replace(/Attorney-Review Package/gi, 'Professional review package')
      .replace(/Counsel Review Package/gi, 'Professional review package'),
  ).trim()
}

export function displaySubmissionReadyStatus(
  status: 'Ready' | 'Not Ready' | 'Partial' | string | undefined,
): string {
  if (!status) return 'Pending'
  if (status === 'Ready') return 'Ready for submission review'
  if (status === 'Partial') return 'Partially ready'
  return 'Not yet ready'
}

export function displayPersonalizationNote(report: BenchmarkReport): string {
  if (report.personalizationSource === 'llm') {
    return 'Personalized from your uploaded profile'
  }
  return 'Quantified from profile rules'
}

/** Single neutral footnote for reports — never show raw sourceNote in UI. */
export function displayReportFootnote(_report?: BenchmarkReport): string {
  return 'Quantified from this profile and selected pathway criteria. Independent professional review recommended before filing.'
}

export function displayVerificationOwner(owner?: string): string {
  return sanitizeUserFacingText(owner ?? 'Qualified immigration professional') || 'Qualified reviewer'
}

export function sanitizeProfileInsightRow(row: ProfileInsightRow): ProfileInsightRow {
  return {
    ...row,
    categoryOfficialName: sanitizeUserFacingText(row.categoryOfficialName),
    actionableItems: row.actionableItems.map(sanitizeUserFacingText),
    rmTeamRecommendedServices: row.rmTeamRecommendedServices.map(sanitizeUserFacingText),
    sourceStrategicBasis: sanitizeUserFacingText(row.sourceStrategicBasis),
  }
}

export function sanitizeUserFacingText(text: string): string {
  let out = text
  for (const [pattern, replacement] of HIDDEN_TERMS) {
    out = out.replace(pattern, replacement)
  }
  return out.replace(/\s+([.,;])/g, '$1').replace(/^\s*[,;]\s*/g, '').trim()
}
