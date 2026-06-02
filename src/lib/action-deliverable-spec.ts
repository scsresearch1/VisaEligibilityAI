import type { ExtractedProfileSignals } from './benchmark-report/extract-profile'
import { primaryFieldForDeliverables } from './profile-field-inference'

export type DeliverableKind =
  | 'publications'
  | 'patents'
  | 'product'
  | 'whitepaper'
  | 'media'
  | 'speaking'
  | 'judging'
  | 'case_study'
  | 'documentation'
  | 'visibility'
  | 'general'

export interface ActionDeliverableSpec {
  kind: DeliverableKind
  suggestedTitles?: string[]
  outline?: string
  domain?: string
}

const AREA_KIND: Record<string, DeliverableKind> = {
  'br-pub': 'publications',
  'br-patent': 'patents',
  'br-product': 'product',
  'br-whitepaper': 'whitepaper',
  'br-articles': 'media',
  'br-speaking': 'speaking',
  'br-judging': 'judging',
  'br-expert': 'general',
  'br-case': 'case_study',
  'br-proddoc': 'documentation',
  'br-visibility': 'visibility',
}

function primaryDomain(profile: ExtractedProfileSignals): string {
  return primaryFieldForDeliverables(profile.domains, profile.fullText)
}

function personLabel(profile: ExtractedProfileSignals): string {
  const n = profile.candidateName?.trim()
  if (n && !/^candidate$/i.test(n)) return n.split(/\s+/)[0] ?? n
  return 'the candidate'
}

function secondaryTopic(profile: ExtractedProfileSignals): string {
  const job = profile.workExperience[0]
  if (job?.highlights[0]) return job.highlights[0].slice(0, 80)
  if (profile.education[0]?.degree) return profile.education[0].degree.slice(0, 80)
  if (profile.projects[0]) return profile.projects[0].slice(0, 80)
  const claim = profile.keyClaims.find((c) => c.length > 30)
  if (claim) return claim.slice(0, 80)
  return 'documented engineering and teaching contributions'
}

function employerContext(profile: ExtractedProfileSignals): string {
  const job = profile.workExperience[0]
  if (!job) return 'engineering college practice'
  return `${job.title} at ${job.company}`.slice(0, 60)
}

function isAcademicEngineeringProfile(profile: ExtractedProfileSignals): boolean {
  const field = primaryDomain(profile)
  return /electrical|power|higher education|engineering teaching|academic research/i.test(field)
}

function buildPublicationTitles(profile: ExtractedProfileSignals, count: number): string[] {
  const domain = primaryDomain(profile)
  const topic = secondaryTopic(profile)
  const role = profile.workExperience[0]?.title ?? 'faculty researcher'

  if (isAcademicEngineeringProfile(profile)) {
    return [
      `${domain}: Pedagogical and applied methods for ${topic.toLowerCase()}`,
      `Peer-reviewed study on power electronics instruction and laboratory practice`,
      `Renewable-energy project outcomes from supervised student engineering work`,
      `Conference-ready paper on ${role}-led curriculum innovation in ${domain}`,
    ].slice(0, Math.max(1, Math.min(count, 4)))
  }

  const templates = [
    `${domain}: Evidence-based methods for ${topic.toLowerCase()}`,
    `Advancing ${domain} through applied work in ${employerContext(profile)}`,
    `A structured framework for ${topic.toLowerCase()} in ${domain}`,
    `Measuring impact of ${role}-led initiatives in ${domain}`,
  ]
  return templates.slice(0, Math.max(1, Math.min(count, templates.length)))
}

function buildPatentOutline(profile: ExtractedProfileSignals): string {
  const domain = primaryDomain(profile)
  const topic = secondaryTopic(profile)
  const job = profile.workExperience[0]
  return [
    `Provisional filing covering a novel method/system in ${domain} derived from ${job ? `${job.title} responsibilities` : 'documented R&D'}.`,
    `Claims map to ${topic.toLowerCase()}; include architecture diagrams, use cases, and differentiation vs. prior art in the same field.`,
    `Supporting exhibits: invention disclosure, reduction-to-practice notes, and expert declaration tying the invention to the candidate’s role.`,
  ].join(' ')
}

function buildProductOutline(profile: ExtractedProfileSignals): string {
  const domain = primaryDomain(profile)
  const topic = secondaryTopic(profile)
  if (isAcademicEngineeringProfile(profile)) {
    return [
      `Build a verifiable renewable-energy or power-electronics demonstrator aligned with ${domain} (hardware prototype, simulation package, or audited lab kit).`,
      `Scope: ${topic} — document design, test data, student/project outcomes, and third-party or departmental validation.`,
      `Package with photos, test reports, and a technical narrative suitable for original-contribution evidence.`,
    ].join(' ')
  }
  return [
    `Ship a demonstrable artifact in ${domain} (prototype, production module, or audited codebase) that external reviewers can evaluate.`,
    `Scope: ${topic} — document architecture, user/stakeholder outcomes, and metrics (performance, adoption, or revenue impact where verifiable).`,
    `Package with validation report, release notes, and third-party or internal audit trail suitable for EB-1 original-contribution evidence.`,
  ].join(' ')
}

function buildWhitepaperTitles(profile: ExtractedProfileSignals, count: number): string[] {
  const domain = primaryDomain(profile)
  if (isAcademicEngineeringProfile(profile)) {
    return [
      `Curriculum framework for ${domain} laboratory instruction`,
      `Technical white paper — ${secondaryTopic(profile).slice(0, 50)}`,
      `Outcome-based accreditation narrative for engineering programs in ${domain}`,
    ].slice(0, count)
  }
  return [
    `${domain} maturity model: A consulting-grade framework`,
    `Technical white paper — ${secondaryTopic(profile).slice(0, 50)}`,
    `Reference architecture for ${domain} at enterprise scale`,
  ].slice(0, count)
}

function buildMediaTitles(profile: ExtractedProfileSignals, count: number): string[] {
  const domain = primaryDomain(profile)
  const name = personLabel(profile)
  const year = new Date().getFullYear()

  if (isAcademicEngineeringProfile(profile)) {
    return [
      `Faculty spotlight: How ${name} advances ${domain}`,
      `Expert commentary — power electronics, renewable energy, and engineering education (${year})`,
      `Profile interview: ${name} on doctoral research and leadership in engineering colleges`,
    ].slice(0, count)
  }

  return [
    `Industry feature: How ${name} is advancing ${domain}`,
    `Expert commentary — trends in ${domain} (${year})`,
    `Profile piece: Leadership and innovation in ${domain}`,
  ].slice(0, count)
}

function buildSpeakingOutline(profile: ExtractedProfileSignals): string {
  const domain = primaryDomain(profile)
  if (isAcademicEngineeringProfile(profile)) {
    return [
      `Secure a ${domain}-aligned guest lecture, faculty development program, or IEEE-style symposium slot with published agenda.`,
      `Topic anchored to ${secondaryTopic(profile).toLowerCase()}; target university symposium, engineering summit, or accredited webinar with recording.`,
      `Deliverables: invitation letter, event program bio, slides, and organizer attestation.`,
    ].join(' ')
  }
  return [
    `Secure ${domain}-aligned keynote, panel, or guest lecture with published agenda and attendance proof.`,
    `Topic anchored to ${secondaryTopic(profile).toLowerCase()}; target tier-1 conference, university symposium, or industry webinar with recording.`,
    `Deliverables: invitation letter, event program bio, slides, and post-event certificate or organizer attestation.`,
  ].join(' ')
}

function buildJudgingOutline(profile: ExtractedProfileSignals): string {
  const domain = primaryDomain(profile)
  return [
    `Document legitimate peer-review, external examiner, or competition judging role with formal appointment letter.`,
    `Include scope of review (papers, grants, or competition entries), dates, and organizer contact for verification.`,
    `Prefer roles in ${domain} or closely related technical fields.`,
  ].join(' ')
}

function buildCaseStudyOutline(profile: ExtractedProfileSignals): string {
  const domain = primaryDomain(profile)
  return [
    `Sanitized technical case study in ${domain}: problem, your role, technical approach, and measurable outcome.`,
    `Redact client-identifying data; include architecture diagrams, timelines, and before/after metrics.`,
    `Tie narrative to ${employerContext(profile)} and ${secondaryTopic(profile).toLowerCase()}.`,
  ].join(' ')
}

export function buildDeliverableSpec(
  areaRowId: string,
  profile: ExtractedProfileSignals,
  quantityToBuild: number,
): ActionDeliverableSpec | undefined {
  const kind = AREA_KIND[areaRowId] ?? 'general'
  const qty = Math.max(1, quantityToBuild)
  const domain = primaryDomain(profile)

  switch (kind) {
    case 'publications':
      return { kind, domain, suggestedTitles: buildPublicationTitles(profile, qty) }
    case 'patents':
      return { kind, domain, outline: buildPatentOutline(profile) }
    case 'product':
      return { kind, domain, outline: buildProductOutline(profile) }
    case 'whitepaper':
      return {
        kind,
        domain,
        suggestedTitles: buildWhitepaperTitles(profile, qty),
        outline: `Author ${qty} structured white paper(s) in ${domain} with diagrams, citations, and executive summary suitable for counsel review.`,
      }
    case 'media':
      return {
        kind,
        domain,
        suggestedTitles: buildMediaTitles(profile, qty),
        outline: `Place ${qty} third-party article(s) or interviews in ${domain}; retain full publication PDFs and circulation/readership data.`,
      }
    case 'speaking':
      return { kind, domain, outline: buildSpeakingOutline(profile) }
    case 'judging':
      return { kind, domain, outline: buildJudgingOutline(profile) }
    case 'case_study':
      return { kind, domain, outline: buildCaseStudyOutline(profile) }
    case 'documentation':
      return {
        kind,
        domain,
        outline: `Produce ${qty} validation/architecture document(s) for built artifacts in ${domain}, including test results and reviewer sign-off.`,
      }
    case 'visibility':
      return {
        kind,
        domain,
        outline: `Execute ${qty} visibility actions: Google Scholar/ORCID profile, conference listings, and syndicated summaries in ${domain}.`,
      }
    default:
      return {
        kind: 'general',
        domain,
        outline: `Build ${qty} criterion-aligned evidence asset(s) in ${domain} with external verification.`,
      }
  }
}

export function formatDeliverableSpecForText(spec: ActionDeliverableSpec): string[] {
  const lines: string[] = []
  if (spec.domain) lines.push(`Domain: ${spec.domain}`)
  if (spec.suggestedTitles?.length) {
    lines.push('Suggested titles:')
    spec.suggestedTitles.forEach((t, i) => lines.push(`  ${i + 1}. ${t}`))
  }
  if (spec.outline) lines.push(`Outline: ${spec.outline}`)
  return lines
}
