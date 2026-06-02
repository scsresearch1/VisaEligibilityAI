import type { AssessmentState, RoadmapAction, VisaCategory } from '../../types/assessment'
import type { LlmScientificAnalysis } from '../scientific-assessment/reconcile'
import { isGeminiReady } from './llm-router'
import { parseAnalysisJson } from './parse-analysis-json'
import { callGeminiWithPrompts } from './providers/gemini'
import { callGroqWithPrompts } from './providers/groq'

/**
 * Groq often truncates large JSON before roadmapActions when max_tokens is tight.
 * Second focused call returns only the roadmap array.
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
    .slice(0, 8)
    .map((g) => `- ${g.title}: ${g.description.slice(0, 120)}`)
    .join('\n')
  const criteriaLines = (parsed.criterionEvaluations ?? [])
    .slice(0, 12)
    .map((c) => `- ${c.criterionId}: score ${c.evidenceScore}`)
    .join('\n')

  const system = [
    `Return ONLY valid JSON: {"roadmapActions":[...]} with exactly 6-8 items for ${visa}.`,
    'Each action: priority, title, domain, evidenceArea, deliverableOutline, description, timeframe, expectedReadinessGain, category, visaCategory, deliverableSpec.',
    'deliverableSpec: publications→suggestedTitles; patents/product→outline+domain. Use the candidate field from profile — no generic Healthcare templates.',
  ].join(' ')

  const user = [
    'Build roadmap from this assessment (profile-specific only):',
    profileSnippet.slice(0, 3500),
    '',
    'Gaps:',
    gapLines || '(derive from criteria)',
    '',
    'Criteria:',
    criteriaLines || '(use profile)',
  ].join('\n')

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
      /* fall through to Groq */
    }
  }

  try {
    const raw = await callGroqWithPrompts(system, user, 'roadmap-only')
    return tryParse(raw)
  } catch {
    return undefined
  }
}
