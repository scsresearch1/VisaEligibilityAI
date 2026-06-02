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
import {
  callLlmForCriticalInsights,
  callLlmForCriticalTask,
  isGeminiReady,
} from './llm-router'
import { getProfileSnippetLimit } from './trim-prompt'
import { buildInsightsSystemPromptCompact, buildInsightsUserPrompt } from './prompt'
import { buildInsightsRowsFromAnalysis } from './insights-from-analysis'

export { isLlmConfigured } from './llm-router'

function buildAnalysisSummary(state: Pick<
  AssessmentState,
  'parsedAchievements' | 'gaps' | 'criterionResults' | 'recommendations'
>): string {
  const achievements = state.parsedAchievements
    .map((a) => `- [${a.type}] ${a.summary}`)
    .join('\n')
  const gaps = state.gaps.map((g) => `- [${g.severity}] ${g.title}`).join('\n')
  const criteria = state.criterionResults
    .slice(0, 12)
    .map((c) => `- ${c.criterionId}: ${c.status} / ${c.strength}`)
    .join('\n')

  return [
    'Gaps:',
    gaps || '(none)',
    '',
    'Criteria:',
    criteria || '(none)',
    '',
    'Achievements:',
    achievements || '(none)',
  ].join('\n')
}

function buildCompactInsightsContext(state: AssessmentState): string {
  const snippetLimit = 2000
  return buildProfileContextBlock(
    state.uploads.map((u) => ({
      name: u.name,
      category: u.category,
      textSnippet: u.textSnippet?.slice(0, snippetLimit),
    })),
    state.selectedCategories,
    buildAnalysisSummary(state),
    state.structuredProfile,
    { maxSnippetChars: snippetLimit, maxTotalChars: 3500 },
  )
}

function tryParseInsights(text: string): ProfileInsightRow[] {
  try {
    return parseInsightsJson(text)
  } catch {
    return []
  }
}

export interface GenerateInsightsResult {
  rows: ProfileInsightRow[]
  meta: LlmRunMeta
}

export async function generateProfileInsights(
  state: AssessmentState,
): Promise<GenerateInsightsResult> {
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

  const finish = (
    rows: ProfileInsightRow[],
    provider: 'gemini' | 'groq',
    model: string,
    note?: string,
  ): GenerateInsightsResult => {
    const meta = stampLlmMeta(
      {
        provider,
        model,
        generatedAt: new Date().toISOString(),
        error: note,
      },
      state.profileRevision,
    )
    assertLlmProvider(meta, 'Profile insights')
    return { rows, meta }
  }

  try {
    let note: string | undefined

    const primary = await callLlmForCriticalInsights(profileContext, eligibilityRules)
    let rows = tryParseInsights(primary.text)
    let provider = primary.provider
    let model = primary.model
    if (primary.note) note = primary.note

    if (rows.length === 0) {
      const compactUser = buildInsightsUserPrompt(buildCompactInsightsContext(state))
      const compactSystem = buildInsightsSystemPromptCompact(state.selectedCategories)
      const retry = await callLlmForCriticalTask(
        { system: compactSystem, user: compactUser },
        { system: compactSystem, user: compactUser },
      )
      rows = tryParseInsights(retry.text)
      provider = retry.provider
      model = retry.model
      note = [note, 'Retried insights with compact prompt after empty rows.'].filter(Boolean).join(' ')
    }

    if (rows.length === 0 && state.analysisComplete && state.gaps.length > 0) {
      rows = buildInsightsRowsFromAnalysis(state)
      note = [note, 'Built strategy rows from completed analysis gaps/criteria.'].filter(Boolean).join(' ')
      return finish(rows, provider, model, note)
    }

    if (rows.length === 0) {
      throw new Error('LLM returned empty rows array')
    }

    return finish(rows, provider, model, note)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)

    if (
      state.analysisComplete &&
      (state.gaps.length > 0 || state.criterionResults.length > 0)
    ) {
      const rows = buildInsightsRowsFromAnalysis(state)
      if (rows.length > 0) {
        return finish(
          rows,
          'groq',
          appConfig.llm.groqModel,
          `Insights LLM failed (${message}); used analysis-derived rows.`,
        )
      }
    }

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
