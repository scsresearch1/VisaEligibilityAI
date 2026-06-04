import { appConfig } from '../../config/app.config'
import type { VisaCategory } from '../../types/assessment'
import {
  buildScientificAnalysisSystemPromptGroqCore,
  buildScientificAnalysisSystemPromptGroqRoadmap,
} from '../scientific-assessment/prompts'
import { buildScientificAnalysisUserPrompt } from '../scientific-assessment/build-analysis-user-prompt'
import type { ExtractedProfileSignals } from '../benchmark-report/extract-profile'
import type { StructuredResumeProfile } from '../resume-deep-extract'
import { callGroqWithPrompts } from './providers/groq'
import { parseAnalysisJson } from './parse-analysis-json'
import type { LlmTextResult } from './llm-types'

export interface GroqSplitAnalysisInput {
  categories: VisaCategory[]
  profile: ExtractedProfileSignals
  structured?: StructuredResumeProfile | null
  profileContext: string
  rubricDigest: string
}

/** Two Groq calls (core + roadmap) to stay within on_demand token limits. */
export async function callGroqSplitScientificAnalysis(
  input: GroqSplitAnalysisInput,
): Promise<LlmTextResult> {
  const userCore = buildScientificAnalysisUserPrompt({
    categories: input.categories,
    profileContext: input.profileContext,
    profile: input.profile,
    structured: input.structured,
    forGroq: true,
    phase: 'core',
  })

  const coreRaw = await callGroqWithPrompts(
    buildScientificAnalysisSystemPromptGroqCore(input.categories),
    userCore,
    'analysis-core',
  )
  const coreParsed = parseAnalysisJson(coreRaw, input.categories)

  const gapLines = (coreParsed.gaps ?? [])
    .slice(0, 8)
    .map((g) => `- [${g.severity}] ${g.criterionId ?? ''}: ${g.title}`)
    .join('\n')

  const userRoadmap = buildScientificAnalysisUserPrompt({
    categories: input.categories,
    profileContext: input.profileContext,
    profile: input.profile,
    structured: input.structured,
    forGroq: true,
    phase: 'roadmap',
    gapSummaryForRoadmap: gapLines
      ? `Prior gaps from core assessment:\n${gapLines}\n\n${input.rubricDigest.slice(0, 800)}`
      : input.rubricDigest.slice(0, 1200),
  })

  const roadmapRaw = await callGroqWithPrompts(
    buildScientificAnalysisSystemPromptGroqRoadmap(input.categories),
    userRoadmap,
    'roadmap-only',
  )
  const roadmapParsed = parseAnalysisJson(roadmapRaw, input.categories)

  const merged = {
    ...coreParsed,
    roadmapActions: roadmapParsed.roadmapActions ?? [],
  }

  return {
    text: JSON.stringify(merged),
    provider: 'groq',
    model: appConfig.llm.groqModel,
    note: 'Groq used split calls (core assessment + roadmap) to complete analysis within token limits.',
  }
}
