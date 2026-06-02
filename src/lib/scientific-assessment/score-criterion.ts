import { VISA_CRITERIA } from '../../data/visa-criteria'
import type { ExtractedProfileSignals } from '../benchmark-report/extract-profile'
import type { EvidenceStrength, VisaCategory } from '../../types/assessment'
import { evidenceScoreToStrength } from './methodology'

export interface CriterionEvidenceScore {
  criterionId: string
  code: string
  title: string
  category: VisaCategory
  evidenceScore: number
  strength: EvidenceStrength
  profileSignals: string[]
  regulatoryNote: string
}

function scoreEb1aCriterion(
  code: string,
  profile: ExtractedProfileSignals,
): { score: number; signals: string[] } {
  const text = profile.fullText.toLowerCase()
  const signals: string[] = []

  const add = (pts: number, signal: string) => {
    signals.push(signal)
    return pts
  }

  let score = 12

  switch (code) {
    case '1': {
      if (profile.awards.length > 0) score += add(35, `Awards listed: ${profile.awards[0]?.slice(0, 60)}`)
      if (/award|prize|honou?r|fellow|medal/i.test(text)) score += add(15, 'Award/honor keywords in profile')
      break
    }
    case '2': {
      if (/fellow|membership|ieee|acm|professional society/i.test(text)) {
        score += add(25, 'Membership/fellowship signals')
      }
      break
    }
    case '3': {
      if (/media|press|interview|featured|forbes|techcrunch/i.test(text)) {
        score += add(28, 'Media/press mention signals')
      }
      break
    }
    case '4': {
      if (/judge|reviewer|panel|program committee|peer review/i.test(text)) {
        score += add(30, 'Judging/review role signals')
      }
      break
    }
    case '5': {
      if (profile.patents.length > 0) score += add(30, `Patents: ${profile.patents[0]?.slice(0, 50)}`)
      if (profile.hasPatent) score += add(10, 'Patent/IP keywords')
      if (profile.hasProductClaim || profile.projects.length > 0) {
        score += add(18, 'Product/innovation signals')
      }
      if (profile.keyClaims.some((c) => /invent|built|architect|created|platform/i.test(c))) {
        score += add(12, 'Contribution claims in work history')
      }
      break
    }
    case '6': {
      if (profile.publications.length > 0) {
        score += add(25 + Math.min(20, profile.publications.length * 8), `${profile.publications.length} publication(s) parsed`)
      }
      if (profile.hasPublication) score += add(15, 'Publication keywords')
      if (/citation|h-index|journal|doi|arxiv/i.test(text)) score += add(12, 'Citation/index signals')
      break
    }
    case '7': {
      if (/exhibit|display|installation|gallery/i.test(text)) score += add(22, 'Exhibition signals')
      break
    }
    case '8':
    case '12': {
      if (profile.hasLeadership) score += add(28, 'Leadership role signals')
      if (profile.workExperience.some((w) => /director|vp|head|lead|principal|chief/i.test(w.title))) {
        score += add(20, 'Senior title in structured work history')
      }
      break
    }
    case '9':
    case '11': {
      if (/salary|\$[\d,]+|compensation|remuneration|top \d+%/i.test(text)) {
        score += add(25, 'Compensation/salary signals')
      }
      break
    }
    case '10': {
      if (/box office|commercial success|performing arts/i.test(text)) score += add(20, 'Performing arts signals')
      break
    }
    default:
      break
  }

  if (profile.extractionQuality === 'minimal') score = Math.min(score, 40)
  if (profile.extractionQuality === 'rich' && score > 50) score += 5

  return { score: Math.min(95, Math.max(8, score)), signals: signals.slice(0, 5) }
}

function scoreEb1bCriterion(code: string, profile: ExtractedProfileSignals): { score: number; signals: string[] } {
  const text = profile.fullText.toLowerCase()
  const signals: string[] = []
  const add = (pts: number, signal: string) => {
    signals.push(signal)
    return pts
  }
  let score = 12

  switch (code) {
    case '1': {
      if (profile.awards.length > 0) score += add(32, `Award: ${profile.awards[0]?.slice(0, 60)}`)
      if (/major prize|fellowship|honou?r|medal/i.test(text)) score += add(18, 'Major prize/honor keywords')
      break
    }
    case '2': {
      if (/fellow|membership|ieee|acm|association/i.test(text)) score += add(24, 'Selective membership signals')
      break
    }
    case '3': {
      if (/published material|written about|profiled in|featured in/i.test(text)) {
        score += add(26, 'Published material about candidate')
      }
      if (/media|press coverage|interview/i.test(text)) score += add(14, 'Media coverage signals')
      break
    }
    case '4': {
      if (/peer review|reviewer|panel|judge|examiner/i.test(text)) {
        score += add(28, 'Peer review / judging signals')
      }
      break
    }
    case '5': {
      if (profile.patents.length > 0) score += add(22, 'Patent/research IP in profile')
      if (/original research|significant impact|citation|h-index/i.test(text)) {
        score += add(24, 'Research impact signals')
      }
      if (profile.keyClaims.some((c) => /research|invent|developed/i.test(c))) {
        score += add(12, 'Research contribution in work history')
      }
      break
    }
    case '6': {
      if (profile.publications.length > 0) {
        score += add(25 + Math.min(18, profile.publications.length * 6), `${profile.publications.length} publication(s)`)
      }
      if (/journal|doi|scholar|paper|author/i.test(text)) score += add(14, 'Scholarly authorship keywords')
      break
    }
    default:
      break
  }

  if (/professor|lecturer|researcher|ph\.?\s*d/i.test(text) && score < 40) {
    score += add(8, 'Academic role context (does not alone satisfy criterion)')
  }

  if (profile.extractionQuality === 'minimal') score = Math.min(score, 38)
  return { score: Math.min(92, Math.max(8, score)), signals: signals.slice(0, 5) }
}

function scoreEb1cCriterion(_code: string, profile: ExtractedProfileSignals): { score: number; signals: string[] } {
  const text = profile.fullText.toLowerCase()
  let score = 18
  const signals: string[] = []

  if (profile.hasLeadership || /manager|executive|director|vp/i.test(text)) {
    score += 28
    signals.push('Managerial/executive signals')
  }
  if (/subsidiary|affiliate|multinational|global|overseas/i.test(text)) {
    score += 15
    signals.push('Multinational org signals')
  }

  return { score: Math.min(88, score), signals }
}

/** Rule-based criterion scores — reproducible baseline for LLM reconciliation */
export function scoreAllCriteria(
  categories: VisaCategory[],
  profile: ExtractedProfileSignals,
): CriterionEvidenceScore[] {
  const criteria = VISA_CRITERIA.filter((c) => categories.includes(c.category))

  return criteria.map((c) => {
    let result: { score: number; signals: string[] }
    if (c.category === 'EB1A') result = scoreEb1aCriterion(c.code, profile)
    else if (c.category === 'EB1B') result = scoreEb1bCriterion(c.code, profile)
    else result = scoreEb1cCriterion(c.code, profile)

    const strength = evidenceScoreToStrength(result.score)
    return {
      criterionId: c.id,
      code: c.code,
      title: c.title,
      category: c.category,
      evidenceScore: result.score,
      strength,
      profileSignals: result.signals,
      regulatoryNote: c.regulatoryCitation
        ? `${c.code}. ${c.title} — ${c.regulatoryCitation}`
        : `${c.code}. ${c.title} — ${c.description.slice(0, 160)}`,
    }
  })
}

export function buildRuleBasedCriterionDigest(scores: CriterionEvidenceScore[]): string {
  const lines = [
    '=== RULE-BASED CRITERION BASELINE (mandatory anchor — LLM may adjust ±15 ONLY with quoted profileEvidence from inventory) ===',
    'Scores without anchored profileEvidence in your JSON will be pulled back toward these baselines.',
  ]
  for (const s of scores) {
    const criterion = VISA_CRITERIA.find((c) => c.id === s.criterionId)
    lines.push(
      `${s.criterionId} | ${s.category} ${s.code} | BASE ${s.evidenceScore}/100 (${s.strength}) | ${s.title}`,
    )
    if (criterion?.evidenceStandard) {
      lines.push(`  Evidence standard: ${criterion.evidenceStandard.slice(0, 140)}…`)
    }
    if (s.profileSignals.length > 0) {
      lines.push(`  Detected signals: ${s.profileSignals.join('; ')}`)
    } else {
      lines.push('  Detected signals: none — score as missing/unsupported unless inventory proves otherwise')
    }
  }
  return lines.join('\n')
}
