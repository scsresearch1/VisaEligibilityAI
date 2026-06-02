/**
 * Official pathway eligibility rules — RM checklist structure cross-walked to
 * INA §203(b)(1) and 8 CFR §204.5 (USCIS extraordinary ability / outstanding researcher / multinational manager).
 * RM PDFs inform document checklists; regulatory text governs criterion meaning.
 */
import type { VisaCategory } from '../types/assessment'
import { VISA_CRITERIA } from './eligibility-criteria'
import { PATHWAY_LEGAL_FRAMEWORK } from './pathway-framework'

export { VISA_CRITERIA }

export const ELIGIBILITY_SOURCE = {
  EB1A:
    'USCIS EB-1A (8 CFR §204.5(h)) · cross-walk RM EB1A checklist',
  EB1B:
    'USCIS EB-1B (8 CFR §204.5(i)) · cross-walk RM EB1B checklist',
  EB1C:
    'USCIS EB-1C (8 CFR §204.5(j)) · cross-walk RM EB1C checklist',
} as const

export const VISA_CATEGORY_INFO = {
  EB1A: {
    title: 'EB-1A — Extraordinary Ability',
    subtitle:
      'Extraordinary ability with sustained acclaim; regulatory minimum 3 of 10 criteria at 8 CFR §204.5(h)(3), then final merits review (items 11–12 below)',
    minCriteria: 3,
    totalCriteria: 12,
    regulatoryBasis: 'Employment-Based First Preference – Extraordinary Ability',
  },
  EB1B: {
    title: 'EB-1B — Outstanding Professors and Researchers',
    subtitle:
      'Internationally recognized outstanding researcher; minimum 2 of 6 criteria at 8 CFR §204.5(i)(3), permanent job offer, 3+ years teaching/research',
    minCriteria: 2,
    totalCriteria: 6,
    regulatoryBasis: 'Employment-Based First Preference – Outstanding Professors and Researchers',
  },
  EB1C: {
    title: 'EB-1C — Multinational Manager or Executive',
    subtitle:
      'Multinational manager/executive; all 4 duty elements at 8 CFR §204.5(j), 1 year foreign employment in 3 years, qualifying relationship',
    minCriteria: 4,
    totalCriteria: 4,
    regulatoryBasis: 'Employment-Based First Preference – Multinational Manager or Executive',
  },
} as const

export interface EligibilityDocumentItem {
  label: string
  uploadHint?: string
}

export const COMMON_SUPPORTING_DOCUMENTS: Record<VisaCategory, EligibilityDocumentItem[]> = {
  EB1A: [
    { label: 'Updated Resume / Curriculum Vitae (CV)', uploadHint: 'resume' },
    { label: 'Passport Copy', uploadHint: 'other' },
    { label: 'Educational Certificates', uploadHint: 'other' },
    { label: 'Employment Experience Letters', uploadHint: 'experience_letter' },
    { label: 'Recommendation / Reference Letters', uploadHint: 'recommendation' },
    { label: 'Awards & Recognition Certificates', uploadHint: 'award' },
    { label: 'Membership Certificates', uploadHint: 'award' },
    { label: 'Published Articles / Media Coverage', uploadHint: 'publication' },
    { label: 'Research Papers / Journals', uploadHint: 'publication' },
    { label: 'Salary Slips / Tax Returns / Compensation Proof', uploadHint: 'salary_proof' },
    { label: 'Judging or Reviewing Invitations / Certificates', uploadHint: 'other' },
    { label: 'Evidence of Leadership or Critical Role', uploadHint: 'experience_letter' },
    { label: 'Conference Participation Certificates', uploadHint: 'other' },
    { label: 'Patents, Innovations, or Project Contributions', uploadHint: 'patent' },
    { label: 'Business Achievements / Revenue Records (if applicable)', uploadHint: 'company_doc' },
  ],
  EB1B: [
    { label: 'Updated Curriculum Vitae (CV) / Resume', uploadHint: 'resume' },
    { label: 'Passport Copy', uploadHint: 'other' },
    { label: 'Educational Certificates & Transcripts', uploadHint: 'other' },
    { label: 'Employment Verification Letters', uploadHint: 'experience_letter' },
    { label: 'Research Experience Letters', uploadHint: 'experience_letter' },
    { label: 'Recommendation / Reference Letters from Experts', uploadHint: 'recommendation' },
    { label: 'Awards & Recognition Certificates', uploadHint: 'award' },
    { label: 'Membership Certificates', uploadHint: 'award' },
    { label: 'Published Research Papers & Journals', uploadHint: 'publication' },
    { label: 'Citation Reports & Google Scholar Profile', uploadHint: 'publication' },
    { label: 'Peer Review or Judging Evidence', uploadHint: 'other' },
    { label: 'Conference Presentation Certificates', uploadHint: 'other' },
    { label: 'Patents, Research Projects, or Innovations', uploadHint: 'patent' },
    { label: 'Evidence of International Recognition', uploadHint: 'other' },
    { label: 'Employer Sponsorship Letter', uploadHint: 'experience_letter' },
    { label: 'Permanent Job Offer / Employment Contract', uploadHint: 'company_doc' },
  ],
  EB1C: [
    { label: 'Updated Resume / Curriculum Vitae (CV)', uploadHint: 'resume' },
    { label: 'Passport Copy', uploadHint: 'other' },
    { label: 'Employment Verification Letters', uploadHint: 'experience_letter' },
    { label: 'Organizational Chart', uploadHint: 'company_doc' },
    { label: 'Job Description and Managerial Responsibilities', uploadHint: 'experience_letter' },
    { label: 'Evidence of Executive or Managerial Role', uploadHint: 'experience_letter' },
    { label: 'Salary Slips / Tax Documents', uploadHint: 'salary_proof' },
    { label: 'Business Registration & Incorporation Documents', uploadHint: 'company_doc' },
    { label: 'Offer Letter from U.S. Employer', uploadHint: 'company_doc' },
    { label: 'Evidence of Relationship Between Foreign and U.S. Company', uploadHint: 'company_doc' },
    { label: 'Company Financial Statements / Annual Reports', uploadHint: 'company_doc' },
    { label: 'Reporting Structure & Team Details', uploadHint: 'company_doc' },
    { label: 'Lease Agreement / Office Documents (if applicable)', uploadHint: 'company_doc' },
    { label: 'Any Other Supporting Documents', uploadHint: 'other' },
  ],
}

export const IMPORTANT_NOTES: Record<VisaCategory, string[]> = {
  EB1A: [
    'Regulatory minimum: 3 of 10 criteria at 8 CFR §204.5(h)(3); USCIS then applies final merits (sustained acclaim, top of field) — meeting 3 criteria alone is not sufficient.',
    'Evidence must be documentary and verifiable; resume marketing language without exhibits is insufficient.',
    'Comparable evidence may apply only where standard criteria do not readily fit the occupation — not as a shortcut around weak criteria.',
    'This assessment scores profile facts only; approval is determined by USCIS and qualified immigration counsel.',
  ],
  EB1B: [
    'EB-1B requires sponsorship from a U.S. employer or research institution.',
    'Applicants must generally demonstrate at least 3 years of teaching or research experience in the academic field.',
    'Strong research contributions, publications, citations, and peer recognition significantly strengthen the case.',
    'Final eligibility is determined after detailed evaluation by the immigration attorney and legal team.',
  ],
  EB1C: [
    'The applicant must generally have worked for the foreign company for at least 1 year within the last 3 years.',
    'The U.S. employer and foreign company must have a qualifying relationship (parent, subsidiary, affiliate, or branch).',
    'The offered U.S. position must be managerial or executive in nature.',
    'EB-1C requires sponsorship from a qualifying U.S. employer.',
    'Final eligibility is determined after detailed evaluation by the immigration attorney and legal team.',
  ],
}

/** EB-1C program-level requirements (from Important Notes — evaluated alongside the 4 duty criteria) */
export const EB1C_PROGRAM_REQUIREMENTS = [
  'Qualifying relationship between U.S. and foreign entity (parent, subsidiary, affiliate, or branch)',
  'At least 1 year employment with foreign company within the last 3 years',
  'U.S. position is managerial or executive in nature',
  'Sponsorship from qualifying U.S. employer',
] as const

export function buildEligibilityRulesPrompt(categories: VisaCategory[]): string {
  const sections: string[] = [
    '=== OFFICIAL U.S. EB-1 PATHWAY ELIGIBILITY CRITERIA (USCIS / INA-aligned — authoritative for this assessment) ===',
    'NO ASSUMPTIONS: Map only facts present in uploaded profile materials. If a requirement is not documented, state missing/unsupported — do not infer awards, publications, salary, multinational structure, or roles.',
  ]

  for (const cat of categories) {
    const info = VISA_CATEGORY_INFO[cat]
    const framework = PATHWAY_LEGAL_FRAMEWORK[cat]
    const criteria = VISA_CRITERIA.filter((c) => c.category === cat)
    sections.push(
      `\n## ${info.title}`,
      `Source: ${ELIGIBILITY_SOURCE[cat]}`,
      `Regulatory anchor: ${framework.regulatoryAnchor}`,
      `Overall standard: ${framework.overallStandard}`,
      `Threshold: ${framework.thresholdRule}`,
      `Final merits: ${framework.finalMeritsNote}`,
      `Summary: ${info.subtitle}`,
      `\nEligibility requirements (numbered checklist):`,
      ...criteria.flatMap((c) => {
        const lines = [
          `${c.code}. ${c.title}`,
          `   Requirement: ${c.description}`,
        ]
        if (c.regulatoryCitation) lines.push(`   Regulation: ${c.regulatoryCitation}`)
        if (c.evidenceStandard) lines.push(`   Evidence must show: ${c.evidenceStandard}`)
        if (c.evaluationCaution) lines.push(`   Caution: ${c.evaluationCaution}`)
        return lines
      }),
      `\nMinimum threshold: ${info.minCriteria} of ${info.totalCriteria} numbered items where applicable, plus documented exhibits — not resume marketing language alone.`,
      `\nAssessment discipline:`,
      ...framework.assessmentDiscipline.map((d) => `• ${d}`),
      `\nCommon supporting documents (RM checklist — collect/build as applicable):`,
      ...COMMON_SUPPORTING_DOCUMENTS[cat].map((d) => `• ${d.label}`),
      `\nImportant notes:`,
      ...IMPORTANT_NOTES[cat].map((n) => `• ${n}`),
    )
    if (cat === 'EB1C') {
      sections.push(
        '\nAdditional EB-1C program requirements:',
        ...EB1C_PROGRAM_REQUIREMENTS.map((r) => `• ${r}`),
      )
    }
  }

  sections.push(
    '\nUse official criterion titles in categoryOfficialName. In sourceStrategicBasis and regulatoryBasis, cite the regulation line above and tie to specific profile facts only — never generic templates or assumed credentials.',
  )

  return sections.join('\n')
}
