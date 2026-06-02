import { VISA_CRITERIA } from '../../data/visa-criteria'
import type { VisaCategory } from '../../types/assessment'
import type { ExtractedProfileSignals } from '../benchmark-report/extract-profile'
import type { StructuredResumeProfile } from '../resume-deep-extract'

export interface ProfileFactInventory {
  /** Lowercased searchable corpus for evidence anchoring */
  corpus: string
  verifiedFacts: { fact: string; source: string }[]
  employers: string[]
  jobTitles: string[]
  education: string[]
  publications: string[]
  patents: string[]
  awards: string[]
  domains: string[]
  keyClaims: string[]
}

function pushUnique(target: string[], value: string | undefined) {
  const v = value?.trim()
  if (!v || v.length < 2) return
  const key = v.toLowerCase()
  if (!target.some((t) => t.toLowerCase() === key)) target.push(v)
}

/** Verifiable facts extracted from structured parse + signals — LLM must anchor to these. */
export function buildProfileFactInventory(
  profile: ExtractedProfileSignals,
  structured?: StructuredResumeProfile | null,
): ProfileFactInventory {
  const verifiedFacts: { fact: string; source: string }[] = []
  const employers: string[] = []
  const jobTitles: string[] = []
  const education: string[] = []
  const publications = [...profile.publications]
  const patents = [...profile.patents]
  const awards = [...profile.awards]

  for (const w of profile.workExperience) {
    pushUnique(employers, w.company)
    pushUnique(jobTitles, w.title)
    const roleFact = `${w.title} at ${w.company}${w.period ? ` (${w.period})` : ''}`
    verifiedFacts.push({ fact: roleFact, source: 'structured work history' })
    w.highlights.slice(0, 2).forEach((h) => {
      verifiedFacts.push({ fact: `${w.title} @ ${w.company}: ${h}`, source: 'work highlight' })
    })
  }

  for (const e of profile.education) {
    const edu = `${e.degree ? `${e.degree}, ` : ''}${e.institution}${e.period ? ` (${e.period})` : ''}`
    pushUnique(education, edu)
    verifiedFacts.push({ fact: edu, source: 'structured education' })
  }

  profile.publications.forEach((p) =>
    verifiedFacts.push({ fact: `Publication: ${p}`, source: 'publications section' }),
  )
  profile.patents.forEach((p) =>
    verifiedFacts.push({ fact: `Patent/IP: ${p}`, source: 'patents section' }),
  )
  profile.awards.forEach((a) =>
    verifiedFacts.push({ fact: `Award: ${a}`, source: 'awards section' }),
  )
  profile.projects.slice(0, 6).forEach((p) =>
    verifiedFacts.push({ fact: `Project: ${p}`, source: 'projects section' }),
  )

  if (structured?.professionalSummary) {
    verifiedFacts.push({
      fact: structured.professionalSummary.slice(0, 220),
      source: 'professional summary',
    })
  }

  profile.keyClaims.slice(0, 10).forEach((c) => {
    if (c.length > 18) verifiedFacts.push({ fact: c.slice(0, 200), source: 'profile signal' })
  })

  const corpusParts = [
    profile.fullText,
    ...verifiedFacts.map((f) => f.fact),
    profile.skills.join(' '),
  ]
  const corpus = corpusParts.join('\n').toLowerCase()

  return {
    corpus,
    verifiedFacts: verifiedFacts.slice(0, 40),
    employers,
    jobTitles,
    education,
    publications,
    patents,
    awards,
    domains: profile.domains,
    keyClaims: profile.keyClaims,
  }
}

export function formatFactInventoryForPrompt(inventory: ProfileFactInventory): string {
  const lines = [
    '=== VERIFIED PROFILE FACT INVENTORY (ONLY these may be cited as established facts) ===',
    `Primary field(s): ${inventory.domains.join(' · ') || '—'}`,
  ]
  if (inventory.employers.length > 0) {
    lines.push(`Employers: ${inventory.employers.slice(0, 8).join('; ')}`)
  }
  if (inventory.jobTitles.length > 0) {
    lines.push(`Roles: ${inventory.jobTitles.slice(0, 8).join('; ')}`)
  }
  if (inventory.publications.length > 0) {
    lines.push(`Publications (${inventory.publications.length}): ${inventory.publications.slice(0, 5).join(' | ')}`)
  }
  if (inventory.patents.length > 0) {
    lines.push(`Patents (${inventory.patents.length}): ${inventory.patents.slice(0, 4).join(' | ')}`)
  }
  if (inventory.awards.length > 0) {
    lines.push(`Awards (${inventory.awards.length}): ${inventory.awards.slice(0, 5).join(' | ')}`)
  }
  lines.push('', 'Enumerated verifiable facts:')
  inventory.verifiedFacts.slice(0, 28).forEach((f, i) => {
    lines.push(`${i + 1}. [${f.source}] ${f.fact}`)
  })
  lines.push(
    '',
    'RULE: Any criterion score above rule baseline requires profileEvidence quoting one of the facts above.',
    'Do NOT invent employers, degrees, papers, patents, salary figures, or awards not listed.',
  )
  return lines.join('\n')
}

/** Compact regulatory checklist for token-limited models */
export function buildCompactCriterionDigest(categories: VisaCategory[]): string {
  const criteria = VISA_CRITERIA.filter((c) => categories.includes(c.category))
  const lines = ['=== CRITERION CHECKLIST (evaluate ALL ids below) ===']
  for (const c of criteria) {
    lines.push(
      `${c.id} | ${c.code}. ${c.title} | reg: ${(c.regulatoryCitation ?? c.description).slice(0, 100)}`,
    )
  }
  return lines.join('\n')
}
