import type { VisaCategory } from '../../types/assessment'
import type { ExtractedProfileSignals } from '../benchmark-report/extract-profile'
import type { StructuredResumeProfile } from '../resume-deep-extract'
import {
  buildCompactCriterionDigest,
  buildProfileFactInventory,
  formatFactInventoryForPrompt,
} from './profile-fact-inventory'

export function buildScientificAnalysisUserPrompt(options: {
  categories: VisaCategory[]
  profileContext: string
  profile: ExtractedProfileSignals
  structured?: StructuredResumeProfile | null
  forGroq: boolean
}): string {
  const inventory = buildProfileFactInventory(options.profile, options.structured)
  const factBlock = formatFactInventoryForPrompt(inventory)
  const criterionChecklist = buildCompactCriterionDigest(options.categories)

  const sections = [
    'TASK: Full scientific EB-1 assessment. Output ONLY valid JSON matching the system schema.',
    '',
    factBlock,
    '',
    criterionChecklist,
    '',
    'REQUIREMENTS:',
    '- criterionEvaluations: one row per criterion id above (no omissions).',
    '- profileEvidence: must anchor to VERIFIED FACT INVENTORY (no invented credentials).',
    '- roadmapActions: 6–12 build actions; deliverableSpec titles/outlines must match candidate field and employers listed.',
    '- gaps: tie each gap to criterionId where evidence is weak/missing; impactScore ≈ 100 − evidenceScore.',
    '- parsedAchievements: only achievements explicitly supported by inventory facts.',
    '- riskFlags: flag marketing language, unsupported salary/impact claims, or missing exhibits.',
    '',
    options.profileContext,
  ]

  if (!options.forGroq) {
    sections.splice(
      4,
      0,
      'Use official eligibility rules in system prompt for regulatoryBasis on each criterion.',
    )
  }

  return sections.join('\n')
}
