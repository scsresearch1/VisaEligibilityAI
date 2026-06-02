import type { VisaCategory } from '../types/assessment'

export interface PathwayLegalFramework {
  regulatoryAnchor: string
  overallStandard: string
  thresholdRule: string
  finalMeritsNote: string
  assessmentDiscipline: string[]
}

/** Authoritative pathway standards (USCIS / INA-aligned). Not a guarantee of approval. */
export const PATHWAY_LEGAL_FRAMEWORK: Record<VisaCategory, PathwayLegalFramework> = {
  EB1A: {
    regulatoryAnchor:
      'INA §203(b)(1)(A); 8 CFR §204.5(h) — employment-based first preference as alien of extraordinary ability.',
    overallStandard:
      'The beneficiary must demonstrate extraordinary ability in the sciences, arts, education, business, or athletics through sustained national or international acclaim, intend to continue work in that area, and show that entry will substantially benefit the United States.',
    thresholdRule:
      'Regulatory evidence: satisfy at least three (3) of the ten (10) criteria at 8 CFR §204.5(h)(3), or provide comparable evidence if the standard categories do not readily apply. Meeting three criteria is necessary but not sufficient.',
    finalMeritsNote:
      'After individual criteria are met, USCIS conducts a final merits determination (Kazarian framework): whether the totality of evidence shows the beneficiary is among the small percentage at the very top of the field and has sustained acclaim. Criteria 11–12 in this checklist reflect that holistic review — not standalone substitutes for numbered regulatory criteria.',
    assessmentDiscipline: [
      'Score only facts documented in uploaded materials — no inferred awards, publications, salary, or roles.',
      'Distinguish resume claims from third-party verification (journal indexing, award letters, salary benchmarks).',
      'Meeting checklist items in this tool does not equal USCIS approval.',
    ],
  },
  EB1B: {
    regulatoryAnchor:
      'INA §203(b)(1)(B); 8 CFR §204.5(i) — outstanding professor or researcher.',
    overallStandard:
      'The beneficiary must be internationally recognized as outstanding in a specific academic field, have at least three years of teaching or research experience in that field, and be entering the U.S. to accept a permanent offer of employment from a university, institution of higher education, department/division/institute, or private employer with at least three full-time research employees and documented accomplishments.',
    thresholdRule:
      'Regulatory evidence: satisfy at least two (2) of the six (6) criteria at 8 CFR §204.5(i)(3). Employer sponsorship and a qualifying permanent job offer are mandatory — criteria alone are insufficient.',
    finalMeritsNote:
      'USCIS evaluates whether recognition is truly international and outstanding in the academic field, not merely a strong domestic career. Research impact, peer review, and independent expert validation are weighed in totality.',
    assessmentDiscipline: [
      'Confirm teaching/research tenure and employer sponsorship are documented before scoring criteria.',
      'Publication lists without citation context or venue quality must not be scored as strong without corroboration.',
      'Do not assume tenure-track, permanent offer, or private-employer research capacity unless evidenced.',
    ],
  },
  EB1C: {
    regulatoryAnchor:
      'INA §203(b)(1)(C); 8 CFR §204.5(j) — multinational manager or executive.',
    overallStandard:
      'The beneficiary must have been employed abroad by a qualifying organization in a managerial or executive capacity for at least one continuous year in the three years before petition or entry, and be coming to the U.S. to perform managerial or executive duties for a qualifying U.S. entity with a qualifying corporate relationship to the foreign employer.',
    thresholdRule:
      'All four (4) managerial duty elements below must be met in the offered U.S. role, plus program requirements (qualifying relationship, one-year foreign employment, U.S. sponsorship). Functional managers may qualify only with narrow, documented authority over an essential function.',
    finalMeritsNote:
      'USCIS scrutinizes organizational charts, personnel counts, and whether duties are truly managerial versus skilled or administrative work. Staffing-level and day-to-day operational control must be documented.',
    assessmentDiscipline: [
      'Do not infer multinational structure, affiliate relationship, or headcount from company names alone.',
      'Job titles such as “manager” without hire/fire authority or supervised professional staff require weak/partial scoring.',
      'One year of foreign employment must fall within the statutory window — verify dates from letters, not assumptions.',
    ],
  },
}
