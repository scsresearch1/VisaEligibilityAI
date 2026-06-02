import { appConfig } from '../../config/app.config'
import { buildHeuristicPersonalizedPayload } from '../benchmark-report/personalized-heuristic'
import type { PersonalizedBenchmarkPayload } from '../benchmark-report/personalized-heuristic'
import type { AssessmentState, LlmRunMeta } from '../../types/assessment'
import { buildEligibilityRulesPrompt } from '../../data/eligibility-rules'
import { extractProfileSignals } from '../benchmark-report/extract-profile'
import { buildProfileContextBlock } from '../profile-text'
import { buildRuleBasedCriterionDigest, scoreAllCriteria } from '../scientific-assessment/score-criterion'
import {
  buildBenchmarkSystemPrompt,
  buildBenchmarkSystemPromptCompact,
  buildBenchmarkUserPrompt,
} from './benchmark-prompt'
import { parseBenchmarkJson } from './parse-benchmark-json'
import { isLlmConfigured, callLlmForLongTask } from './llm-router'
import { getProfileSnippetLimit } from './trim-prompt'
import {
  assertLlmProvider,
  isLlmOutputRequired,
  LlmOutputRequiredError,
  stampLlmMeta,
} from './llm-output-policy'

function buildAnalysisSummary(state: AssessmentState): string {
  const achievements = state.parsedAchievements
    .map((a) => `- [${a.type}] ${a.summary}`)
    .join('\n')
  const gaps = state.gaps.map((g) => `- [${g.severity}] ${g.title}`).join('\n')
  const criteria = state.criterionResults
    .map((c) => {
      const ev = state.evidenceItems.find((e) => e.criterionId === c.criterionId)
      return `- ${c.criterionId}: status=${c.status}, strength=${c.strength}, evidence="${ev?.label?.slice(0, 80) ?? 'n/a'}"`
    })
    .join('\n')
  const recs = state.recommendations
    .map((r) => `- ${r.documentType} (+${r.estimatedImpactPercent}%)`)
    .join('\n')

  return [
    'Achievements:',
    achievements || '(none)',
    '',
    'Gaps:',
    gaps || '(none)',
    '',
    'Criteria & evidence:',
    criteria || '(none)',
    '',
    'Recommendations:',
    recs || '(none)',
  ].join('\n')
}

export interface GenerateBenchmarkResult {
  payload: PersonalizedBenchmarkPayload
  meta: LlmRunMeta
}

export async function generatePersonalizedBenchmarkPayload(
  state: AssessmentState,
): Promise<GenerateBenchmarkResult> {
  const heuristic = buildHeuristicPersonalizedPayload(state)

  if (!isLlmConfigured() || appConfig.llm.provider === 'off') {
    return {
      payload: heuristic,
      meta: {
        provider: 'fallback',
        generatedAt: new Date().toISOString(),
        error: 'LLM off — profile-aware heuristic quantification used.',
      },
    }
  }

  const eligibilityRules = buildEligibilityRulesPrompt(state.selectedCategories)
  const profile = extractProfileSignals(state.uploads)
  const rubricDigest = buildRuleBasedCriterionDigest(
    scoreAllCriteria(state.selectedCategories, profile),
  )

  const buildContext = (forGroq: boolean) =>
    buildProfileContextBlock(
      state.uploads.map((u) => ({
        name: u.name,
        category: u.category,
        textSnippet: u.textSnippet?.slice(0, getProfileSnippetLimit(forGroq)),
      })),
      state.selectedCategories,
      `${buildAnalysisSummary(state)}\n\n${rubricDigest}`,
      state.structuredProfile,
      forGroq ? { maxSnippetChars: getProfileSnippetLimit(true), maxTotalChars: 5000 } : undefined,
    )

  const geminiPrompts = {
    system: buildBenchmarkSystemPrompt(state.selectedCategories, eligibilityRules),
    user: buildBenchmarkUserPrompt(buildContext(false)),
  }
  const groqPrompts = {
    system: buildBenchmarkSystemPromptCompact(state.selectedCategories),
    user: buildBenchmarkUserPrompt(buildContext(true)),
  }

  const finish = (
    payload: PersonalizedBenchmarkPayload,
    used: 'gemini' | 'groq',
    model: string,
    error?: string,
  ): GenerateBenchmarkResult => {
    const meta = stampLlmMeta(
      {
        provider: used,
        model,
        generatedAt: new Date().toISOString(),
        error,
      },
      state.profileRevision,
    )
    assertLlmProvider(meta, 'Benchmark report')
    return {
      payload: { ...payload, personalizationSource: 'llm', llmModel: model },
      meta,
    }
  }

  try {
    const res = await callLlmForLongTask(groqPrompts, geminiPrompts)
    return finish(parseBenchmarkJson(res.text), res.provider, res.model, res.note)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (isLlmOutputRequired()) {
      throw err instanceof LlmOutputRequiredError ? err : new LlmOutputRequiredError(message)
    }

    return {
      payload: heuristic,
      meta: {
        provider: 'fallback',
        generatedAt: new Date().toISOString(),
        error: `LLM benchmark failed (${message}) — profile-aware heuristic used.`,
      },
    }
  }
}
