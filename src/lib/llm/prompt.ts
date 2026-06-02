import {
  buildScientificInsightsSystemPrompt,
  buildScientificInsightsSystemPromptCompact,
  buildScientificInsightsUserPrompt,
  SCIENTIFIC_INSIGHTS_JSON_SCHEMA,
} from '../scientific-assessment/prompts'
import type { VisaCategory } from '../../types/assessment'

export const INSIGHTS_JSON_SCHEMA = SCIENTIFIC_INSIGHTS_JSON_SCHEMA

export function buildInsightsSystemPrompt(eligibilityRulesBlock?: string): string {
  return buildScientificInsightsSystemPrompt(eligibilityRulesBlock)
}

export function buildInsightsUserPrompt(profileContext: string): string {
  return buildScientificInsightsUserPrompt(profileContext)
}

export function buildInsightsSystemPromptCompact(categories: VisaCategory[]): string {
  return buildScientificInsightsSystemPromptCompact(categories)
}
