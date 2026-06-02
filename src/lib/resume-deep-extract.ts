import type { UploadedFile } from '../types/assessment'
import { isExtractionFailed } from './document-extract'
import {
  type EducationEntry,
  type ParsedResumeSection,
  type WorkEntry,
  findSectionSummary,
  parseEducationFromSections,
  parseListFromSections,
  parseSkillsFromSections,
  parseWorkFromSections,
  splitResumeIntoSections,
} from './resume-section-parser'

export type { WorkEntry, EducationEntry, ParsedResumeSection }
export type { ResumeSectionKind } from './resume-section-parser'

export type NameExtractionSource =
  | 'resume_label'
  | 'resume_header'
  | 'email'
  | 'linkedin'
  | 'filename'
  | 'default'

export interface NameExtractionMeta {
  value: string
  source: NameExtractionSource
  confidence: 'high' | 'medium' | 'low'
}

export interface StructuredResumeProfile {
  candidateName: string
  nameMeta: NameExtractionMeta
  contact: {
    email?: string
    phone?: string
    location?: string
    linkedIn?: string
  }
  professionalSummary?: string
  workExperience: WorkEntry[]
  education: EducationEntry[]
  skills: string[]
  projects: string[]
  publications: string[]
  patents: string[]
  awards: string[]
  certifications: string[]
  keyMetrics: string[]
  /** Every section detected in the document, in order */
  parsedSections: ParsedResumeSection[]
  /** @deprecated use parsedSections */
  sectionBlocks: { heading: string; content: string }[]
  extractionQuality: 'rich' | 'partial' | 'minimal'
  sectionsDetected: number
}

const NAME_STOP_WORDS =
  /^(resume|curriculum vitae|cv|profile|objective|summary|experience|education|skills|contact|phone|email|address)$/i

function extractContact(text: string): StructuredResumeProfile['contact'] {
  const email = text.match(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i)?.[0]
  const phone = text.match(
    /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/,
  )?.[0]
  const linkedIn = text.match(/linkedin\.com\/in\/[\w-]+/i)?.[0]
  const location = text.match(
    /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?,\s*[A-Z]{2}(?:\s+\d{5})?)\b/,
  )?.[1]
  return { email, phone, location, linkedIn }
}

function titleCaseWord(word: string): string {
  if (!word) return word
  if (/^(dr|mr|mrs|ms|prof)\.?$/i.test(word)) {
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase().replace(/\.$/, '') + '.'
  }
  if (word.length <= 2 && /^[a-z]\.?$/i.test(word)) {
    return word.replace(/\./, '').toUpperCase() + '.'
  }
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
}

function titleCaseName(raw: string): string {
  return raw
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(titleCaseWord)
    .join(' ')
}

function isPlausiblePersonName(name: string): boolean {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length < 2 || parts.length > 6) return false
  if (name.length < 4 || name.length > 60) return false
  if (/^(candidate|unknown|untitled|document|resume|user|admin|test)\b/i.test(name)) return false
  if (/\d{3,}/.test(name)) return false
  if (/[@/\\]/.test(name)) return false
  return parts.every((p) => /^[A-Za-z][A-Za-z'.-]*$/.test(p) || /^[A-Z]\.?$/.test(p))
}

function nameFromEmailLocal(local: string): string | null {
  const cleaned = local.replace(/\d+$/, '').replace(/^(dr|mr|ms|mrs)[._-]?/i, '')
  const parts = cleaned.split(/[._-]+/).filter((p) => p.length >= 2 && !/^\d+$/.test(p))
  if (parts.length < 2) return null
  const name = titleCaseName(parts.join(' '))
  return isPlausiblePersonName(name) ? name : null
}

function nameFromLinkedInSlug(slug: string): string | null {
  const parts = slug.replace(/\d+$/, '').split(/[-_]+/).filter((p) => p.length >= 2)
  if (parts.length < 2) return null
  const name = titleCaseName(parts.join(' '))
  return isPlausiblePersonName(name) ? name : null
}

function nameFromFilename(fileName: string): string | null {
  const cleaned = fileName
    .replace(/\.(pdf|docx?|txt|md|rtf)$/i, '')
    .replace(/[_-]/g, ' ')
    .replace(/\b(resume|cv|profile|final|draft|v\d+|copy|\d{4})\b/gi, '')
    .trim()

  const parts = cleaned.split(/\s+/).filter(Boolean)
  if (parts.length >= 2 && parts.length <= 6) {
    const name = titleCaseName(cleaned)
    if (isPlausiblePersonName(name)) return name
  }

  if (parts.length === 1 && parts[0].length >= 3 && /^[A-Za-z'-]+$/.test(parts[0])) {
    const single = titleCaseName(parts[0])
    if (!NAME_STOP_WORDS.test(single) && single.length >= 3) return single
  }

  const honorific = cleaned.match(/^(dr|mr|mrs|ms|prof)\.?\s*/i)
  const rest = honorific ? cleaned.slice(honorific[0].length).trim() : cleaned
  if (rest.length >= 8 && !rest.includes(' ')) {
    const split = rest.replace(/([a-z])([A-Z])/g, '$1 $2').split(/\s+/)
    if (split.length >= 2) {
      const name = titleCaseName(split.join(' '))
      if (isPlausiblePersonName(name)) {
        return honorific ? `${titleCaseWord(honorific[1])} ${name}` : name
      }
    }
  }

  return null
}

interface NameCandidate {
  name: string
  source: NameExtractionSource
  score: number
}

function extractNameFromText(text: string, fileNames: string[]): NameExtractionMeta {
  const candidates: NameCandidate[] = []
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)

  const email = text.match(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i)?.[0]
  if (email) {
    const fromEmail = nameFromEmailLocal(email.split('@')[0])
    if (fromEmail) candidates.push({ name: fromEmail, source: 'email', score: 88 })
  }

  const linkedIn = text.match(/linkedin\.com\/in\/([\w-]+)/i)?.[1]
  if (linkedIn) {
    const fromLi = nameFromLinkedInSlug(linkedIn)
    if (fromLi) candidates.push({ name: fromLi, source: 'linkedin', score: 82 })
  }

  const credName = text.match(
    /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,4})\s*(?:,|\s+)(?:Ph\.?\s*D|M\.?\s*Tech|B\.?\s*Tech|Email:)/im,
  )?.[1]
  if (credName) {
    const name = titleCaseName(credName)
    if (isPlausiblePersonName(name)) {
      candidates.push({ name, source: 'resume_header', score: 94 })
    }
  }

  for (const line of lines.slice(0, 25)) {
    const label = line.match(/^(?:name|full\s*name|candidate\s*name)\s*[:]\s*(.+)$/i)
    if (label) {
      const name = titleCaseName(label[1].replace(/[,|].*$/, ''))
      if (isPlausiblePersonName(name)) {
        candidates.push({ name, source: 'resume_label', score: 96 })
      }
      continue
    }

    if (NAME_STOP_WORDS.test(line.replace(/[:.].*$/, '').trim())) break
    if (/^(resume|curriculum vitae|cv)$/i.test(line)) continue
    if (/[@•|]/.test(line) && line.length > 40) continue
    if (/^[\w.+-]+@/.test(line)) continue
    if (/^\+?\d/.test(line)) continue
    if (/^(https?:|www\.)/i.test(line)) continue

    if (
      /^[A-Z][a-zA-Z''.-]+(\s+[A-Z][a-zA-Z''.-]+){1,5}$/.test(line) &&
      line.length < 60 &&
      isPlausiblePersonName(line)
    ) {
      candidates.push({ name: line.replace(/\s{2,}.*/, ''), source: 'resume_header', score: 90 })
      continue
    }

    if (
      /^[A-Z][A-Z\s.'-]{3,}$/.test(line) &&
      line.length < 55 &&
      line.split(/\s+/).length >= 2
    ) {
      const normalized = titleCaseName(line)
      if (isPlausiblePersonName(normalized)) {
        candidates.push({ name: normalized, source: 'resume_header', score: 86 })
      }
    }
  }

  for (const file of fileNames) {
    const fromFile = nameFromFilename(file)
    if (fromFile) candidates.push({ name: fromFile, source: 'filename', score: 72 })
  }

  candidates.sort((a, b) => b.score - a.score)
  const best = candidates[0]

  if (best) {
    return {
      value: best.name,
      source: best.source,
      confidence: best.score >= 88 ? 'high' : best.score >= 78 ? 'medium' : 'low',
    }
  }

  return { value: 'Candidate', source: 'default', confidence: 'low' }
}

function extractMetrics(text: string): string[] {
  const found = new Set<string>()
  const patterns = [
    /\$[\d,.]+\s*(?:million|billion|m|b|k)?/gi,
    /\d{1,3}(?:,\d{3})+\+?\s*(?:users?|customers?|employees?|citations?)/gi,
    /top\s*\d+\s*%/gi,
    /\d+\+?\s*years?\s+of\s+[a-z][\w\s]{8,40}/gi,
    /(?:having|with)\s+(\d+\+?\s*years?\s+of\s+[\w\s]{6,50})/gi,
  ]
  for (const p of patterns) {
    const matches = text.match(p)
    matches?.forEach((m) => {
      const cleaned = m.replace(/^(?:having|with)\s+/i, '').trim()
      if (cleaned.length > 6) found.add(cleaned)
    })
  }
  const yearsInSummary = text.match(/\b(\d{1,2})\+?\s*years?\s+of\s+teaching\b/i)
  if (yearsInSummary) found.add(`${yearsInSummary[1]} years of teaching`)
  return [...found].slice(0, 10)
}

function computeQuality(
  sections: ParsedResumeSection[],
  work: WorkEntry[],
  fullText: string,
  hasBinaryOnly: boolean,
): StructuredResumeProfile['extractionQuality'] {
  if (hasBinaryOnly || fullText.length < 80) return 'minimal'
  const typedSections = sections.filter((s) => s.kind !== 'header' && s.kind !== 'other').length
  if (work.length >= 2 && typedSections >= 3 && fullText.length > 800) return 'rich'
  if (typedSections >= 2 || work.length >= 1 || fullText.length > 300) return 'partial'
  return 'minimal'
}

function buildEmptyProfile(fileNames: string[]): StructuredResumeProfile {
  const nameMeta = extractNameFromText('', fileNames)
  return {
    candidateName: nameMeta.value,
    nameMeta,
    contact: {},
    workExperience: [],
    education: [],
    skills: [],
    projects: [],
    publications: [],
    patents: [],
    awards: [],
    certifications: [],
    keyMetrics: [],
    parsedSections: [],
    sectionBlocks: [],
    extractionQuality: 'minimal',
    sectionsDetected: 0,
  }
}

export function deepExtractResume(uploads: UploadedFile[]): StructuredResumeProfile {
  const fullText = uploads.map((u) => `--- ${u.name} ---\n${u.textSnippet ?? ''}`).join('\n\n')
  const fileNames = uploads.map((u) => u.name)
  const hasBinaryOnly = uploads.some((u) => isExtractionFailed(u.textSnippet))

  if (fullText.length < 80 || hasBinaryOnly) {
    return buildEmptyProfile(fileNames)
  }

  const parsedSections = splitResumeIntoSections(fullText)
  const workExperience = parseWorkFromSections(parsedSections)
  const education = parseEducationFromSections(parsedSections)
  const skills = parseSkillsFromSections(parsedSections)
  const projects = parseListFromSections(parsedSections, 'projects')
  const publications = parseListFromSections(parsedSections, 'publications')
  const patents = parseListFromSections(parsedSections, 'patents')
  const awards = parseListFromSections(parsedSections, 'awards')
  const certifications = parseListFromSections(parsedSections, 'certifications')
  const nameMeta = extractNameFromText(fullText, fileNames)

  const sectionBlocks = parsedSections.map((s) => ({
    heading: s.heading,
    content: s.content,
  }))

  return {
    candidateName: nameMeta.value,
    nameMeta,
    contact: extractContact(fullText),
    professionalSummary: findSectionSummary(parsedSections),
    workExperience,
    education,
    skills,
    projects,
    publications,
    patents,
    awards,
    certifications,
    keyMetrics: extractMetrics(fullText),
    parsedSections,
    sectionBlocks,
    sectionsDetected: parsedSections.length,
    extractionQuality: computeQuality(parsedSections, workExperience, fullText, hasBinaryOnly),
  }
}

const SECTION_KIND_LABELS: Record<string, string> = {
  header: 'Header / contact',
  summary: 'Summary',
  experience: 'Experience',
  education: 'Education',
  skills: 'Skills',
  projects: 'Projects',
  publications: 'Publications',
  patents: 'Patents',
  awards: 'Awards',
  certifications: 'Certifications',
  volunteer: 'Volunteer',
  languages: 'Languages',
  references: 'References',
  other: 'Other',
}

export function formatStructuredProfileForLlm(profile: StructuredResumeProfile): string {
  const lines: string[] = [
    '=== STRUCTURED RESUME EXTRACTION (section-wise; use as primary source of truth) ===',
    `Candidate name: ${profile.candidateName}`,
    `Name confidence: ${profile.nameMeta.confidence} (source: ${profile.nameMeta.source})`,
    `Sections detected: ${profile.sectionsDetected} · Quality: ${profile.extractionQuality}`,
  ]

  if (profile.contact.email) lines.push(`Email: ${profile.contact.email}`)
  if (profile.contact.phone) lines.push(`Phone: ${profile.contact.phone}`)
  if (profile.contact.location) lines.push(`Location: ${profile.contact.location}`)

  if (profile.parsedSections.length > 0) {
    lines.push('', '--- Section-by-section parse ---')
    for (const sec of profile.parsedSections) {
      const label = SECTION_KIND_LABELS[sec.kind] ?? sec.kind
      lines.push('', `[${label}] ${sec.heading}`)
      if (sec.items.length > 0) {
        sec.items.slice(0, 12).forEach((item) => lines.push(`  • ${item}`))
      } else if (sec.content) {
        lines.push(sec.content.slice(0, 500))
      }
    }
  }

  if (profile.professionalSummary) {
    lines.push('', 'Professional summary (consolidated):', profile.professionalSummary.slice(0, 600))
  }

  if (profile.workExperience.length > 0) {
    lines.push('', 'Work experience (structured):')
    profile.workExperience.forEach((w, i) => {
      lines.push(`${i + 1}. ${w.title} @ ${w.company}${w.period ? ` (${w.period})` : ''}`)
      w.highlights.forEach((h) => lines.push(`   - ${h}`))
    })
  }

  if (profile.education.length > 0) {
    lines.push('', 'Education (structured):')
    profile.education.forEach((e) => {
      lines.push(`- ${e.degree ? `${e.degree}, ` : ''}${e.institution}${e.period ? ` (${e.period})` : ''}`)
    })
  }

  if (profile.skills.length > 0) lines.push('', `Skills: ${profile.skills.join(', ')}`)
  if (profile.projects.length > 0) {
    lines.push('', 'Projects:', ...profile.projects.map((p) => `- ${p}`))
  }
  if (profile.publications.length > 0) {
    lines.push('', 'Publications:', ...profile.publications.map((p) => `- ${p}`))
  }
  if (profile.patents.length > 0) lines.push('', 'Patents:', ...profile.patents.map((p) => `- ${p}`))
  if (profile.awards.length > 0) lines.push('', 'Awards:', ...profile.awards.map((a) => `- ${a}`))
  if (profile.keyMetrics.length > 0) {
    lines.push('', `Quantified metrics: ${profile.keyMetrics.join('; ')}`)
  }

  return lines.join('\n')
}
