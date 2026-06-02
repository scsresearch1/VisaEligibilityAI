import { appConfig } from '../../config/app.config'
import { buildEligibilityRulesPrompt } from '../../data/eligibility-rules'
import type { AssessmentState, LlmRunMeta, ProfileInsightRow } from '../../types/assessment'
import { buildProfileContextBlock } from '../profile-text'
import { buildRuleBasedCriterionDigest, scoreAllCriteria } from '../scientific-assessment/score-criterion'
import { extractProfileSignals } from '../benchmark-report/extract-profile'
import { parseInsightsJson } from './parse-response'
import {
  assertLlmProvider,
  isLlmOutputRequired,
  LlmOutputRequiredError,
  stampLlmMeta,
} from './llm-output-policy'
import { generateFallbackInsights } from './mock-insights'
import { callLlmForCriticalInsights, isGeminiReady } from './llm-router'
import { getProfileSnippetLimit } from './trim-prompt'

export { isLlmConfigured } from './llm-router'

function buildAnalysisSummary(state: Pick<
  AssessmentState,
  'parsedAchievements' | 'gaps' | 'criterionResults' | 'recommendations'
>): string {
  const achievements = state.parsedAchievements
    .map((a) => `- [${a.type}] ${a.summary} (${Math.round(a.confidence * 100)}%)`)
    .join('\n')
  const gaps = state.gaps.map((g) => `- [${g.severity}] ${g.title}: ${g.description}`).join('\n')
  const criteria = state.criterionResults
    .slice(0, 15)
    .map((c) => `- Criterion ${c.criterionId}: ${c.status} / ${c.strength}`)
    .join('\n')
  const recs = state.recommendations
    .map((r) => `- ${r.documentType}: +${r.estimatedImpactPercent}% — ${r.purpose}`)
    .join('\n')

  return [
    'Achievements extracted:',
    achievements || '(pending)',
    '',
    'Gaps:',
    gaps || '(pending)',
    '',
    'Criteria status sample:',
    criteria || '(pending)',
    '',
    'Document recommendations:',
    recs || '(pending)',
  ].join('\n')
}

export interface GenerateInsightsResult {
  rows: ProfileInsightRow[]
  meta: LlmRunMeta
}

export async function generateProfileInsights(
  state: AssessmentState,
): Promise<GenerateInsightsResult> {
  const eligibilityRules = buildEligibilityRulesPrompt(state.selectedCategories)

  const profile = extractProfileSignals(state.uploads)
  const rubricDigest = buildRuleBasedCriterionDigest(
    scoreAllCriteria(state.selectedCategories, profile),
  )

  const snippetLimit = getProfileSnippetLimit(!isGeminiReady())
  const profileContext = buildProfileContextBlock(
    state.uploads.map((u) => ({
      name: u.name,
      category: u.category,
      textSnippet: u.textSnippet?.slice(0, snippetLimit),
    })),
    state.selectedCategories,
    `${buildAnalysisSummary(state)}\n\n${rubricDigest}`,
    state.structuredProfile,
  )

  if (appConfig.llm.provider === 'off') {
    return {
      rows: generateFallbackInsights(state.selectedCategories),
      meta: {
        provider: 'fallback',
        generatedAt: new Date().toISOString(),
        error: 'LLM provider set to "off" — using rule-based RM template.',
      },
    }
  }

  try {
    const res = await callLlmForCriticalInsights(profileContext, eligibilityRules)
    const rows = parseInsightsJson(res.text)
    const meta = stampLlmMeta(
      {
        provider: res.provider,
        model: res.model,
        generatedAt: new Date().toISOString(),
        error: res.note,
      },
      state.profileRevision,
    )
    assertLlmProvider(meta, 'Profile insights')
    return { rows, meta }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)

    if (isLlmOutputRequired()) {
      throw err instanceof LlmOutputRequiredError ? err : new LlmOutputRequiredError(message)
    }

    return {
      rows: generateFallbackInsights(state.selectedCategories),
      meta: {
        provider: 'fallback',
        generatedAt: new Date().toISOString(),
        error: message,
      },
    }
  }
}
