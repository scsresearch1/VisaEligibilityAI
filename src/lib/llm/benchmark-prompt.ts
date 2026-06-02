import type { VisaCategory } from '../../types/assessment'
import { buildScientificBenchmarkSystemPrompt } from '../scientific-assessment/prompts'

export const BENCHMARK_JSON_SCHEMA = `{
  "baseline": {
    "readinessScore": number (0-100, unique to this candidate),
    "evidenceStrength": "Strong" | "Moderate" | "Weak",
    "attorneyReadyStatus": "Ready" | "Not Ready" | "Partial",
    "primaryGap": string,
    "consultingRequirement": string
  },
  "roadmapTable": [
    {
      "area": string (must match one of the 12 standard roadmap areas),
      "currentScore": number (0-100),
      "targetScore": number (55-90),
      "quantityToBuild": number (0-8),
      "priority": "Critical" | "High" | "Medium" | "Low",
      "areaOutline": string (one-line deliverable title, max 90 chars),
      "consultingResponsibility": string (specific to candidate field and gaps)
    }
  ],
  "minimumBuildPackage": string[],
  "evaluationLogic": string[] (3-4 sentences),
  "conclusionSummary": string,
  "projectedReadinessMin": number,
  "projectedReadinessMax": number,
  "projectedAttorneyMin": number,
  "projectedAttorneyMax": number,
  "positioningThemes": string[] (3-5, from candidate domain)
}`

const STANDARD_AREAS = [
  'Scholarly / Technical Publications',
  'Patent / IP Evidence',
  'Product / Technical Artifact',
  'Technical White Papers',
  'Industry Articles / Published Material About Candidate',
  'Conference / Speaking Evidence',
  'Judging / Reviewing Evidence',
  'Expert Profile / Recognition Assets',
  'Case-Study Style Technical Narratives',
  'Product Documentation and Validation Reports',
  'Citation / Visibility Development',
  'Counsel Review Package',
]

export function buildBenchmarkSystemPrompt(
  categories: VisaCategory[],
  eligibilityRulesBlock?: string,
): string {
  const scientific = buildScientificBenchmarkSystemPrompt(categories, eligibilityRulesBlock)
  return [
    scientific,
    'Output ONLY valid JSON matching this schema (no markdown):',
    BENCHMARK_JSON_SCHEMA,
    `Standard areas (exact order):\n${STANDARD_AREAS.map((a, i) => `${i + 1}. ${a}`).join('\n')}`,
    'Professional Review Package quantityToBuild is always 1 when included.',
  ].join('\n\n')
}

export function buildBenchmarkUserPrompt(profileContext: string): string {
  return [
    'Using the profile and structured analysis below, produce a customized benchmark quantification.',
    'Tie consultingResponsibility text to the candidate\'s actual employers, projects, and technical domain.',
    'Do NOT reuse sample benchmark names, employers, or product names from examples — only facts in the profile.',
    'evaluationLogic must reference this candidate\'s domains, gaps, and employers from the profile.',
    profileContext,
  ].join('\n\n')
}

/** Shorter benchmark prompt for Groq token limits. */
export function buildBenchmarkSystemPromptCompact(categories: VisaCategory[]): string {
  return [
    'EB-1 benchmark quantification. Output ONLY valid JSON.',
    `Pathways: ${categories.join(', ')}.`,
    'Include: baseline, roadmapTable (12 standard areas), minimumBuildPackage, evaluationLogic, conclusionSummary, projections, positioningThemes.',
    'Candidate-specific only — no template employers or products.',
    'Schema (abbreviated):',
    BENCHMARK_JSON_SCHEMA.slice(0, 2200),
    '...',
  ].join('\n')
}
