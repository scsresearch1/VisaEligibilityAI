import type { AssessmentState } from '../../types/assessment'
import { buildBenchmarkFactContext } from '../benchmark-report/reconcile-benchmark-payload'
import { buildEvidenceBuildPlan } from '../evidence-build-plan'

export function buildBenchmarkUserPrompt(
  state: AssessmentState,
  profileContext: string,
): string {
  const plan = buildEvidenceBuildPlan(state)
  const buildSummary = plan.items
    .filter((i) => i.quantityToBuild > 0)
    .map((i) => `${i.title}: build ${i.quantityToBuild} (index ${i.currentScore}→${i.targetScore})`)
    .join('\n')

  return [
    'TASK: Produce benchmark readiness JSON for this candidate only.',
    '',
    buildBenchmarkFactContext(state),
    '',
    'COMPLETED ASSESSMENT (use for scores and gaps — do not contradict):',
    profileContext,
    '',
    'EVIDENCE BUILD PLAN SUMMARY:',
    buildSummary || '(run analysis first)',
    '',
    'RULES:',
    '- roadmapTable: exactly 12 standard areas in order; quantityToBuild = new assets consulting must produce.',
    '- currentScore must reflect documented profile evidence only; weak criteria → low scores.',
    '- consultingResponsibility must cite employers, roles, or publications from VERIFIED FACT INVENTORY.',
    '- Do NOT invent employers, products, paper titles, or wrong-field (e.g. healthcare) content.',
    '- baseline.readinessScore should align with criterion rubric in context (typically 35–72 pre-build).',
  ].join('\n')
}
