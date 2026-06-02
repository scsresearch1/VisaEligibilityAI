import type { VisaCategory } from '../types/assessment'

export type FlowStepId =
  | 'upload'
  | 'categories'
  | 'analysis'
  | 'insights'
  | 'evidence'
  | 'checklist'
  | 'gaps'
  | 'recommendations'
  | 'report'
  | 'roadmap'
  | 'dossier'

export interface FlowStep {
  id: FlowStepId
  /** Sequential position in the workflow (1-based, matches user-facing order) */
  stepNumber: number
  path: string
  title: string
  shortTitle: string
  description: string
  /** @deprecated Internal legacy IDs — use stepNumber in UI */
  featureIds: number[]
  phase: 'intake' | 'analysis' | 'review' | 'improve' | 'deliver' | 'export'
  hidden?: boolean
}

export const FLOW_STEP_COUNT = 11

export const FLOW_PHASES = [
  { id: 'intake', label: 'Intake' },
  { id: 'analysis', label: 'Analysis' },
  { id: 'review', label: 'Evidence review' },
  { id: 'improve', label: 'Gaps & build plan' },
  { id: 'deliver', label: 'Report & roadmap' },
  { id: 'export', label: 'Export' },
] as const

export const FLOW_STEPS: FlowStep[] = [
  {
    id: 'upload',
    stepNumber: 1,
    path: '/assessment/upload',
    title: 'Profile Upload',
    shortTitle: 'Upload',
    description:
      'Profile intake only (resume, LinkedIn export). Used to quantify what the consulting team must build — not to substitute for building papers, patents, or products.',
    featureIds: [1],
    phase: 'intake',
  },
  {
    id: 'categories',
    stepNumber: 2,
    path: '/assessment/categories',
    title: 'Visa Category Selection',
    shortTitle: 'Categories',
    description: 'Select EB-1A, EB-1B, and/or EB-1C for multi-pathway evaluation.',
    featureIds: [2],
    phase: 'intake',
  },
  {
    id: 'analysis',
    stepNumber: 3,
    path: '/assessment/analysis',
    title: 'Deep Profile Parsing',
    shortTitle: 'Parsing',
    description:
      'Extract profile signals and quantify build quantities — papers, patents, products the team must create (not collect).',
    featureIds: [3],
    phase: 'analysis',
  },
  {
    id: 'insights',
    stepNumber: 4,
    path: '/assessment/insights',
    title: 'Profile Strategy Insights',
    shortTitle: 'Insights',
    description: 'Strategy table: categories, actions, consulting services, and regulatory basis.',
    featureIds: [4],
    phase: 'analysis',
  },
  {
    id: 'evidence',
    stepNumber: 5,
    path: '/assessment/evidence',
    title: 'Evidence Detection & Scoring',
    shortTitle: 'Evidence',
    description: 'Map documents to criteria and score evidence strength.',
    featureIds: [5],
    phase: 'review',
  },
  {
    id: 'checklist',
    stepNumber: 6,
    path: '/assessment/checklist',
    title: 'Criterion-Wise Checklist',
    shortTitle: 'Checklist',
    description: 'Per-criterion satisfaction status for each visa category.',
    featureIds: [6],
    phase: 'review',
  },
  {
    id: 'gaps',
    stepNumber: 7,
    path: '/assessment/gaps',
    title: 'Gap Analysis',
    shortTitle: 'Gaps',
    description: 'Missing evidence, weak claims, and documentation gaps.',
    featureIds: [7],
    phase: 'improve',
  },
  {
    id: 'recommendations',
    stepNumber: 8,
    path: '/assessment/recommendations',
    title: 'Evidence Build Plan',
    shortTitle: 'Build plan',
    description:
      'Quantified deliverables the consulting team must produce (publish, file, ship, document) matched to this profile.',
    featureIds: [8],
    phase: 'improve',
  },
  {
    id: 'report',
    stepNumber: 9,
    path: '/assessment/report',
    title: 'Readiness Benchmark Report',
    shortTitle: 'Report',
    description: 'Quantified evidence-based readiness report for professional review.',
    featureIds: [9],
    phase: 'deliver',
  },
  {
    id: 'roadmap',
    stepNumber: 10,
    path: '/assessment/roadmap',
    title: 'Profile Improvement Roadmap',
    shortTitle: 'Roadmap',
    description: 'Action plan to improve petition readiness before professional submission review.',
    featureIds: [10],
    phase: 'deliver',
  },
  {
    id: 'dossier',
    stepNumber: 11,
    path: '/assessment/dossier',
    title: 'Professional Review Dossier',
    shortTitle: 'Dossier',
    description:
      'Single PDF combining the readiness benchmark report and profile improvement roadmap for sharing.',
    featureIds: [11],
    phase: 'export',
  },
]

export function getStepIndex(stepId: FlowStepId): number {
  return FLOW_STEPS.findIndex((s) => s.id === stepId)
}

export function getFlowStep(stepId: FlowStepId): FlowStep {
  const step = FLOW_STEPS.find((s) => s.id === stepId)
  if (!step) throw new Error(`Unknown step: ${stepId}`)
  return step
}

export function getStepNumber(stepId: FlowStepId): number {
  return getFlowStep(stepId).stepNumber
}

/** e.g. "Step 4 of 11 · Profile Strategy Insights" */
export function formatStepCaption(stepId: FlowStepId): string {
  const step = getFlowStep(stepId)
  return `Step ${step.stepNumber} of ${FLOW_STEP_COUNT} · ${step.title}`
}

export function getNextStep(stepId: FlowStepId): FlowStep | undefined {
  const idx = getStepIndex(stepId)
  return FLOW_STEPS[idx + 1]
}

export function getPrevStep(stepId: FlowStepId): FlowStep | undefined {
  const idx = getStepIndex(stepId)
  return idx > 0 ? FLOW_STEPS[idx - 1] : undefined
}

export interface StepUnlockState {
  uploads: boolean
  categories: boolean
  analysis: boolean
  insights: boolean
  evidence: boolean
  checklist: boolean
  gaps: boolean
  recommendations: boolean
  report: boolean
  roadmap: boolean
  dossier: boolean
}

export function computeUnlocks(state: {
  uploadsCount: number
  categoriesCount: number
  analysisComplete: boolean
  reportGenerated: boolean
}): StepUnlockState {
  const hasUploads = state.uploadsCount > 0
  const hasCategories = state.categoriesCount > 0
  const analyzed = state.analysisComplete

  return {
    uploads: true,
    categories: hasUploads,
    analysis: hasUploads && hasCategories,
    insights: analyzed,
    evidence: analyzed,
    checklist: analyzed,
    gaps: analyzed,
    recommendations: analyzed,
    report: analyzed,
    roadmap: analyzed,
    dossier: analyzed,
  }
}

const STEP_UNLOCK_KEY: Record<FlowStepId, keyof StepUnlockState> = {
  upload: 'uploads',
  categories: 'categories',
  analysis: 'analysis',
  insights: 'insights',
  evidence: 'evidence',
  checklist: 'checklist',
  gaps: 'gaps',
  recommendations: 'recommendations',
  report: 'report',
  roadmap: 'roadmap',
  dossier: 'dossier',
}

export function isStepUnlocked(stepId: FlowStepId, unlocks: StepUnlockState): boolean {
  return unlocks[STEP_UNLOCK_KEY[stepId]]
}

export function getVisibleSteps(unlocks: StepUnlockState): FlowStep[] {
  return FLOW_STEPS.filter(
    (step) =>
      isStepUnlocked(step.id, unlocks) ||
      step.id === 'upload' ||
      (step.id === 'categories' && unlocks.categories),
  )
}

export function formatVisaCategories(categories: VisaCategory[]): string {
  return categories.join(', ') || 'None selected'
}

/** Hidden UI sections until attorney report is generated */
export function showAdvancedInsights(reportGenerated: boolean): boolean {
  return reportGenerated
}
