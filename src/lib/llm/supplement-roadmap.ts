import type { AssessmentState, RoadmapAction, VisaCategory } from '../../types/assessment'
import type { LlmScientificAnalysis } from '../scientific-assessment/reconcile'
import { isGeminiReady } from './llm-router'
import { parseAnalysisJson } from './parse-analysis-json'
import { callGeminiWithPrompts } from './providers/gemini'
import { callGroqWithPrompts, delayBetweenGroqCalls } from './providers/groq'

/**
 * Second call when main JSON omitted roadmapActions. Prefer Gemini to avoid stacking Groq TPM.
 */
export async function supplementRoadmapActionsIfMissing(
  state: AssessmentState,
  parsed: LlmScientificAnalysis & { roadmapActions?: RoadmapAction[] },
  profileSnippet: string,
): Promise<RoadmapAction[] | undefined> {
  if (parsed.roadmapActions?.length) {
    return parsed.roadmapActions
  }

  const visa: VisaCategory = state.selectedCategories[0] ?? 'EB1A'
  const gapLines = (parsed.gaps ?? [])
    .slice(0, 6)
    .map((g) => `- ${g.title}`)
    .join('\n')
  const criteriaLines = (parsed.criterionEvaluations ?? [])
    .slice(0, 8)
    .map((c) => `- ${c.criterionId}: ${c.evidenceScore}`)
    .join('\n')

  const system = `Return ONLY JSON: {"roadmapActions":[...]} — 6-8 ${visa} actions with deliverableSpec (profile-specific).`
  const user = [
    profileSnippet.slice(0, 2500),
    gapLines ? `Gaps:\n${gapLines}` : '',
    criteriaLines ? `Criteria:\n${criteriaLines}` : '',
  ]
    .filter(Boolean)
    .join('\n\n')

  const tryParse = (raw: string): RoadmapAction[] | undefined => {
    const mini = parseAnalysisJson(raw, state.selectedCategories)
    return mini.roadmapActions?.length ? mini.roadmapActions : undefined
  }

  if (isGeminiReady()) {
    try {
      const res = await callGeminiWithPrompts(system, user)
      const actions = tryParse(res.text)
      if (actions?.length) return actions
    } catch {
      /* try Groq after cooldown */
    }
  }

  await delayBetweenGroqCalls()
  try {
    const raw = await callGroqWithPrompts(system, user, 'roadmap-only')
    return tryParse(raw)
  } catch {
    return undefined
  }
}
