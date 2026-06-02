import { VISA_CRITERIA } from '../../data/eligibility-rules'
import type { ProfileInsightRow, VisaCategory } from '../../types/assessment'

function criterionTitle(cat: VisaCategory, code: string): string {
  const c = VISA_CRITERIA.find((x) => x.category === cat && x.code === code)
  return c ? `EB-${cat.slice(-1)} Criterion ${code} — ${c.title}` : `EB-${cat} Criterion ${code}`
}

export function generateFallbackInsights(categories: VisaCategory[]): ProfileInsightRow[] {
  const rows: ProfileInsightRow[] = []

  if (categories.includes('EB1A')) {
    rows.push(
      {
        id: 'fb-eb1a-5',
        visaCategory: 'EB1A',
        categoryOfficialName: criterionTitle('EB1A', '5'),
        actionableItems: [
          'Compile third-party adoption metrics for each claimed technical contribution',
          'Obtain 2–3 independent expert letters citing specific projects by name',
          'Prepare before/after impact documentation with measurable KPIs',
        ],
        rmTeamRecommendedServices: [
          'Expert letter coordination & drafting review',
          'Technical impact dossier preparation',
          'Patent and publication index compilation',
        ],
        sourceStrategicBasis:
          'RM EB1A checklist §5: original contributions of major significance; align patents and publications to this criterion.',
      },
      {
        id: 'fb-eb1a-9',
        visaCategory: 'EB1A',
        categoryOfficialName: criterionTitle('EB1A', '9'),
        actionableItems: [
          'Upload salary slips, tax returns, or compensation proof per RM checklist',
          'Commission third-party salary benchmark for role, geography, and industry',
        ],
        rmTeamRecommendedServices: [
          'Compensation benchmarking report',
          'Employer verification letter template',
        ],
        sourceStrategicBasis:
          'RM EB1A checklist §9: high salary or remuneration; USCIS compares to peers in the field.',
      },
      {
        id: 'fb-eb1a-11',
        visaCategory: 'EB1A',
        categoryOfficialName: criterionTitle('EB1A', '11'),
        actionableItems: [
          'Document sustained recognition via media, awards, and longitudinal career evidence',
        ],
        rmTeamRecommendedServices: [
          'Recognition timeline dossier',
          'Media coverage verification package',
        ],
        sourceStrategicBasis:
          'RM EB1A checklist §11: sustained national or international recognition — holistic narrative criterion.',
      },
    )
  }

  if (categories.includes('EB1B')) {
    rows.push(
      {
        id: 'fb-eb1b-6',
        visaCategory: 'EB1B',
        categoryOfficialName: criterionTitle('EB1B', '6'),
        actionableItems: [
          'Export citation report (Google Scholar / Scopus) for all listed publications',
          'Document peer-review history for journal submissions',
        ],
        rmTeamRecommendedServices: [
          'Citation analytics package',
          'Journal impact factor summary sheet',
          'Academic CV normalization for USCIS format',
        ],
        sourceStrategicBasis:
          'RM EB1B checklist §6: authorship in internationally recognized journals; citations strengthen impact.',
      },
      {
        id: 'fb-eb1b-sponsor',
        visaCategory: 'EB1B',
        categoryOfficialName: 'EB-1B — Employer Sponsorship & Permanent Job Offer (RM Important Notes)',
        actionableItems: [
          'Obtain employer sponsorship letter and permanent job offer / employment contract',
          'Document 3+ years teaching or research experience in the academic field',
        ],
        rmTeamRecommendedServices: [
          'Employer petition coordination',
          'Research experience verification letters',
        ],
        sourceStrategicBasis:
          'RM EB1B checklist: sponsorship and 3-year experience are program requirements beyond the 6 criteria.',
      },
    )
  }

  if (categories.includes('EB1C')) {
    rows.push(
      {
        id: 'fb-eb1c-1',
        visaCategory: 'EB1C',
        categoryOfficialName: criterionTitle('EB1C', '1'),
        actionableItems: [
          'Prepare organizational charts showing managed department or essential function',
          'Document scope of management with team size and budget authority',
        ],
        rmTeamRecommendedServices: [
          'Organizational chart preparation',
          'Executive duty statement drafting',
        ],
        sourceStrategicBasis: 'RM EB1C checklist §1: manages organization, department, or essential function.',
      },
      {
        id: 'fb-eb1c-prog',
        visaCategory: 'EB1C',
        categoryOfficialName: 'EB-1C — Qualifying Corporate Relationship & 1-Year Abroad (RM Important Notes)',
        actionableItems: [
          'Collect business registration, ownership, and affiliate relationship documents',
          'Verify 1 year employment abroad within last 3 years with verification letters',
        ],
        rmTeamRecommendedServices: [
          'Corporate structure due diligence packet',
          'U.S. offer letter and foreign employment verification',
        ],
        sourceStrategicBasis:
          'RM EB1C important notes: qualifying relationship and 1-year foreign employment are mandatory program elements.',
      },
    )
  }

  rows.push({
    id: 'fb-gen-1',
    categoryOfficialName: 'Cross-Cutting — RM Document Presentation & Attorney Review',
    actionableItems: [
      'Reconcile resume dates with experience letters per RM common supporting documents list',
      'Flag unsupported superlatives before attorney filing',
    ],
    rmTeamRecommendedServices: [
      'Full petition readiness review',
      'Immigration attorney referral (RM partner network)',
    ],
    sourceStrategicBasis:
      'RM checklists: meeting minimum criteria does not guarantee approval; final eligibility after legal team review.',
  })

  return rows
}
