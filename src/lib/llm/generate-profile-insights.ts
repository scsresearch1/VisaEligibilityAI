import { appConfig } from '../../config/app.config'
import { buildEligibilityRulesPrompt } from '../../data/eligibility-rules'
import type { AssessmentState, LlmRunMeta, ProfileInsightRow } from '../../types/assessment'
import { buildProfileContextBlock } from '../profile-text'
import { buildRuleBasedCriterionDigest, scoreAllCriteria } from '../scientific-assessment/score-criterion'
import { extractProfileSignals } from '../benchmark-report/extract-profile'
import { parseInsightsJson } from './parse-response'
import { callGemini } from './providers/gemini'
import { callGroq } from './providers/groq'
import {
  assertLlmProvider,
  isLlmOutputRequired,
  LlmOutputRequiredError,
  stampLlmMeta,
} from './llm-output-policy'
import { generateFallbackInsights } from './mock-insights'

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

  const profileContext = buildProfileContextBlock(
    state.uploads.map((u) => ({
      name: u.name,
      category: u.category,
      textSnippet: u.textSnippet?.slice(0, appConfig.llm.maxProfileChars),
    })),
    state.selectedCategories,
    `${buildAnalysisSummary(state)}\n\n${rubricDigest}`,
    state.structuredProfile,
  )

  const provider = appConfig.llm.provider

  if (provider === 'off') {
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
    let raw: string
    let model: string
    let used: 'gemini' | 'groq'

    if (provider === 'gemini') {
      const gemini = await callGemini(profileContext, eligibilityRules)
      raw = gemini.text
      model = gemini.modelUsed
      used = 'gemini'
    } else {
      raw = await callGroq(profileContext, eligibilityRules)
      model = appConfig.llm.groqModel
      used = 'groq'
    }

    const rows = parseInsightsJson(raw)
    const meta = stampLlmMeta(
      { provider: used, model, generatedAt: new Date().toISOString() },
      state.profileRevision,
    )
    assertLlmProvider(meta, 'Profile insights')
    return { rows, meta }
  } catch (primaryError) {
    const message = primaryError instanceof Error ? primaryError.message : String(primaryError)

    if (provider === 'gemini' && appConfig.llm.groqApiKey.trim()) {
      try {
        const raw = await callGroq(profileContext, eligibilityRules)
        const rows = parseInsightsJson(raw)
        const meta = stampLlmMeta(
          {
            provider: 'groq',
            model: appConfig.llm.groqModel,
            generatedAt: new Date().toISOString(),
            error: `Gemini failed (${message}); used Groq.`,
          },
          state.profileRevision,
        )
        assertLlmProvider(meta, 'Profile insights')
        return { rows, meta }
      } catch (groqErr) {
        const groqMsg = groqErr instanceof Error ? groqErr.message : String(groqErr)
        if (isLlmOutputRequired()) {
          throw new LlmOutputRequiredError(`Gemini failed (${message}); Groq failed (${groqMsg}).`)
        }
      }
    }

    if (isLlmOutputRequired()) {
      throw new LlmOutputRequiredError(message)
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

export function isLlmConfigured(): boolean {
  const { provider, geminiApiKey, groqApiKey } = appConfig.llm
  if (provider === 'off') return false
  if (provider === 'gemini') return geminiApiKey.trim().length > 0
  if (provider === 'groq') return groqApiKey.trim().length > 0
  return false
}
