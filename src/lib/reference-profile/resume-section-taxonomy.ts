import type { AssessmentState } from '../../types/assessment'
import type { ExtractedProfileSignals } from '../benchmark-report/extract-profile'
import { primaryFieldLabel } from '../benchmark-report/extract-profile'
import type { ResumeSectionTaxonomy } from './types'

function uniqueEmployers(profile: ExtractedProfileSignals): string[] {
  const names = new Set<string>()
  for (const w of profile.workExperience) {
    if (w.company?.trim()) names.add(w.company.trim())
    for (const h of w.highlights) {
      const client = h.match(/(?:@|for)\s+([A-Z][A-Za-z0-9\s&.]+?)(?:\s*[,.]|$)/)?.[1]
      if (client) names.add(client.trim())
    }
  }
  const textClients = profile.fullText.match(
    /\b(Conagra|PwC|Microsoft|TIBCO|Nestl[eé]|Genpact|Ameren|Altice|Adecco|GE)\b/gi,
  )
  textClients?.forEach((c) => names.add(c))
  return [...names].slice(0, 14)
}

export function buildResumeSectionTaxonomy(
  profile: ExtractedProfileSignals,
  state?: Pick<AssessmentState, 'structuredProfile' | 'parsedAchievements'>,
): ResumeSectionTaxonomy {
  const sp = state?.structuredProfile
  const fullText = profile.fullText

  const conferenceOrWorkshop =
    (sp?.parsedSections ?? []).filter((s) =>
      /workshop|conference|symposium|presentation|seminar/i.test(s.heading),
    ).length +
    (fullText.match(/\b(workshop|conference|symposium|invited talk)\b/gi)?.length ?? 0)

  const leadershipSignals = profile.workExperience.filter((w) =>
    /lead|manager|director|head|chief|architect|principal/i.test(w.title),
  ).length

  const managerialSignals = profile.workExperience.filter((w) =>
    /manager|director|vp|head|integration director|program manager/i.test(w.title),
  ).length

  const researchSignals =
    profile.publications.length +
    profile.patents.length +
    (profile.education.some((e) => /ph\.?\s*d|research/i.test(e.degree ?? '')) ? 1 : 0)

  const productOrProject =
    profile.projects.length +
    profile.workExperience.filter((w) =>
      /product|platform|prototype|infrastructure|edi|globe/i.test(
        `${w.title} ${w.highlights.join(' ')}`,
      ),
    ).length

  return {
    sectionsDetected: sp?.sectionsDetected ?? sp?.parsedSections?.length ?? 0,
    workExperienceEntries: profile.workExperience.length,
    educationEntries: profile.education.length,
    publicationEntries: profile.publications.length,
    patentEntries: profile.patents.length,
    productOrProjectEntries: Math.max(productOrProject, profile.projects.length),
    certificationEntries: profile.certifications.length,
    awardEntries: profile.awards.length,
    conferenceOrWorkshopEntries: Math.min(12, conferenceOrWorkshop),
    parsedAchievements: state?.parsedAchievements?.length ?? 0,
    skillsDetected: profile.skills.length,
    leadershipSignals,
    managerialSignals,
    researchSignals,
    employersAndClients: uniqueEmployers(profile),
    sectionHeadings: (sp?.parsedSections ?? []).map((s) => s.heading).slice(0, 8),
    inferredDomain: primaryFieldLabel(profile.domains, profile.fullText),
  }
}
