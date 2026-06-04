import type { ExtractedProfileSignals } from '../benchmark-report/extract-profile'
import { primaryFieldLabel } from '../profile-field-inference'
import { detectProfileArchetype } from './profile-archetype'

export interface PositioningThemeRow {
  theme: string
  interpretation: string
}

export function buildPositioningThemeTable(
  profile: ExtractedProfileSignals,
): PositioningThemeRow[] {
  const archetype = detectProfileArchetype(profile)
  const field = primaryFieldLabel(profile.domains, profile.fullText)
  const themes: PositioningThemeRow[] = []

  if (archetype === 'industry_senior') {
    if (/repo|tibco|rv/i.test(profile.fullText)) {
      themes.push({
        theme: 'Enterprise integration innovation',
        interpretation:
          'RepoDiff / TIBCO RV association provides strongest original-contribution theme if converted into modern product, patent, paper, and validation evidence.',
      })
    }
    themes.push({
      theme: 'API-led and cloud modernization',
      interpretation:
        'MuleSoft, SAP S/4HANA, Oracle ERP, and hybrid-cloud work support papers and white papers on integration governance.',
    })
    themes.push({
      theme: 'Global infrastructure architecture',
      interpretation:
        'Large-scale EDI / GDC / ERP programs support critical-role and case-study narratives with sanitized client proof.',
    })
    if (/\$[\d,.]+\s*m|gtm|contracts/i.test(profile.fullText)) {
      themes.push({
        theme: 'Commercial technology impact',
        interpretation:
          'GTM and contract-scale claims support business impact but require verification or sanitized case studies.',
      })
    }
  } else if (archetype === 'research_phd') {
    themes.push({
      theme: 'Original scientific contribution',
      interpretation: `PhD-level work in ${field} — convert dissertation themes into indexed publications and patent filings.`,
    })
    themes.push({
      theme: 'Patent and product pipeline',
      interpretation:
        'Existing patent/design claims should be documented with enablement drafts and validation reports.',
    })
    themes.push({
      theme: 'US sponsor and citation visibility',
      interpretation:
        'Strengthen SCOPUS/SCI indexing, citations, and employer sponsorship narrative for EB-1B conditional filing.',
    })
  } else if (archetype === 'academic_teaching') {
    themes.push({
      theme: 'Engineering education leadership',
      interpretation:
        'HOD, examiner, and teaching longevity support critical-role positioning — not awards criterion by itself.',
    })
    themes.push({
      theme: 'Laboratory and curriculum innovation',
      interpretation: `Power electronics / renewable energy lab work in ${field} — build demonstrators and indexed papers.`,
    })
    themes.push({
      theme: 'External recognition gap',
      interpretation:
        'Competitions and attendance certificates must be replaced with judging, speaking, and selective honors.',
    })
  } else {
    themes.push({
      theme: 'Technical leadership',
      interpretation: `Documented roles in ${field} require third-party articles, speaking, and expert letters.`,
    })
  }

  themes.push({
    theme: 'External recognition gap',
    interpretation:
      'Profile lacks sufficient public evidence: patents, indexed publications, independent media, judging roles, and invited talks.',
  })

  return themes.slice(0, 5)
}

export function positioningThemesAsStrings(profile: ExtractedProfileSignals): string[] {
  return buildPositioningThemeTable(profile).map((t) => `${t.theme}: ${t.interpretation}`)
}

export { archetypeLabel } from './profile-archetype'
