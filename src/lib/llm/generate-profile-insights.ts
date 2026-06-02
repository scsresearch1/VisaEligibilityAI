import { appConfig } from '../../config/app.config'
import { buildEligibilityRulesPrompt } from '../../data/eligibility-rules'
import type { AssessmentState, LlmRunMeta, ProfileInsightRow } from '../../types/assessment'
import { buildProfileContextBlock } from '../profile-text'
import { buildRuleBasedCriterionDigest, scoreAllCriteria } from '../scientific-assessment/score-criterion'
import { extractProfileSignals } from '../benchmark-report/extract-profile'
import { parseInsightsJsonLenient } from './parse-response'
import {
  assertLlmProvider,
  stampLlmMeta,
} from './llm-output-policy'
import {
  callLlmForCriticalInsights,
  callLlmForCriticalTask,
  isGeminiReady,
  isGroqReady,
} from './llm-router'
import { getProfileSnippetLimit } from './trim-prompt'
import { buildInsightsSystemPromptCompact, buildInsightsUserPrompt } from './prompt'
import { ensureProfileInsightRows } from './ensure-profile-insights'

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

function synthesisProvider(): 'gemini' | 'groq' {
  if (isGeminiReady()) return 'gemini'
  if (isGroqReady()) return 'groq'
  return 'gemini'
}

function synthesisModel(provider: 'gemini' | 'groq'): string {
  return provider === 'gemini' ? appConfig.llm.geminiModel : appConfig.llm.groqModel
}

export interface GenerateInsightsResult {
  rows: ProfileInsightRow[]
  meta: LlmRunMeta
}

export async function generateProfileInsights(
  state: AssessmentState,
): Promise<GenerateInsightsResult> {
  const finish = (
    rows: ProfileInsightRow[],
    provider: 'gemini' | 'groq',
    model: string,
    note?: string,
  ): GenerateInsightsResult => {
    const { rows: guaranteed, source } = ensureProfileInsightRows(state, rows)
    const notes = [
      note,
      source !== 'llm'
        ? `Strategy rows synthesized from ${source} (LLM parse empty or partial).`
        : undefined,
    ].filter(Boolean)

    const meta = stampLlmMeta(
      {
        provider,
        model,
        generatedAt: new Date().toISOString(),
        error: notes.length > 0 ? notes.join(' ') : undefined,
      },
      state.profileRevision,
    )
    assertLlmProvider(meta, 'Profile insights')
    return { rows: guaranteed, meta }
  }

  if (appConfig.llm.provider === 'off') {
    const { rows } = ensureProfileInsightRows(state, [])
    return {
      rows,
      meta: {
        provider: 'fallback',
        generatedAt: new Date().toISOString(),
        error: 'LLM provider set to "off" — using assessment-derived strategy rows.',
        profileRevision: state.profileRevision,
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

  let note: string | undefined
  let provider: 'gemini' | 'groq' = synthesisProvider()
  let model = synthesisModel(provider)
  let llmRows: ProfileInsightRow[] = []

  try {
    const primary = await callLlmForCriticalInsights(profileContext, eligibilityRules)
    llmRows = parseInsightsJsonLenient(primary.text)
    provider = primary.provider
    model = primary.model
    if (primary.note) note = primary.note

    if (llmRows.length < 3) {
      const compactUser = buildInsightsUserPrompt(buildCompactInsightsContext(state))
      const compactSystem = buildInsightsSystemPromptCompact(state.selectedCategories)
      const retry = await callLlmForCriticalTask(
        { system: compactSystem, user: compactUser },
        { system: compactSystem, user: compactUser },
      )
      const retryRows = parseInsightsJsonLenient(retry.text)
      if (retryRows.length > llmRows.length) {
        llmRows = retryRows
        provider = retry.provider
        model = retry.model
      }
      note = [note, 'Retried insights with compact prompt after empty or sparse rows.'].filter(Boolean).join(' ')
    }

    if (llmRows.length < 3 && isGeminiReady() && provider !== 'gemini') {
      const geminiRetry = await callLlmForCriticalInsights(profileContext, eligibilityRules)
      const geminiRows = parseInsightsJsonLenient(geminiRetry.text)
      if (geminiRows.length > llmRows.length) {
        llmRows = geminiRows
        provider = 'gemini'
        model = geminiRetry.model
        note = [note, 'Gemini retry after sparse Groq insights.'].filter(Boolean).join(' ')
      }
    }

    return finish(llmRows, provider, model, note)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const fallbackProvider = synthesisProvider()
    return finish(
      llmRows,
      fallbackProvider,
      synthesisModel(fallbackProvider),
      `Insights LLM error (${message}); guaranteed rows from analysis and official criteria.`,
    )
  }
}
