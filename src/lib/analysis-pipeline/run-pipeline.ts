import type { AssessmentState } from '../../types/assessment'
import { extractProfileSignals } from '../benchmark-report/extract-profile'
import { deriveDemoMetricCounts, extractProfileMetricCounts } from '../quantified-roadmap'
import { generatePersonalizedAnalysis } from '../llm/generate-personalized-analysis'
import { generateProfileInsights } from '../llm/generate-profile-insights'
import { ensureProfileInsightRows } from '../llm/ensure-profile-insights'
import { isLlmConfigured } from '../llm/generate-profile-insights'
import { isLlmOutputRequired, LlmOutputRequiredError } from '../llm/llm-output-policy'
import { deepExtractResume } from '../resume-deep-extract'
import { scoreAllCriteria, buildRuleBasedCriterionDigest } from '../scientific-assessment/score-criterion'
import { resolveProfileDomains } from '../profile-field-inference'
import { clearDerivedOutputs } from '../llm/llm-output-policy'
import {
  createInitialStages,
  type PipelineEvent,
  type PipelineStageId,
  type PipelineStageState,
} from './types'
import { getAnalysisModelStack } from './config'

function yieldToUi(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => setTimeout(resolve, 0))
  })
}

export interface RunDeepAnalysisOptions {
  state: AssessmentState
  onEvent: (event: PipelineEvent) => void
}

export interface RunDeepAnalysisResult {
  nextState: AssessmentState
}

function patchStage(
  stages: PipelineStageState[],
  id: PipelineStageId,
  patch: Partial<PipelineStageState>,
): PipelineStageState[] {
  return stages.map((s) => (s.id === id ? { ...s, ...patch } : s))
}

function emitStage(
  stages: PipelineStageState[],
  id: PipelineStageId,
  onEvent: (event: PipelineEvent) => void,
  patch: Partial<PipelineStageState>,
): PipelineStageState[] {
  const next = patchStage(stages, id, patch)
  const stage = next.find((s) => s.id === id)
  if (stage) onEvent({ type: 'stage', stage })
  return next
}

function appendLog(
  stages: PipelineStageState[],
  id: PipelineStageId,
  line: string,
  onEvent: (event: PipelineEvent) => void,
): PipelineStageState[] {
  onEvent({ type: 'log', stageId: id, line })
  const stage = stages.find((s) => s.id === id)
  if (!stage) return stages
  return patchStage(stages, id, { logs: [...stage.logs, line].slice(-12) })
}

export async function runDeepAnalysisPipeline({
  state,
  onEvent,
}: RunDeepAnalysisOptions): Promise<RunDeepAnalysisResult> {
  let stages = createInitialStages()
  onEvent({ type: 'init', stages })

  const modelStack = getAnalysisModelStack()
  const stackLine = modelStack.map((m) => `${m.provider}/${m.model}`).join(' → ')

  // —— ingest ——
  stages = emitStage(stages, 'ingest', onEvent, { status: 'running' })
  stages = appendLog(stages, 'ingest', `Queued ${state.uploads.length} document(s)`, onEvent)
  stages = appendLog(stages, 'ingest', `Pathways: ${state.selectedCategories.join(', ') || 'none'}`, onEvent)
  await yieldToUi()
  stages = emitStage(stages, 'ingest', onEvent, {
    status: 'done',
    metrics: [{ label: 'Documents', value: state.uploads.length }],
  })

  // —— structure ——
  stages = emitStage(stages, 'structure', onEvent, { status: 'running' })
  const structuredProfile = deepExtractResume(state.uploads)
  stages = appendLog(
    stages,
    'structure',
    `Detected ${structuredProfile.sectionsDetected} sections · quality=${structuredProfile.extractionQuality}`,
    onEvent,
  )
  await yieldToUi()
  stages = emitStage(stages, 'structure', onEvent, {
    status: 'done',
    metrics: [
      { label: 'Sections', value: structuredProfile.sectionsDetected },
      { label: 'Roles', value: structuredProfile.workExperience.length },
      { label: 'Quality', value: structuredProfile.extractionQuality },
    ],
  })

  // —— signals ——
  stages = emitStage(stages, 'signals', onEvent, { status: 'running' })
  const profile = extractProfileSignals(state.uploads)
  stages = appendLog(
    stages,
    'signals',
    `Claims=${profile.keyClaims.length} · pubs=${profile.publications.length} · patents=${profile.patents.length}`,
    onEvent,
  )
  if (profile.riskyPhrases.length > 0) {
    stages = appendLog(
      stages,
      'signals',
      `Risky phrase scan: ${profile.riskyPhrases.length} marketing/overclaim hit(s)`,
      onEvent,
    )
  }
  await yieldToUi()
  stages = emitStage(stages, 'signals', onEvent, {
    status: 'done',
    metrics: [
      { label: 'Signals', value: profile.keyClaims.length },
      { label: 'Risk flags', value: profile.riskyPhrases.length },
    ],
  })

  // —— domains ——
  stages = emitStage(stages, 'domains', onEvent, { status: 'running' })
  const fullText = profile.fullText
  const techDomains = resolveProfileDomains(structuredProfile, fullText, profile.domains)
  stages = appendLog(stages, 'domains', `Primary field: ${techDomains[0] ?? '—'}`, onEvent)
  await yieldToUi()
  stages = emitStage(stages, 'domains', onEvent, {
    status: 'done',
    metrics: [{ label: 'Domains', value: techDomains.slice(0, 3).join(' · ') || '—' }],
  })

  const base: AssessmentState = {
    ...state,
    ...clearDerivedOutputs(),
    structuredProfile,
    profileRevision: state.profileRevision,
    techDomains,
  }

  if (!isLlmConfigured()) {
    stages = emitStage(stages, 'rule_engine', onEvent, { status: 'skipped' })
    stages = emitStage(stages, 'llm_reconcile', onEvent, { status: 'skipped' })
    stages = emitStage(stages, 'insights', onEvent, { status: 'skipped' })
    stages = emitStage(stages, 'finalize', onEvent, { status: 'running' })
    const errorState: AssessmentState = {
      ...base,
      analysisMeta: {
        provider: 'none',
        generatedAt: new Date().toISOString(),
        error: 'Set VITE_GEMINI_API_KEY (AIza…) and/or VITE_GROQ_API_KEY (gsk_) in Netlify or .env',
        profileRevision: state.profileRevision,
      },
    }
    stages = emitStage(stages, 'finalize', onEvent, { status: 'error' })
    onEvent({ type: 'error', message: errorState.analysisMeta!.error! })
    return { nextState: errorState }
  }

  // —— rule engine ——
  stages = emitStage(stages, 'rule_engine', onEvent, { status: 'running' })
  const ruleScores = scoreAllCriteria(state.selectedCategories, profile)
  const rubricDigest = buildRuleBasedCriterionDigest(ruleScores)
  const criteriaStrong = ruleScores.filter((s) => s.strength === 'strong' || s.strength === 'moderate').length
  stages = appendLog(
    stages,
    'rule_engine',
    `Scored ${ruleScores.length} criteria · ${criteriaStrong} moderate+ baseline`,
    onEvent,
  )
  stages = appendLog(stages, 'rule_engine', `Digest ${rubricDigest.length} chars → LLM reconcile`, onEvent)
  await yieldToUi()
  stages = emitStage(stages, 'rule_engine', onEvent, {
    status: 'done',
    metrics: [
      { label: 'Criteria', value: ruleScores.length },
      { label: 'Moderate+', value: criteriaStrong },
    ],
  })

  // —— LLM reconcile ——
  stages = emitStage(stages, 'llm_reconcile', onEvent, { status: 'running' })
  stages = appendLog(stages, 'llm_reconcile', `Model stack: ${stackLine}`, onEvent)
  await yieldToUi()

  try {
    const personalized = await generatePersonalizedAnalysis(base)
    stages = appendLog(
      stages,
      'llm_reconcile',
      `Provider ${personalized.meta.provider} · model ${personalized.meta.model ?? '—'}`,
      onEvent,
    )
    stages = appendLog(
      stages,
      'llm_reconcile',
      `Output: ${personalized.gaps.length} gaps · ${personalized.roadmapActions.length} roadmap actions`,
      onEvent,
    )
    await yieldToUi()
    stages = emitStage(stages, 'llm_reconcile', onEvent, {
      status: 'done',
      metrics: [
        { label: 'Provider', value: personalized.meta.provider },
        { label: 'Gaps', value: personalized.gaps.length },
      ],
    })

    let counts = extractProfileMetricCounts({ ...base, ...personalized })
    const totalCounted = Object.values(counts).reduce((a, b) => a + b, 0)
    if (totalCounted < 4 && !isLlmOutputRequired()) {
      counts = deriveDemoMetricCounts(state.uploads.length, state.selectedCategories)
    }

    const afterLlm: AssessmentState = {
      ...base,
      parsedAchievements: personalized.parsedAchievements,
      evidenceItems: personalized.evidenceItems,
      criterionResults: personalized.criterionResults,
      gaps: personalized.gaps,
      recommendations: personalized.recommendations,
      riskFlags: personalized.riskFlags,
      roadmap: personalized.roadmapActions,
      quantifiedRoadmap: { current: counts, computedAt: new Date().toISOString() },
      analysisComplete: true,
      analysisMeta: personalized.meta,
    }

    // —— insights ——
    stages = emitStage(stages, 'insights', onEvent, { status: 'running' })
    stages = appendLog(stages, 'insights', 'Critical-path strategy synthesis…', onEvent)
    await yieldToUi()

    try {
      const { rows, meta } = await generateProfileInsights(afterLlm)
      stages = appendLog(stages, 'insights', `${rows.length} insight row(s) generated`, onEvent)
      stages = emitStage(stages, 'insights', onEvent, {
        status: 'done',
        metrics: [
          { label: 'Rows', value: rows.length },
          { label: 'Provider', value: meta.provider },
        ],
      })

      const finalState: AssessmentState = {
        ...afterLlm,
        profileInsights: rows,
        llmMeta: meta,
      }

      stages = emitStage(stages, 'finalize', onEvent, { status: 'running' })
      await yieldToUi()
      stages = emitStage(stages, 'finalize', onEvent, { status: 'done' })

      onEvent({
        type: 'complete',
        summary: {
          sectionsDetected: structuredProfile.sectionsDetected,
          signalClaims: profile.keyClaims.length,
          domains: techDomains,
          criteriaScored: ruleScores.length,
          analysisProvider: personalized.meta.provider,
          analysisModel: personalized.meta.model,
          insightsProvider: meta.provider,
          gaps: personalized.gaps.length,
          roadmapActions: personalized.roadmapActions.length,
        },
      })

      return { nextState: finalState }
    } catch (insightErr) {
      const message = insightErr instanceof Error ? insightErr.message : String(insightErr)
      const { rows } = ensureProfileInsightRows(afterLlm, [])
      stages = appendLog(
        stages,
        'insights',
        `Recovered ${rows.length} row(s) from analysis after: ${message.slice(0, 80)}`,
        onEvent,
      )
      stages = emitStage(stages, 'insights', onEvent, {
        status: 'done',
        metrics: [{ label: 'Rows', value: rows.length }, { label: 'Source', value: 'synthesis' }],
      })

      const recovered: AssessmentState = {
        ...afterLlm,
        profileInsights: rows,
        llmMeta: {
          provider: personalized.meta.provider === 'gemini' ? 'gemini' : 'groq',
          model: personalized.meta.model,
          generatedAt: new Date().toISOString(),
          error: `Insights LLM failed; ${rows.length} strategy rows synthesized from completed analysis.`,
          profileRevision: afterLlm.profileRevision,
        },
      }

      stages = emitStage(stages, 'finalize', onEvent, { status: 'running' })
      await yieldToUi()
      stages = emitStage(stages, 'finalize', onEvent, { status: 'done' })

      onEvent({
        type: 'complete',
        summary: {
          sectionsDetected: structuredProfile.sectionsDetected,
          signalClaims: profile.keyClaims.length,
          domains: techDomains,
          criteriaScored: ruleScores.length,
          analysisProvider: personalized.meta.provider,
          insightsProvider: recovered.llmMeta?.provider,
          gaps: personalized.gaps.length,
          roadmapActions: personalized.roadmapActions.length,
        },
      })

      return { nextState: recovered }
    }
  } catch (err) {
    const message =
      err instanceof LlmOutputRequiredError
        ? err.message
        : err instanceof Error
          ? err.message
          : String(err)
    stages = emitStage(stages, 'llm_reconcile', onEvent, { status: 'error' })
    stages = appendLog(stages, 'llm_reconcile', message, onEvent)
    onEvent({ type: 'error', message })
    return {
      nextState: {
        ...base,
        analysisMeta: {
          provider: 'none',
          generatedAt: new Date().toISOString(),
          error: message,
          profileRevision: state.profileRevision,
        },
      },
    }
  }
}
