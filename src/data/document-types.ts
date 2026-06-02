import type { DocumentCategory } from '../types/assessment'

export const DOCUMENT_CATEGORIES: {
  id: DocumentCategory
  label: string
  description: string
  checksAvailability: boolean
}[] = [
  {
    id: 'resume',
    label: 'Resume / CV',
    description: 'Primary professional profile document',
    checksAvailability: true,
  },
  {
    id: 'linkedin',
    label: 'LinkedIn Export',
    description: 'Profile export (PDF or data archive) — availability checked against resume',
    checksAvailability: true,
  },
  {
    id: 'experience_letter',
    label: 'Experience Letters',
    description: 'Employer verification of roles, duties, and tenure',
    checksAvailability: true,
  },
  {
    id: 'recommendation',
    label: 'Recommendation Letters',
    description: 'Expert or peer endorsements of extraordinary ability or research impact',
    checksAvailability: true,
  },
  {
    id: 'publication',
    label: 'Publications',
    description: 'Journal articles, conference papers, citations',
    checksAvailability: true,
  },
  {
    id: 'patent',
    label: 'Patents',
    description: 'Granted or pending patent documentation',
    checksAvailability: true,
  },
  {
    id: 'award',
    label: 'Awards & Certificates',
    description: 'Recognitions, prizes, honors, memberships',
    checksAvailability: true,
  },
  {
    id: 'salary_proof',
    label: 'Salary / Compensation Proof',
    description: 'Pay stubs, offer letters, benchmark reports (EB1A / EB1C)',
    checksAvailability: true,
  },
  {
    id: 'company_doc',
    label: 'Company Documents',
    description: 'Org charts, annual reports, affiliate evidence (EB1C)',
    checksAvailability: true,
  },
  {
    id: 'other',
    label: 'Other Supporting Evidence',
    description: 'Media coverage, judging roles, commercial success, etc.',
    checksAvailability: true,
  },
]
