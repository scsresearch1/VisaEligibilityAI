import { formatStepCaption, getFlowStep, type FlowStepId } from '../../lib/assessment-flow'
import { getDisplayCandidateName } from '../../lib/candidate-display'
import { generateBenchmarkReport } from '../../lib/benchmark-report'
import { useAssessment } from '../../context/AssessmentContext'
import { displaySubmissionReadyStatus } from '../../lib/user-facing-labels'
import { UI_COPY } from '../../lib/ui-copy'

interface StepInterimHeaderProps {
  stepId: FlowStepId
  title?: string
  description?: string
}

export default function StepInterimHeader({
  stepId,
  title,
  description,
}: StepInterimHeaderProps) {
  const { state } = useAssessment()
  const candidateName = getDisplayCandidateName(state)
  const preview =
    state.selectedCategories.includes('EB1A') && state.analysisComplete
      ? state.benchmarkReport ?? generateBenchmarkReport(state)
      : null

  const flowStep = getFlowStep(stepId)

  return (
    <>
      <p className="text-xs font-semibold uppercase tracking-widest text-gold-600 mb-2">
        {formatStepCaption(stepId)}
      </p>
      <h1 className="text-2xl font-bold text-navy-900">{title ?? flowStep.title}</h1>
      <p className="mt-2 text-slate-600 max-w-2xl">{description ?? flowStep.description}</p>

      {state.analysisComplete && (
        <div className="mt-6 rounded-xl bg-navy-900 text-white p-5 grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-white/60 text-xs">Candidate</p>
            <p className="font-semibold mt-0.5">{candidateName}</p>
          </div>
          <div>
            <p className="text-white/60 text-xs">EB1A readiness</p>
            <p className="font-bold text-gold-400 mt-0.5">
              {preview?.baseline.readinessScore ?? '—'} / 100
            </p>
          </div>
          <div>
            <p className="text-white/60 text-xs">{UI_COPY.legalReadyLabel}</p>
            <p className="font-semibold mt-0.5 text-amber-300">
              {displaySubmissionReadyStatus(preview?.baseline.attorneyReadyStatus)}
            </p>
          </div>
          <div>
            <p className="text-white/60 text-xs">Assets to build</p>
            <p className="font-bold mt-0.5">{preview?.totalAssetsToBuild ?? '—'}</p>
          </div>
        </div>
      )}
    </>
  )
}
