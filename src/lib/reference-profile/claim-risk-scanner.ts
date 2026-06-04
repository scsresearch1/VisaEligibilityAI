import type { ExtractedProfileSignals } from '../benchmark-report/extract-profile'
import type { RiskFlag } from '../../types/assessment'
import type { ScannedClaimRisk, ClaimRiskSeverity } from './types'

interface RiskPattern {
  re: RegExp
  severity: ClaimRiskSeverity
  category: ScannedClaimRisk['category']
  recommendation: string
}

const PATTERNS: RiskPattern[] = [
  {
    re: /\b(world'?s?\s+first|only\s+person|first\s+ever|unparalleled|revolutionary)\b/i,
    severity: 'Critical',
    category: 'superlative',
    recommendation:
      'Do not use unless independently verifiable; reframe with factual scale, dates, and third-party proof.',
  },
  {
    re: /\b(extraordinary|world[- ]class|best[- ]in[- ]class|industry[- ]leading)\b/i,
    severity: 'High',
    category: 'superlative',
    recommendation:
      'Replace with factual descriptions of role, scale, systems, budget, team, and measurable impact.',
  },
  {
    re: /\b(\$[\d,.]+\s*(million|billion|m|b)|contracts?\s+exceeding)\b/i,
    severity: 'High',
    category: 'financial',
    recommendation:
      'Use only with authorized confirmation, redacted documentation, or counsel-approved sanitized case study.',
  },
  {
    re: /\b(shipped\s+globally|for\s+\d+\s+years|significant\s+industry\s+contribution)\b/i,
    severity: 'Critical',
    category: 'contribution',
    recommendation:
      'Build modern artifact, expert letters, validation reports, and published material before legal use.',
  },
  {
    re: /\b(top\s+\d+%|among\s+over\s+\d+\s+million)\b/i,
    severity: 'Medium',
    category: 'recognition',
    recommendation: 'Use as background context only unless official proof exists.',
  },
  {
    re: /\b(attendance|participation|certificate\s+of\s+participation)\b/i,
    severity: 'Medium',
    category: 'recognition',
    recommendation: 'Attendance alone does not satisfy awards or recognition criteria — rebuild with selective honors.',
  },
  {
    re: /\b(hod|head\s+of\s+department)\b.*\b(manager|executive)\b/i,
    severity: 'Medium',
    category: 'role',
    recommendation: 'Academic HOD roles do not automatically satisfy EB-1C multinational manager criteria.',
  },
  {
    re: /\b(guaranteed|sole\s+inventor|only\s+architect)\b/i,
    severity: 'High',
    category: 'superlative',
    recommendation: 'Support with co-inventor records, org charts, and independent expert validation.',
  },
]

function severityRank(s: ClaimRiskSeverity): number {
  return { Critical: 0, High: 1, Medium: 2, Low: 3 }[s]
}

export function scanClaimRisks(profile: ExtractedProfileSignals): ScannedClaimRisk[] {
  const hits: ScannedClaimRisk[] = []
  const lines = profile.fullText.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.length < 12) continue
    for (const p of PATTERNS) {
      p.re.lastIndex = 0
      if (p.re.test(trimmed)) {
        hits.push({
          claim: trimmed.slice(0, 200),
          severity: p.severity,
          recommendation: p.recommendation,
          category: p.category,
        })
        break
      }
    }
    if (hits.length >= 10) break
  }

  return hits
    .sort((a, b) => severityRank(a.severity) - severityRank(b.severity))
    .slice(0, 8)
}

export function claimRisksToRiskFlags(profile: ExtractedProfileSignals): RiskFlag[] {
  const scanned = scanClaimRisks(profile)
  const anchor =
    profile.keyClaims.length > 0
      ? profile.keyClaims.slice(0, 2).join('; ')
      : 'built publications, patents, and third-party verification'

  if (scanned.length > 0) {
    return scanned.map((r, i) => ({
      id: `risk-scan-${i}`,
      claim: r.claim,
      riskType:
        r.category === 'financial'
          ? 'weak'
          : r.severity === 'Critical'
            ? 'unsupported'
            : 'exaggerated',
      severity:
        r.severity === 'Critical' || r.severity === 'High'
          ? 'high'
          : r.severity === 'Low'
            ? 'low'
            : 'medium',
      recommendation: `${r.recommendation} Anchor build plan: ${anchor.slice(0, 120)}.`,
    }))
  }

  if (profile.keyClaims.length > 0) {
    return [
      {
        id: 'risk-generic',
        claim: profile.keyClaims[0].slice(0, 180),
        riskType: 'weak',
        severity: 'medium',
        recommendation:
          'Consulting must build independent letters, metrics, or publications that substantiate this claim.',
      },
    ]
  }

  return [
    {
      id: 'risk-upload',
      claim: 'Limited extractable profile text',
      riskType: 'unsupported',
      severity: 'medium',
      recommendation:
        'Upload a PDF or Word resume for profiling, then execute the build roadmap.',
    },
  ]
}

/** Legacy-compatible risky phrase hits for extract-profile. */
export function extractLegacyRiskyPhrases(
  text: string,
): { phrase: string; context: string }[] {
  const profile = { fullText: text, keyClaims: [] } as unknown as ExtractedProfileSignals
  return scanClaimRisks(profile).map((r) => ({
    phrase: r.claim.slice(0, 80),
    context: r.claim,
  }))
}
