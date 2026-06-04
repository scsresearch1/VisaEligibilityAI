import type { UploadedFile } from '../../types/assessment'
import {
  inferProfessionalDomains,
  formatProfileKeySignals,
  resolveProfileDomains,
  primaryFieldForDeliverables,
  pickSubstantiveProfileAnchor,
  isWeakProfileAnchor,
} from '../profile-field-inference'

export {
  formatProfileKeySignals,
  inferProfessionalDomains,
  resolveProfileDomains,
  primaryFieldForDeliverables,
  pickSubstantiveProfileAnchor,
  isWeakProfileAnchor,
}
import { deepExtractResume, type StructuredResumeProfile } from '../resume-deep-extract'
import { scanClaimRisks } from '../reference-profile/claim-risk-scanner'

export type RiskyPhraseHit = { phrase: string; context: string }

export type ExtractedProfileSignals = StructuredResumeProfile & {
  fullText: string
  domains: string[]
  keyClaims: string[]
  riskyPhrases: RiskyPhraseHit[]
  hasPublication: boolean
  hasPatent: boolean
  hasProductClaim: boolean
  hasAward: boolean
  hasLeadership: boolean
}

function extractRiskyPhrases(text: string): RiskyPhraseHit[] {
  const stub = {
    fullText: text,
    keyClaims: [],
    publications: [],
    patents: [],
    workExperience: [],
    education: [],
    domains: [],
    keyMetrics: [],
    awards: [],
    certifications: [],
    projects: [],
    skills: [],
    riskyPhrases: [],
    hasPublication: false,
    hasPatent: false,
    hasProductClaim: false,
    hasAward: false,
    hasLeadership: false,
    candidateName: '',
    nameMeta: { value: '', source: 'default' as const, confidence: 'low' as const },
    contact: {},
    parsedSections: [],
    sectionBlocks: [],
    extractionQuality: 'minimal' as const,
    sectionsDetected: 0,
  }
  return scanClaimRisks(stub as ExtractedProfileSignals).map((r) => ({
    phrase: r.claim.slice(0, 80),
    context: r.claim,
  }))
}

function buildKeyClaims(structured: StructuredResumeProfile): string[] {
  const claims: string[] = []

  for (const job of structured.workExperience) {
    for (const h of job.highlights.slice(0, 2)) {
      claims.push(`${job.title} @ ${job.company}: ${h}`)
    }
    if (job.highlights.length === 0 && job.title) {
      claims.push(`${job.title} at ${job.company}${job.period ? ` (${job.period})` : ''}`)
    }
  }

  structured.publications.slice(0, 3).forEach((p) => claims.push(`Publication: ${p}`))
  structured.patents.slice(0, 2).forEach((p) => claims.push(`Patent/IP: ${p}`))
  structured.awards.slice(0, 3).forEach((a) => claims.push(`Award: ${a}`))
  for (const m of structured.keyMetrics.slice(0, 6)) {
    if (/^\d+%$/.test(m.trim())) continue
    if (/^\d+\+?\s*years?$/i.test(m.trim())) {
      if (structured.workExperience.some((w) => /teach|professor|lecturer|faculty/i.test(w.title))) {
        claims.push(`${m} of engineering teaching and academic experience`)
      }
      continue
    }
    if (m.length > 8) claims.push(m)
  }

  if (claims.length === 0 && structured.professionalSummary) {
    claims.push(structured.professionalSummary.slice(0, 280))
  }

  return claims.slice(0, 12)
}

export function extractCandidateName(uploads: UploadedFile[]): string {
  return deepExtractResume(uploads).candidateName
}

export function extractCandidateNameMeta(uploads: UploadedFile[]) {
  return deepExtractResume(uploads).nameMeta
}

export function extractProfileSignals(uploads: UploadedFile[]): ExtractedProfileSignals {
  const structured = deepExtractResume(uploads)
  const fullText = uploads.map((u) => `--- ${u.name} ---\n${u.textSnippet ?? ''}`).join('\n\n')
  const lower = fullText.toLowerCase()

  const domains = resolveProfileDomains(structured, fullText)

  const keyClaims = buildKeyClaims(structured)
  const riskyPhrases = extractRiskyPhrases(fullText)

  return {
    ...structured,
    fullText,
    domains,
    keyClaims,
    riskyPhrases,
    hasPublication: structured.publications.length > 0 || /\b(publication|journal|paper)\b/i.test(lower),
    hasPatent: structured.patents.length > 0 || /\bpatent/i.test(lower),
    hasProductClaim:
      /\b(product|prototype|platform|launched|shipped)\b/i.test(lower) ||
      structured.workExperience.some((w) => /product|platform/i.test(w.title)),
    hasAward: structured.awards.length > 0 || /\b(award|honor|fellow)\b/i.test(lower),
    hasLeadership:
      structured.workExperience.some((w) => /lead|manager|director|head|chief|vp/i.test(w.title)) ||
      /\b(led|managed|director)\b/i.test(lower),
  }
}

export function primaryFieldLabel(domains: string[], fullText = ''): string {
  if (domains.length === 0) return 'the candidate\'s field'
  const first = primaryFieldForDeliverables(domains, fullText)
  const second = domains.find((d) => d !== first && !/Healthcare|Operations & Supply/i.test(d))
  return second ? `${first} and ${second}` : first
}
