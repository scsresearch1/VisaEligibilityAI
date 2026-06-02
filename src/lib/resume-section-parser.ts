/**
 * Style-agnostic resume section detection and per-section parsing.
 * Handles ALL CAPS headers, markdown, colons, numbered sections, and mixed layouts.
 */

export type ResumeSectionKind =
  | 'header'
  | 'summary'
  | 'experience'
  | 'education'
  | 'skills'
  | 'projects'
  | 'publications'
  | 'patents'
  | 'awards'
  | 'certifications'
  | 'volunteer'
  | 'languages'
  | 'references'
  | 'other'

export interface ParsedResumeSection {
  kind: ResumeSectionKind
  heading: string
  content: string
  items: string[]
}

export interface WorkEntry {
  company: string
  title: string
  period?: string
  location?: string
  highlights: string[]
}

export interface EducationEntry {
  institution: string
  degree?: string
  period?: string
  details?: string
}

const SECTION_RULES: { kind: ResumeSectionKind; patterns: RegExp[] }[] = [
  {
    kind: 'summary',
    patterns: [
      /^(professional\s+)?summary$/i,
      /^profile$/i,
      /^objective$/i,
      /^about(\s+me)?$/i,
      /^career\s+summary$/i,
      /^executive\s+summary$/i,
      /^experience\s+summary:?$/i,
    ],
  },
  {
    kind: 'experience',
    patterns: [
      /^work\s+experience$/i,
      /^professional\s+experience$/i,
      /^experience$/i,
      /^employment(\s+history)?$/i,
      /^career(\s+history)?$/i,
      /^relevant\s+experience$/i,
      /^work\s+history$/i,
    ],
  },
  {
    kind: 'education',
    patterns: [
      /^education$/i,
      /^academic(\s+background)?$/i,
      /^qualifications$/i,
      /^educational\s+background$/i,
      /^educational\s+qualification$/i,
    ],
  },
  {
    kind: 'skills',
    patterns: [
      /^skills$/i,
      /^technical\s+skills$/i,
      /^core\s+competencies$/i,
      /^technologies$/i,
      /^tools(\s+(&|and)\s+technologies)?$/i,
      /^areas?\s+of\s+expertise$/i,
    ],
  },
  {
    kind: 'projects',
    patterns: [/^projects$/i, /^key\s+projects$/i, /^selected\s+projects$/i, /^portfolio$/i],
  },
  {
    kind: 'publications',
    patterns: [/^publications$/i, /^research$/i, /^papers$/i, /^scholarly\s+works$/i],
  },
  {
    kind: 'patents',
    patterns: [/^patents?$/i, /^intellectual\s+property$/i, /^ip$/i],
  },
  {
    kind: 'awards',
    patterns: [/^awards?$/i, /^honors?$/i, /^achievements$/i, /^recognition$/i],
  },
  {
    kind: 'certifications',
    patterns: [/^certifications?$/i, /^licenses?$/i, /^credentials$/i, /^training$/i],
  },
  {
    kind: 'volunteer',
    patterns: [/^volunteer/i, /^community\s+service/i],
  },
  {
    kind: 'languages',
    patterns: [/^languages?$/i],
  },
  {
    kind: 'references',
    patterns: [/^references$/i],
  },
]

const DATE_RANGE =
  /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+\d{4}\s*[-–—to]+\s*(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+)?(?:\d{4}|present|current)\b|\b\d{4}\s*[-–—]\s*(?:\d{4}|present|current)\b/i

function normalizeHeadingLine(line: string): string {
  return line
    .replace(/^#+\s*/, '')
    .replace(/^\d+[.)]\s*/, '')
    .replace(/^[IVXLC]+[.)]\s+/i, '')
    .replace(/^[-=*_]{3,}\s*/, '')
    .replace(/\s*[-=*_]{3,}\s*$/, '')
    .replace(/:$/, '')
    .trim()
}

export function classifySectionHeading(rawLine: string): ResumeSectionKind | null {
  const line = normalizeHeadingLine(rawLine)
  if (!line || line.length > 80) return null

  for (const rule of SECTION_RULES) {
    if (rule.patterns.some((p) => p.test(line))) return rule.kind
  }

  return null
}

function isStructuralHeaderLine(trimmed: string): boolean {
  if (!trimmed || trimmed.length > 85) return false
  if (/^https?:\/\//i.test(trimmed)) return false
  if (/^[\w.+-]+@/.test(trimmed)) return false
  if (/^\+?\d[\d\s().-]{8,}$/.test(trimmed)) return false

  if (classifySectionHeading(trimmed)) return true

  // ALL CAPS section title (WORK EXPERIENCE)
  if (
    trimmed.length >= 4 &&
    trimmed.length <= 50 &&
    /^[A-Z0-9][A-Z0-9\s/&.,'-]+$/.test(trimmed) &&
    trimmed === trimmed.toUpperCase() &&
    /[A-Z]{2,}/.test(trimmed) &&
    !DATE_RANGE.test(trimmed)
  ) {
    return true
  }

  // Short title ending with colon (Experience:)
  if (/^[A-Za-z][A-Za-z\s/&-]{2,40}:$/.test(trimmed) && classifySectionHeading(normalizeHeadingLine(trimmed))) {
    return true
  }

  // Markdown style ## Heading
  if (/^#{1,3}\s+[A-Za-z]/.test(trimmed)) return true

  return false
}

export function splitResumeIntoSections(text: string): ParsedResumeSection[] {
  const lines = text.split(/\r?\n/)
  const sections: ParsedResumeSection[] = []
  let currentKind: ResumeSectionKind = 'header'
  let currentHeading = 'Header'
  let buffer: string[] = []

  const flush = () => {
    const content = buffer.join('\n').trim()
    const items = extractBulletItems(content)
    if (content.length > 0 || currentKind !== 'header') {
      sections.push({
        kind: currentKind,
        heading: currentHeading,
        content,
        items,
      })
    }
    buffer = []
  }

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]
    const trimmed = raw.trim()

    if (trimmed === '' || /^[-_*]{3,}$/.test(trimmed)) {
      buffer.push('')
      continue
    }

    if (isStructuralHeaderLine(trimmed)) {
      if (buffer.some((l) => l.trim().length > 0)) flush()
      currentHeading = normalizeHeadingLine(trimmed)
      currentKind = classifySectionHeading(trimmed) ?? 'other'
      continue
    }

    buffer.push(raw)
  }
  flush()

  return sections.filter((s) => s.content.length > 0 || s.kind !== 'header')
}

function extractBulletItems(content: string): string[] {
  return content
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 2)
    .map((l) => l.replace(/^[-•*●▪◦►]\s*/, '').replace(/^\d+[.)]\s+/, ''))
    .filter((l) => l.length > 2 && !/^[-_*]{2,}$/.test(l))
}

function extractPeriod(text: string): string | undefined {
  return text.match(DATE_RANGE)?.[0]
}

function stripPeriod(text: string): string {
  return text.replace(DATE_RANGE, '').replace(/\s*[,|]\s*$/, '').trim()
}

/** Split experience block into job-sized chunks (multiple resume styles). */
function chunkExperienceContent(content: string): string[] {
  const lines = content.split('\n').map((l) => l.trim())
  const chunks: string[] = []
  let current: string[] = []

  const isJobStart = (line: string, next?: string) => {
    if (DATE_RANGE.test(line) && line.length < 45) return true
    if (/^[A-Z]/.test(line) && DATE_RANGE.test(line)) return true
    // Company line followed by title or dates
    if (line.length < 80 && next && (DATE_RANGE.test(next) || /^[A-Z]/.test(next))) {
      if (!/^[-•*●]/.test(line) && !/^[-•*●]/.test(next)) return true
    }
    return false
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!line) {
      if (current.length > 0) {
        chunks.push(current.join('\n'))
        current = []
      }
      continue
    }

    const next = lines[i + 1]
    if (current.length > 0 && isJobStart(line, next)) {
      chunks.push(current.join('\n'))
      current = [line]
    } else {
      current.push(line)
    }
  }
  if (current.length > 0) chunks.push(current.join('\n'))

  if (chunks.length <= 1 && content.length > 100) {
    // Fallback: split on blank lines or date-only lines
    const alt = content.split(/\n\s*\n+/)
    if (alt.length > 1) return alt.filter((c) => c.trim().length > 20)
  }

  return chunks.filter((c) => c.trim().length > 8)
}

function parseExperienceChunk(chunk: string): WorkEntry | null {
  const lines = chunk.split('\n').map((l) => l.trim()).filter(Boolean)
  if (lines.length === 0) return null

  let period: string | undefined
  let title = ''
  let company = ''
  let location: string | undefined
  const highlights: string[] = []

  for (const line of lines) {
    const p = extractPeriod(line)
    if (p && !period) period = p
  }

  const nonBullets = lines.filter((l) => !/^[-•*●]/.test(l))
  const bullets = lines.filter((l) => /^[-•*●]/.test(l)).map((l) => l.replace(/^[-•*●]\s*/, ''))

  // One-line: Title | Company | Location | Dates
  const pipeParts = nonBullets[0]?.split(/\s*\|\s*/).map((s) => stripPeriod(s.trim())) ?? []
  if (pipeParts.length >= 2) {
    title = pipeParts[0]
    company = pipeParts[1]
    if (pipeParts[2] && !DATE_RANGE.test(pipeParts[2])) location = pipeParts[2]
  }

  // Title at Company (dates) or Title, Company
  if (!company && nonBullets[0]) {
    const atMatch = nonBullets[0].match(/^(.+?)\s+at\s+(.+?)(?:\s*[,|]\s*(.+))?$/i)
    if (atMatch) {
      title = stripPeriod(atMatch[1])
      company = stripPeriod(atMatch[2])
      if (atMatch[3]) location = stripPeriod(atMatch[3])
    }
  }

  // Two-line: line1 company, line2 title OR line1 title line2 company
  if (!company && nonBullets.length >= 2) {
    const l0 = stripPeriod(nonBullets[0])
    const l1 = stripPeriod(nonBullets[1])
    const l0LooksTitle = /\b(engineer|manager|director|lead|architect|consultant|developer|analyst|head|vp|president|specialist)\b/i.test(l0)
    const l1LooksTitle = /\b(engineer|manager|director|lead|architect|consultant|developer|analyst|head|vp|president|specialist)\b/i.test(l1)
    if (l0LooksTitle && !l1LooksTitle) {
      title = l0
      company = l1
    } else if (!l0LooksTitle && l1LooksTitle) {
      company = l0
      title = l1
    } else {
      company = l0
      title = l1
    }
  }

  // Single header line only
  if (!title && !company && nonBullets[0]) {
    const h = stripPeriod(nonBullets[0])
    if (/\b(inc|llc|ltd|corp|company|technologies|solutions|group|bank|university)\b/i.test(h)) {
      company = h
    } else {
      title = h
    }
  }

  highlights.push(...bullets)
  for (const line of nonBullets.slice(2)) {
    if (line.length > 15 && !DATE_RANGE.test(line)) highlights.push(line)
  }

  if (!title && !company && highlights.length === 0) return null

  return {
    company: company || 'Organization',
    title: title || 'Role',
    period,
    location,
    highlights: highlights.slice(0, 10),
  }
}

export function parseWorkFromSections(sections: ParsedResumeSection[]): WorkEntry[] {
  const expSections = sections.filter((s) => s.kind === 'experience' || s.kind === 'volunteer')
  const entries: WorkEntry[] = []

  for (const sec of expSections) {
    for (const chunk of chunkExperienceContent(sec.content)) {
      const entry = parseExperienceChunk(chunk)
      if (entry) entries.push(entry)
    }
    if (entries.length === 0 && sec.items.length > 0) {
      entries.push({
        company: sec.heading,
        title: 'Professional experience',
        highlights: sec.items.slice(0, 12),
      })
    }
  }

  return entries.slice(0, 15)
}

export function parseEducationFromSections(sections: ParsedResumeSection[]): EducationEntry[] {
  const edSections = sections.filter((s) => s.kind === 'education')
  const entries: EducationEntry[] = []

  for (const sec of edSections) {
    const lines = sec.content.split('\n').map((l) => l.trim()).filter((l) => l.length > 3)
    for (const line of lines) {
      const period = extractPeriod(line)
      const degree =
        line.match(
          /\b(Ph\.?\s*D\.?|M\.?\s*(?:S\.?|Tech|Eng|BA)?|B\.?\s*(?:S\.?|Tech|Eng|BA|Sc)?|MBA|Bachelor[^,]*|Master[^,]*|Doctor[^,]*)\b/i,
        )?.[0]
      let institution = stripPeriod(line)
      if (degree) institution = institution.replace(degree, '').replace(/^[,;\s]+/, '').trim()

      if (institution.length > 3) {
        entries.push({ institution, degree, period, details: line })
      }
    }
    if (entries.length === 0 && sec.items.length > 0) {
      sec.items.forEach((item) => entries.push({ institution: item, details: item }))
    }
  }

  return entries.slice(0, 10)
}

export function parseSkillsFromSections(sections: ParsedResumeSection[]): string[] {
  const skillSections = sections.filter((s) => s.kind === 'skills')
  const skills = new Set<string>()

  for (const sec of skillSections) {
    for (const line of sec.content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed) continue
      // Category: skill1, skill2
      const colonSplit = trimmed.match(/^[^:]+:\s*(.+)$/)
      if (colonSplit) {
        colonSplit[1].split(/[,;|•]/).forEach((s) => {
          const t = s.trim()
          if (t.length > 1 && t.length < 50) skills.add(t)
        })
        continue
      }
      trimmed.split(/[,;|•]/).forEach((s) => {
        const t = s.trim().replace(/^[-•*●]\s*/, '')
        if (t.length > 1 && t.length < 50) skills.add(t)
      })
    }
    sec.items.forEach((i) => skills.add(i))
  }

  return [...skills].slice(0, 40)
}

export function parseListFromSections(
  sections: ParsedResumeSection[],
  kind: ResumeSectionKind,
): string[] {
  return sections
    .filter((s) => s.kind === kind)
    .flatMap((s) => (s.items.length > 0 ? s.items : extractBulletItems(s.content)))
    .slice(0, 15)
}

export function findSectionSummary(sections: ParsedResumeSection[]): string | undefined {
  const sum = sections.find((s) => s.kind === 'summary')
  if (sum?.content) return sum.content.slice(0, 800)
  const header = sections.find((s) => s.kind === 'header')
  if (header && header.content.length > 80 && header.content.length < 1200) {
    return header.content.slice(0, 800)
  }
  return undefined
}
