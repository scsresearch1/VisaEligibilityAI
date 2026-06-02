import type { VisaCategory } from '../../types/assessment'
import { SCIENTIFIC_METHODOLOGY } from './methodology'

export const SCIENTIFIC_ANALYSIS_JSON_SCHEMA = `{
  "profileFacts": {
    "domains": string[],
    "verifiedFacts": [{ "fact": string, "source": string, "confidence": number }],
    "unsupportedClaims": string[]
  },
  "criterionEvaluations": [{
    "criterionId": string (must match official id e.g. eb1a-6),
    "evidenceScore": number (0-100, rubric-aligned),
    "strengthLabel": "missing"|"unsupported"|"weak"|"moderate"|"strong",
    "profileEvidence": string[] (quotes or paraphrases from profile),
    "regulatoryBasis": string (one sentence),
    "gapSummary": string,
    "buildRecommendation": string (specific deliverable consulting must produce)
  }],
  "parsedAchievements": [{ "type": string, "summary": string, "domain": string, "confidence": number }],
  "gaps": [{
    "title": string,
    "description": string,
    "severity": "critical"|"high"|"medium"|"low",
    "criterionId": string,
    "category": "EB1A"|"EB1B"|"EB1C",
    "impactScore": number (1-99, correlates with evidence gap)
  }],
  "recommendations": [{
    "documentType": string,
    "purpose": string,
    "priority": "critical"|"high"|"medium",
    "estimatedImpactPercent": number,
    "quantifiedBenefit": string,
    "category": "EB1A"|"EB1B"|"EB1C",
    "criterionId": string (optional but preferred),
    "scientificRationale": string
  }],
  "riskFlags": [{
    "claim": string,
    "riskType": "exaggerated"|"unsupported"|"weak"|"legally_sensitive",
    "severity": "high"|"medium"|"low",
    "recommendation": string
  }],
  "roadmapActions": [{
    "priority": number,
    "title": string,
    "domain": string,
    "evidenceArea": string,
    "deliverableOutline": string,
    "deliverableSpec": {
      "kind": "publications"|"patents"|"product"|"whitepaper"|"media"|"speaking"|"judging"|"case_study"|"documentation"|"visibility"|"general",
      "suggestedTitles": string[] (required for publications/whitepaper/media — 2-3 profile-specific titles),
      "outline": string (required for patents/product/speaking/judging — 2-3 sentences),
      "domain": string (required for product — technical/business domain)
    },
    "description": string,
    "profileAnchor": string,
    "timeframe": string,
    "expectedReadinessGain": number,
    "category": "add"|"improve"|"document"|"validate",
    "visaCategory": "EB1A"|"EB1B"|"EB1C"
  }]
}`

export function buildScientificAnalysisSystemPrompt(categories: VisaCategory[]): string {
  return [
    SCIENTIFIC_METHODOLOGY,
    '',
    'TASK: Perform criterion-by-criterion scientific assessment. Output ONLY valid JSON matching the schema below.',
    `Selected pathways: ${categories.join(', ')}.`,
    'Evaluate EVERY official criterion for selected pathways in criterionEvaluations.',
    'roadmapActions.deliverableSpec: publications → suggestedTitles (2-3); patents → outline (2-3 lines); product → domain + outline (2-3 lines); match profile field.',
    'Align evidenceScore with the rubric and rule-based baseline provided in the user message.',
    'Do NOT use template employers, products, or sample candidates.',
    'Schema:',
    SCIENTIFIC_ANALYSIS_JSON_SCHEMA,
  ].join('\n')
}

/** Shorter system prompt for Groq TPM limits (fallback path). */
export function buildScientificAnalysisSystemPromptCompact(categories: VisaCategory[]): string {
  return [
    'Scientific EB-1 assessment. Output ONLY valid JSON.',
    `Pathways: ${categories.join(', ')}.`,
    'Include: criterionEvaluations (all criteria), parsedAchievements, gaps, recommendations, riskFlags, roadmapActions (6-10) with deliverableSpec.',
    'roadmapActions: papers→suggestedTitles; patents/product→outline+domain; match candidate field from profile.',
    'Use rubric baseline in user message; ±15 score adjustment only with cited evidence.',
    'Schema (abbreviated):',
    SCIENTIFIC_ANALYSIS_JSON_SCHEMA.slice(0, 2800),
    '...',
  ].join('\n')
}

export const SCIENTIFIC_INSIGHTS_JSON_SCHEMA = `{
  "rows": [{
    "categoryOfficialName": string (official criterion or pathway requirement title),
    "actionableItems": string[] (2-5 concrete build steps, time-bound),
    "rmTeamRecommendedServices": string[] (2-4 consulting deliverables: publication package, patent draft, citation report, etc.),
    "sourceStrategicBasis": string (regulatory citation + evidence mapping + rubric score reference),
    "visaCategory": "EB1A"|"EB1B"|"EB1C",
    "criterionId": string (optional),
    "evidenceScore": number (optional 0-100)
  }]
}`

export function buildScientificInsightsSystemPrompt(eligibilityRulesBlock?: string): string {
  return [
    SCIENTIFIC_METHODOLOGY,
    '',
    'TASK: Generate a strategy insights table — one row per major criterion or cross-cutting build theme for the selected pathways.',
    'Each row must cite regulatory basis and reference specific profile facts (not generic advice).',
    eligibilityRulesBlock ?? '',
    'Output ONLY valid JSON:',
    SCIENTIFIC_INSIGHTS_JSON_SCHEMA,
  ].join('\n\n')
}

export function buildScientificInsightsUserPrompt(profileContext: string): string {
  return `Generate scientifically grounded strategy insights JSON for this candidate.\n\n${profileContext}`
}

export function buildScientificBenchmarkSystemPrompt(
  categories: VisaCategory[],
  eligibilityRulesBlock?: string,
): string {
  const areas = [
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
    'Professional Review Package',
  ]

  return [
    SCIENTIFIC_METHODOLOGY,
    '',
    'TASK: Quantified benchmark roadmap — quantityToBuild = new assets to produce, not files to collect.',
    `Pathways: ${categories.join(', ')}.`,
    `Roadmap table: exactly 12 areas in this order:\n${areas.map((a, i) => `${i + 1}. ${a}`).join('\n')}`,
    'currentScore must align with criterion evidence scores from profile.',
    'areaOutline = one-line deliverable title only.',
    eligibilityRulesBlock ?? '',
    'Output ONLY valid JSON (benchmark schema with baseline, roadmapTable, minimumBuildPackage, evaluationLogic, conclusionSummary, projected scores, positioningThemes).',
  ].join('\n\n')
}
