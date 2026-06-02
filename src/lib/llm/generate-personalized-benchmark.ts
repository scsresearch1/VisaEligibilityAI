import { appConfig } from '../../config/app.config'
import { reconcileBenchmarkPayload } from '../benchmark-report/reconcile-benchmark-payload'
import type { PersonalizedBenchmarkPayload } from '../benchmark-report/personalized-heuristic'
import type { AssessmentState, LlmRunMeta } from '../../types/assessment'
import { buildEligibilityRulesPrompt } from '../../data/eligibility-rules'
import { extractProfileSignals } from '../benchmark-report/extract-profile'
import { buildProfileContextBlock } from '../profile-text'
import { buildRuleBasedCriterionDigest, scoreAllCriteria } from '../scientific-assessment/score-criterion'
import {
  buildBenchmarkSystemPrompt,
  buildBenchmarkSystemPromptCompact,
} from './benchmark-prompt'
import { buildBenchmarkUserPrompt } from './build-benchmark-user-prompt'
import { parseBenchmarkJsonLenient } from './parse-benchmark-json'
import { isLlmConfigured, callLlmForLongTask, isGeminiReady } from './llm-router'
import { getProfileSnippetLimit } from './trim-prompt'
import {
  assertLlmProvider,
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
  const reconciledHeuristic = reconcileBenchmarkPayload(state, null)

  const finish = (
    payload: PersonalizedBenchmarkPayload,
    used: 'gemini' | 'groq',
    model: string,
    note?: string,
  ): GenerateBenchmarkResult => {
    const meta = stampLlmMeta(
      {
        provider: used,
        model,
        generatedAt: new Date().toISOString(),
        error: note,
      },
      state.profileRevision,
    )
    assertLlmProvider(meta, 'Benchmark report')
    return {
      payload: {
        ...payload,
        personalizationSource: payload.personalizationSource ?? 'llm',
        llmModel: model,
      },
      meta,
    }
  }

  if (!isLlmConfigured() || appConfig.llm.provider === 'off') {
    return {
      payload: reconciledHeuristic,
      meta: {
        provider: 'fallback',
        generatedAt: new Date().toISOString(),
        error: 'LLM off — scientific heuristic benchmark used.',
        profileRevision: state.profileRevision,
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
    user: buildBenchmarkUserPrompt(state, buildContext(false)),
  }
  const groqPrompts = {
    system: buildBenchmarkSystemPromptCompact(state.selectedCategories),
    user: buildBenchmarkUserPrompt(state, buildContext(true)),
  }

  let note: string | undefined
  let provider: 'gemini' | 'groq' = 'groq'
  let model = appConfig.llm.groqModel
  let llmParsed: PersonalizedBenchmarkPayload | null = null

  try {
    const res = await callLlmForLongTask(groqPrompts, geminiPrompts)
    provider = res.provider
    model = res.model
    if (res.note) note = res.note
    llmParsed = parseBenchmarkJsonLenient(res.text)

    if (!llmParsed || llmParsed.roadmapTable.length < 8) {
      if (isGeminiReady()) {
        const geminiOnly = await callLlmForLongTask(geminiPrompts, geminiPrompts)
        const retry = parseBenchmarkJsonLenient(geminiOnly.text)
        if (retry && retry.roadmapTable.length >= (llmParsed?.roadmapTable.length ?? 0)) {
          llmParsed = retry
          provider = geminiOnly.provider
          model = geminiOnly.model
          note = [note, 'Gemini retry for full 12-area roadmap.'].filter(Boolean).join(' ')
        }
      }
    }

    const payload = reconcileBenchmarkPayload(state, llmParsed)
    if (!llmParsed) {
      note = [note, 'LLM parse failed; heuristic + rubric reconciliation used.'].filter(Boolean).join(' ')
    } else if (llmParsed.roadmapTable.length < 12) {
      note = [note, 'Partial LLM roadmap merged with rule-based 12-area baseline.'].filter(Boolean).join(' ')
    }

    return finish(payload, provider, model, note)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const payload = reconcileBenchmarkPayload(state, llmParsed)
    return finish(
      payload,
      provider,
      model,
      `Benchmark LLM error (${message}); scientific reconciliation applied.`,
    )
  }
}
