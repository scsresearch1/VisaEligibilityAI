import { ChevronLeft, ChevronRight } from 'lucide-react'
import Button from '../ui/Button'
import {
  formatStepCaption,
  getNextStep,
  getPrevStep,
  type FlowStepId,
} from '../../lib/assessment-flow'

interface StepNavigationProps {
  stepId: FlowStepId
  nextDisabled?: boolean
  nextLabel?: string
  onNext?: () => void
}

export default function StepNavigation({
  stepId,
  nextDisabled,
  nextLabel = 'Continue',
  onNext,
}: StepNavigationProps) {
  const prev = getPrevStep(stepId)
  const next = getNextStep(stepId)

  return (
    <div className="flex flex-col sm:flex-row justify-between gap-4 pt-8 mt-8 border-t border-slate-200">
      {prev ? (
        <Button to={prev.path} variant="ghost" size="md">
          <ChevronLeft className="h-4 w-4" />
          {prev.shortTitle}
        </Button>
      ) : (
        <div />
      )}
      {next &&
        (onNext ? (
          <Button variant="secondary" size="md" onClick={onNext} disabled={nextDisabled}>
            {nextLabel}
            <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button to={next.path} variant="secondary" size="md" disabled={nextDisabled}>
            {nextLabel}
            <ChevronRight className="h-4 w-4" />
          </Button>
        ))}
    </div>
  )
}

export function StepHeader({ stepId }: { stepId: FlowStepId }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-widest text-gold-600 mb-2">
      {formatStepCaption(stepId)}
    </p>
  )
}
