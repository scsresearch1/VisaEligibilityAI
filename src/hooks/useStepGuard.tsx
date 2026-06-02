import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAssessment } from '../context/AssessmentContext'
import { isStepUnlocked, type FlowStepId } from '../lib/assessment-flow'

export function useStepGuard(stepId: FlowStepId) {
  const { unlocks } = useAssessment()
  const unlocked = isStepUnlocked(stepId, unlocks)
  let redirectTo = '/assessment/upload'
  if (!unlocks.categories) {
    redirectTo = '/assessment/upload'
  } else if (!unlocks.analysis) {
    redirectTo = '/assessment/categories'
  } else if (
    [
      'insights',
      'evidence',
      'checklist',
      'gaps',
      'recommendations',
      'report',
      'roadmap',
      'dossier',
    ].includes(stepId)
  ) {
    redirectTo = '/assessment/analysis'
  }

  return { unlocked, redirectTo }
}

export function StepGuard({ stepId, children }: { stepId: FlowStepId; children: ReactNode }) {
  const { unlocked, redirectTo } = useStepGuard(stepId)
  if (!unlocked) return <Navigate to={redirectTo} replace />
  return children
}
