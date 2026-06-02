import type { StructuredResumeProfile } from './resume-deep-extract'

/** Legacy keyword domains that often misfire on academic engineering CVs. */
export const MISALIGNED_DOMAIN_RE =
  /Healthcare\s*&\s*Life\s*Sciences|Operations\s*&\s*Supply\s*Chain|Marketing\s*&\s*Growth|Finance\s*&\s*Banking/i

const FIELD_RULES: { patterns: RegExp[]; label: string; weight: number }[] = [
  {
    label: 'Electrical Engineering & Power Systems',
    weight: 8,
    patterns: [
      /\belectrical\s+engineering\b/i,
      /\bpower\s+electronics\b/i,
      /\bpower\s+systems?\b/i,
      /\belectric\s+circuits?\b/i,
      /\brenewable\s+energy\b/i,
      /\bcontrol\s+systems?\b/i,
      /\belectromagnetic\b/i,
      /\bhydraulic\s+machinery\b/i,
      /\belectrical\s+&\s*electronics\b/i,
    ],
  },
  {
    label: 'Higher Education & Engineering Teaching',
    weight: 7,
    patterns: [
      /\b(assistant\s+)?professor\b/i,
      /\blecturer\b/i,
      /\bteaching\s+experience\b/i,
      /\bfaculty\b/i,
      /\bguest\s+professor\b/i,
      /\bh\.?o\.?d\b/i,
      /\bengineering\s+college\b/i,
      /\bexternal\s+examiner\b/i,
      /\bguided\s+students\b/i,
    ],
  },
  {
    label: 'Academic Research (Doctoral)',
    weight: 5,
    patterns: [
      /\bph\.?\s*d\b/i,
      /\bdoctor\s+of\s+philosophy\b/i,
      /\bresearch\s+work\b/i,
      /\bdissertation\b/i,
      /\bscholarly\b/i,
    ],
  },
  {
    label: 'Software Engineering',
    weight: 6,
    patterns: [/\bsoftware\s+engineer/i, /\bfull[- ]stack\b/i, /\bbackend\s+developer\b/i],
  },
  {
    label: 'Artificial Intelligence / ML',
    weight: 6,
    patterns: [/\bmachine learning\b/i, /\bdeep learning\b/i, /\b(llm|nlp)\b/i],
  },
]

/** Score-based primary field(s) — avoids false positives from words like "medical" in a university name. */
export function inferProfessionalDomains(
  structured: StructuredResumeProfile,
  fullText: string,
): string[] {
  const corpus = [
    fullText,
    structured.professionalSummary ?? '',
    ...structured.workExperience.map((w) => `${w.title} ${w.company} ${w.highlights.join(' ')}`),
    ...structured.education.map((e) => `${e.degree ?? ''} ${e.institution} ${e.details ?? ''}`),
    ...structured.parsedSections.map((s) => `${s.heading} ${s.content}`),
  ].join('\n')

  const scores = new Map<string, number>()
  for (const rule of FIELD_RULES) {
    for (const re of rule.patterns) {
      if (re.test(corpus)) {
        scores.set(rule.label, (scores.get(rule.label) ?? 0) + rule.weight)
        break
      }
    }
  }

  const engineeringPrimary =
    (scores.get('Electrical Engineering & Power Systems') ?? 0) >= 8 ||
    (scores.get('Higher Education & Engineering Teaching') ?? 0) >= 7

  if (engineeringPrimary) {
    scores.delete('Healthcare & Life Sciences')
    scores.set(
      'Operations & Supply Chain',
      Math.max(0, (scores.get('Operations & Supply Chain') ?? 0) - 6),
    )
  }

  const ranked = [...scores.entries()]
    .filter(([, s]) => s >= 4)
    .sort((a, b) => b[1] - a[1])
    .map(([label]) => label)

  if (ranked.length > 0) return ranked.slice(0, 3)

  if (structured.workExperience.length > 0) {
    const top = structured.workExperience[0]
    return [`${top.title} (${top.company})`.slice(0, 80)]
  }

  return ['Professional practice (from uploaded profile)']
}

/** Replace stale/wrong domains from older sessions or LLM with freshly inferred fields. */
export function resolveProfileDomains(
  structured: StructuredResumeProfile,
  fullText: string,
  existing?: string[],
): string[] {
  const fresh = inferProfessionalDomains(structured, fullText)
  if (!existing?.length) return fresh

  const hasMisaligned = existing.some((d) => MISALIGNED_DOMAIN_RE.test(d))
  const hasStrongField = fresh.some((d) =>
    /Electrical|Power|Higher Education|Engineering Teaching|Academic Research/i.test(d),
  )
  const corpusLooksEngineering =
    /\belectrical\b/i.test(fullText) &&
    /\b(power electronics|engineering|professor|lecturer|ph\.?\s*d)\b/i.test(fullText)

  if (hasMisaligned && (hasStrongField || corpusLooksEngineering)) return fresh
  return existing
}

/** Single field label for titles, media angles, and action cards. */
export function primaryFieldForDeliverables(
  domains: string[],
  fullText = '',
): string {
  const first = domains[0]
  if (first && !MISALIGNED_DOMAIN_RE.test(first)) return first

  if (/electrical|power electronics|renewable energy/i.test(fullText)) {
    return 'Electrical Engineering & Power Systems'
  }
  if (/professor|lecturer|faculty|teaching/i.test(fullText)) {
    return 'Higher Education & Engineering Teaching'
  }

  return domains.find((d) => !MISALIGNED_DOMAIN_RE.test(d)) ?? 'the candidate\'s professional field'
}

export function isWeakProfileAnchor(claim: string): boolean {
  const c = claim.trim()
  if (c.length < 22) return true
  if (/^Metric:\s*\d+%?\s*$/i.test(c)) return true
  if (/^Metric:\s*\d+\+?\s*years?\s*$/i.test(c)) return true
  if (/^Highlight:\s*\d+%$/i.test(c)) return true
  return false
}

export function pickSubstantiveProfileAnchor(
  profile: StructuredResumeProfile & { keyClaims: string[] },
  areaHint?: RegExp,
): string | undefined {
  if (areaHint) {
    const matched = profile.keyClaims.find((c) => areaHint.test(c) && !isWeakProfileAnchor(c))
    if (matched) return matched.slice(0, 200)
  }

  const claim = profile.keyClaims.find((c) => !isWeakProfileAnchor(c))
  if (claim) return claim.slice(0, 200)

  const job = profile.workExperience[0]
  if (job?.highlights[0]) {
    return `${job.title} @ ${job.company}: ${job.highlights[0]}`.slice(0, 200)
  }
  if (job?.title) {
    return `${job.title} at ${job.company}${job.period ? ` (${job.period})` : ''}`.slice(0, 200)
  }

  const edu = profile.education[0]
  if (edu?.degree) {
    return `${edu.degree}${edu.institution ? ` — ${edu.institution}` : ''}`.slice(0, 200)
  }

  return undefined
}

export function formatProfileKeySignals(
  structured: StructuredResumeProfile,
  keyClaims: string[],
): string {
  const substantive = keyClaims.filter((c) => {
    if (/^Metric:\s*\d+%\s*$/i.test(c)) return false
    if (/^Metric:\s*\d+\+?\s*years?\s*$/i.test(c)) return false
    return c.length > 20
  })

  if (substantive.length >= 2) {
    return substantive.slice(0, 4).join('; ')
  }

  const parts: string[] = []
  const edu = structured.education[0]
  if (edu?.degree) parts.push(`${edu.degree}${edu.institution ? ` — ${edu.institution}` : ''}`)

  const role = structured.workExperience[0]
  if (role) {
    parts.push(
      `${role.title} at ${role.company}${role.period ? ` (${role.period})` : ''}`.slice(0, 120),
    )
  }

  const teachingYears = structured.keyMetrics.find((m) => /years?/i.test(m))
  if (teachingYears && structured.workExperience.some((w) => /teach|professor|lecturer/i.test(w.title))) {
    parts.push(`${teachingYears} of engineering teaching and academic leadership`)
  }

  if (parts.length > 0) return parts.join('; ')
  return 'uploaded resume — expand extracted sections for fuller signal detection'
}
