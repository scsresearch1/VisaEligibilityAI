import type { ExtractedProfileSignals } from '../benchmark-report/extract-profile'
import { scoreAllCriteria } from '../scientific-assessment/score-criterion'
import type { VisaCategory } from '../../types/assessment'
import { detectProfileArchetype } from './profile-archetype'
import type { PathwayBaselineRow, PathwayRecommendation } from './types'

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(n)))
}

function avgEb1aScore(profile: ExtractedProfileSignals): number {
  const scores = scoreAllCriteria(['EB1A'], profile)
  if (scores.length === 0) return 35
  return scores.reduce((s, r) => s + r.evidenceScore, 0) / scores.length
}

function eb1bScore(profile: ExtractedProfileSignals): number {
  const pub = profile.publications.length
  const hasPhd = profile.education.some((e) => /ph\.?\s*d/i.test(e.degree ?? ''))
  const teaching = profile.workExperience.some((w) =>
    /professor|researcher|scientist|pharma/i.test(w.title),
  )
  let score = 18
  if (hasPhd) score += 22
  if (pub >= 6) score += 28
  else if (pub >= 3) score += 14
  else if (pub >= 1) score += 6
  if (profile.patents.length >= 2) score += 12
  if (teaching) score += 10
  if (/citation|h-index|scopus|sci\b/i.test(profile.fullText)) score += 8
  return clamp(score, 12, 78)
}

function eb1cScore(profile: ExtractedProfileSignals): number {
  const mgr = profile.workExperience.filter((w) =>
    /director|vp|head|manager|integration director|program manager/i.test(w.title),
  ).length
  const multinational =
    /global|multinational|gdc|fortune|international|offshore/i.test(profile.fullText)
  let score = 14
  if (mgr >= 2) score += 22
  else if (mgr >= 1) score += 12
  if (multinational) score += 14
  if (profile.hasLeadership) score += 10
  if (/p&l|budget|\$[\d,.]+\s*m/i.test(profile.fullText)) score += 8
  return clamp(score, 10, 55)
}

function statusForEb1a(score: number): PathwayBaselineRow['status'] {
  if (score >= 68) return 'Conditional'
  return 'Build required'
}

function statusForEb1b(score: number, archetype: ReturnType<typeof detectProfileArchetype>): PathwayBaselineRow['status'] {
  if (score >= 58 && archetype === 'research_phd') return 'Conditional'
  if (score >= 45 && archetype === 'academic_teaching') return 'Long-term build'
  if (score >= 50) return 'Conditional'
  return 'Not ready'
}

function statusForEb1c(score: number): PathwayBaselineRow['status'] {
  if (score >= 42) return 'Conditional'
  return 'Not ready'
}

function findingEb1a(score: number, archetype: ReturnType<typeof detectProfileArchetype>): string {
  if (archetype === 'industry_senior') {
    return score >= 55
      ? 'Strong technical leadership and original-contribution potential; low external evidence density'
      : 'Moderate professional substance; build patents, papers, and third-party validation'
  }
  if (archetype === 'research_phd') {
    return 'Research substance present; convert to indexed publications, citations, and US-facing recognition'
  }
  if (archetype === 'academic_teaching') {
    return 'Teaching leadership signals; insufficient scholarly density for extraordinary ability without build'
  }
  return 'Profile requires structured external evidence portfolio before filing consideration'
}

function findingEb1b(score: number, archetype: ReturnType<typeof detectProfileArchetype>): string {
  if (archetype === 'research_phd' && score >= 55) {
    return 'Outstanding researcher pathway viable with sponsorship; strengthen indexing and citation trail'
  }
  if (archetype === 'academic_teaching') {
    return 'Teaching profile — EB-1B after multi-year publication and research appointment build'
  }
  return 'One or few publications insufficient; no strong research appointment or citation base'
}

function findingEb1c(score: number): string {
  if (score >= 40) {
    return 'Senior management signals exist; qualifying employer relationship and transfer evidence not established in upload'
  }
  return 'Managerial criteria weak — multinational executive transfer facts not documented'
}

export function buildPathwayRecommendation(
  profile: ExtractedProfileSignals,
  selectedCategories: VisaCategory[] = ['EB1A', 'EB1B', 'EB1C'],
): PathwayRecommendation {
  const archetype = detectProfileArchetype(profile)
  const eb1a = clamp(avgEb1aScore(profile), 18, 72)
  const eb1b = eb1bScore(profile)
  const eb1c = eb1cScore(profile)

  const rows: PathwayBaselineRow[] = []
  if (selectedCategories.includes('EB1A')) {
    rows.push({
      pathway: 'EB1A',
      readinessScore: archetype === 'industry_senior' ? clamp(eb1a + 8, 48, 68) : eb1a,
      status: statusForEb1a(eb1a),
      finding: findingEb1a(eb1a, archetype),
    })
  }
  if (selectedCategories.includes('EB1B')) {
    rows.push({
      pathway: 'EB1B',
      readinessScore: eb1b,
      status: statusForEb1b(eb1b, archetype),
      finding: findingEb1b(eb1b, archetype),
    })
  }
  if (selectedCategories.includes('EB1C')) {
    rows.push({
      pathway: 'EB1C',
      readinessScore: eb1c,
      status: statusForEb1c(eb1c),
      finding: findingEb1c(eb1c),
    })
  }

  let primary: VisaCategory = 'EB1A'
  let secondary: VisaCategory | undefined
  const notRecommended: VisaCategory[] = []

  if (archetype === 'research_phd' && eb1b >= eb1a) {
    primary = 'EB1B'
    secondary = 'EB1A'
    notRecommended.push('EB1C')
  } else if (archetype === 'academic_teaching') {
    primary = 'EB1B'
    secondary = 'EB1A'
    notRecommended.push('EB1C')
  } else if (archetype === 'industry_senior') {
    primary = 'EB1A'
    if (eb1c >= 42) secondary = 'EB1C'
    notRecommended.push('EB1B')
  } else {
    primary = eb1a >= eb1b ? 'EB1A' : 'EB1B'
    if (eb1c >= 42) secondary = 'EB1C'
  }

  const filingStatus: PathwayRecommendation['filingStatus'] =
    archetype === 'research_phd' && eb1b >= 58 ? 'Conditional' : 'Do not file now'

  const buildFocus =
    archetype === 'industry_senior'
      ? 'Enterprise integration innovation, repository drift detection, API modernization, and verifiable product artifacts'
      : archetype === 'research_phd'
        ? 'Quality conversion: SCI/Scopus indexing, citations, media, and US sponsor alignment'
        : archetype === 'academic_teaching'
          ? 'Scholarly publications, judging, speaking, and national-level recognition in engineering education'
          : 'Profile-aligned evidence portfolio across publications, patents, products, and third-party recognition'

  const filteredNotRec = notRecommended.filter((c) => selectedCategories.includes(c))

  return {
    primary,
    secondary,
    notRecommended: filteredNotRec.length > 0 ? filteredNotRec : undefined,
    rows,
    filingStatus,
    buildFocus,
  }
}
