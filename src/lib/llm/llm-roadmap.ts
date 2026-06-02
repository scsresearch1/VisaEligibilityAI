import type { RoadmapAction, VisaCategory } from '../../types/assessment'
import { LlmOutputRequiredError } from './llm-output-policy'

/** Use LLM roadmapActions as-is (no heuristic merge or template backfill). */
export function normalizeLlmRoadmapActions(
  actions: RoadmapAction[] | undefined,
  defaultVisa: VisaCategory,
): RoadmapAction[] {
  if (!actions?.length) {
    throw new LlmOutputRequiredError(
      'LLM analysis did not return roadmapActions (response may have been truncated). Add a valid VITE_GEMINI_API_KEY (AIza…) for fallback, or redeploy after the latest build.',
    )
  }

  return actions
    .map((a, i) => ({
      ...a,
      id: a.id?.trim() || `plan-llm-${i}`,
      priority: Math.max(1, Number(a.priority) || i + 1),
      visaCategory: (['EB1A', 'EB1B', 'EB1C'].includes(String(a.visaCategory))
        ? a.visaCategory
        : defaultVisa) as VisaCategory,
    }))
    .sort((a, b) => a.priority - b.priority)
    .map((a, i) => ({ ...a, priority: i + 1 }))
}
