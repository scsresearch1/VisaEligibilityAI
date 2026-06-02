/**
 * Official RM USA Works eligibility rules — sourced from:
 * EB1A_Eligibility_With_Logo.pdf, EB1B_Eligibility_With_Logo.pdf, EB1C_Eligibility_With_Logo.pdf
 */
import type { VisaCategory, VisaCriterion } from '../types/assessment'

export const ELIGIBILITY_SOURCE = {
  EB1A: 'RM USA Works — EB1A Eligibility Requirements & Document Checklist',
  EB1B: 'RM USA Works — EB1B Eligibility Requirements & Document Checklist',
  EB1C: 'RM USA Works — EB1C Eligibility Requirements & Document Checklist',
} as const

export const VISA_CATEGORY_INFO = {
  EB1A: {
    title: 'EB-1A — Extraordinary Ability',
    subtitle:
      'Sustained national or international acclaim; generally at least 3 of 12 eligibility criteria with strong documentation',
    minCriteria: 3,
    totalCriteria: 12,
    regulatoryBasis: 'Employment-Based First Preference – Extraordinary Ability',
  },
  EB1B: {
    title: 'EB-1B — Outstanding Professors and Researchers',
    subtitle:
      'Internationally recognized in an academic field; at least 2 of 6 criteria, employer sponsorship, and typically 3+ years teaching/research',
    minCriteria: 2,
    totalCriteria: 6,
    regulatoryBasis: 'Employment-Based First Preference – Outstanding Professors and Researchers',
  },
  EB1C: {
    title: 'EB-1C — Multinational Manager or Executive',
    subtitle:
      'Transfer to a related U.S. company in a managerial or executive capacity with qualifying corporate relationship',
    minCriteria: 4,
    totalCriteria: 4,
    regulatoryBasis: 'Employment-Based First Preference – Multinational Manager or Executive',
  },
} as const

/** RM official eligibility criteria (S.No. from PDF checklists) */
export const VISA_CRITERIA: VisaCriterion[] = [
  // EB-1A — 12 criteria; satisfy at least 3
  {
    id: 'eb1a-1',
    category: 'EB1A',
    code: '1',
    title: 'Nationally or internationally recognized awards or honors',
    description:
      'Receipt of nationally or internationally recognized awards or honors for excellence in the field of expertise.',
  },
  {
    id: 'eb1a-2',
    category: 'EB1A',
    code: '2',
    title: 'Membership in associations requiring outstanding achievements',
    description:
      'Membership in professional associations that require outstanding achievements as judged by recognized experts in the field.',
  },
  {
    id: 'eb1a-3',
    category: 'EB1A',
    code: '3',
    title: 'Published articles or media coverage',
    description:
      'Published articles, media coverage, or professional publications featuring the applicant’s work, achievements, or contributions. Include publication title, date, author, and translations if applicable.',
  },
  {
    id: 'eb1a-4',
    category: 'EB1A',
    code: '4',
    title: 'Judge, reviewer, panelist, or evaluator',
    description:
      'Participation as a judge, reviewer, panelist, or evaluator of the work of others in the same or related field.',
  },
  {
    id: 'eb1a-5',
    category: 'EB1A',
    code: '5',
    title: 'Original contributions of major significance',
    description:
      'Evidence of original scientific, scholarly, artistic, athletic, or business-related contributions of major significance to the field.',
  },
  {
    id: 'eb1a-6',
    category: 'EB1A',
    code: '6',
    title: 'Authorship of scholarly articles or publications',
    description:
      'Authorship of scholarly articles, research papers, journals, or publications in professional or major trade media.',
  },
  {
    id: 'eb1a-7',
    category: 'EB1A',
    code: '7',
    title: 'Display or exhibition at recognized events',
    description:
      'Display or exhibition of work at recognized artistic exhibitions, showcases, conferences, or industry events.',
  },
  {
    id: 'eb1a-8',
    category: 'EB1A',
    code: '8',
    title: 'Leading, critical, or essential role',
    description:
      'Evidence of serving in a leading, critical, or essential role for organizations or establishments with distinguished reputations.',
  },
  {
    id: 'eb1a-9',
    category: 'EB1A',
    code: '9',
    title: 'High salary or remuneration',
    description:
      'Proof of commanding a high salary, remuneration, or compensation significantly higher than others in the same field.',
  },
  {
    id: 'eb1a-10',
    category: 'EB1A',
    code: '10',
    title: 'Commercial success in performing arts',
    description:
      'Evidence of commercial success in the performing arts, such as box office receipts, sales records, streaming data, or related achievements.',
  },
  {
    id: 'eb1a-11',
    category: 'EB1A',
    code: '11',
    title: 'Sustained national or international recognition',
    description:
      'Demonstrated sustained national or international recognition for accomplishments and expertise in the field.',
  },
  {
    id: 'eb1a-12',
    category: 'EB1A',
    code: '12',
    title: 'Top of field of endeavor',
    description:
      'Evidence showing the applicant belongs to a small percentage of professionals who have risen to the top of their field of endeavor.',
  },
  // EB-1B — 6 criteria; satisfy at least 2
  {
    id: 'eb1b-1',
    category: 'EB1B',
    code: '1',
    title: 'Major prizes, awards, or honors',
    description:
      'Evidence of receipt of major prizes, awards, or honors recognizing outstanding achievements in the academic or research field.',
  },
  {
    id: 'eb1b-2',
    category: 'EB1B',
    code: '2',
    title: 'Membership requiring outstanding accomplishments',
    description:
      'Membership in professional associations that require outstanding accomplishments or achievements for membership.',
  },
  {
    id: 'eb1b-3',
    category: 'EB1B',
    code: '3',
    title: 'Published material by others about applicant',
    description:
      'Published material in professional publications, academic journals, or major media written by others about the applicant’s work and contributions in the field.',
  },
  {
    id: 'eb1b-4',
    category: 'EB1B',
    code: '4',
    title: 'Judge, peer reviewer, or panel member',
    description:
      'Participation as a judge, reviewer, peer reviewer, panel member, or evaluator of the work of others in the same or related academic field.',
  },
  {
    id: 'eb1b-5',
    category: 'EB1B',
    code: '5',
    title: 'Original research contributions with significant impact',
    description:
      'Evidence of original scientific, scholarly, or research contributions that have significantly impacted the field.',
  },
  {
    id: 'eb1b-6',
    category: 'EB1B',
    code: '6',
    title: 'Authorship of scholarly books or articles',
    description:
      'Authorship of scholarly books, research papers, or articles published in professional or internationally recognized academic journals.',
  },
  // EB-1C — 4 managerial/executive duty requirements (RM checklist)
  {
    id: 'eb1c-1',
    category: 'EB1C',
    code: '1',
    title: 'Manages organization, department, or essential function',
    description:
      'Manages the organization, department, component, or an essential function of the company.',
  },
  {
    id: 'eb1c-2',
    category: 'EB1C',
    code: '2',
    title: 'Supervises managerial or professional employees',
    description:
      'Supervises and controls the work of supervisory, professional, or managerial employees, or manages an essential function within the organization or a department/subdivision.',
  },
  {
    id: 'eb1c-3',
    category: 'EB1C',
    code: '3',
    title: 'Personnel authority',
    description:
      'Has the authority to hire, terminate, promote, and make other personnel decisions.',
  },
  {
    id: 'eb1c-4',
    category: 'EB1C',
    code: '4',
    title: 'Day-to-day operational discretion',
    description:
      'Exercises discretion over the day-to-day operations and decision-making of the activity or function under management.',
  },
]

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
    'Meeting the minimum criteria does not guarantee approval.',
    'Strong documentation and proper presentation of achievements are critical.',
    'USCIS evaluates the overall impact, recognition, and significance of the applicant’s contributions.',
    'Final eligibility is determined after detailed profile evaluation by the legal and immigration team.',
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
    '=== OFFICIAL U.S. EB-1 PATHWAY ELIGIBILITY CRITERIA (authoritative for this assessment) ===',
  ]

  for (const cat of categories) {
    const info = VISA_CATEGORY_INFO[cat]
    const criteria = VISA_CRITERIA.filter((c) => c.category === cat)
    sections.push(
      `\n## ${info.title}`,
      `Source: ${ELIGIBILITY_SOURCE[cat]}`,
      `Summary: ${info.subtitle}`,
      `\nEligibility requirements (S.No.):`,
      ...criteria.map(
        (c) => `${c.code}. ${c.title} — ${c.description}`,
      ),
      `\nMinimum threshold: ${info.minCriteria} of ${info.totalCriteria} criteria (where applicable), plus strong supporting documentation.`,
      `\nCommon supporting documents:`,
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
    '\nWhen generating insights, use these official criterion titles in categoryOfficialName and cite RM checklist / USCIS logic in sourceStrategicBasis.',
  )

  return sections.join('\n')
}
