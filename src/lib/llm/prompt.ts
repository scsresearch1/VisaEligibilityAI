import {
  buildScientificInsightsSystemPrompt,
  buildScientificInsightsUserPrompt,
  SCIENTIFIC_INSIGHTS_JSON_SCHEMA,
} from '../scientific-assessment/prompts'

export const INSIGHTS_JSON_SCHEMA = SCIENTIFIC_INSIGHTS_JSON_SCHEMA

export function buildInsightsSystemPrompt(eligibilityRulesBlock?: string): string {
  return buildScientificInsightsSystemPrompt(eligibilityRulesBlock)
}

export function buildInsightsUserPrompt(profileContext: string): string {
  return buildScientificInsightsUserPrompt(profileContext)
}
