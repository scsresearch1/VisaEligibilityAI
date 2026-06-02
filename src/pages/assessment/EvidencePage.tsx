import { VISA_CRITERIA } from '../../data/visa-criteria'
import { useAssessment } from '../../context/AssessmentContext'
import { StepGuard } from '../../hooks/useStepGuard'
import { StrengthBadge } from '../../components/assessment/StrengthBadge'
import StepInterimHeader from '../../components/assessment/StepInterimHeader'
import StepNavigation from '../../components/assessment/StepNavigation'

export default function EvidencePage() {
  return (
    <StepGuard stepId="evidence">
      <EvidenceContent />
    </StepGuard>
  )
}

function EvidenceContent() {
  const { state } = useAssessment()
  const buildCount = state.evidenceItems.filter(
    (e) => e.strength === 'missing' || e.strength === 'unsupported' || e.strength === 'weak',
  ).length
  const partialCount = state.evidenceItems.filter((e) => e.strength === 'moderate').length

  return (
    <>
      <StepInterimHeader
        stepId="evidence"
        title="Evidence Detection & Strength Scoring"
        description="Resume signals mapped to EB-1A criteria. Moderate strength means career substance exists but exhibits must be built — not only collected."
      />

      <div className="mt-6 grid sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200 p-4 bg-white">
          <p className="text-2xl font-bold text-navy-900">{state.evidenceItems.length}</p>
          <p className="text-xs text-slate-500 mt-1">Criteria mapped</p>
        </div>
        <div className="rounded-xl border border-amber-200 p-4 bg-amber-50">
          <p className="text-2xl font-bold text-amber-800">{partialCount}</p>
          <p className="text-xs text-slate-600 mt-1">Partial (resume signal only)</p>
        </div>
        <div className="rounded-xl border border-red-200 p-4 bg-red-50">
          <p className="text-2xl font-bold text-red-700">{buildCount}</p>
          <p className="text-xs text-slate-600 mt-1">Must be built (not collected)</p>
        </div>
      </div>

      <div className="mt-8 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wider text-slate-500">
              <th className="pb-3 pr-4">Criterion</th>
              <th className="pb-3 pr-4">Evidence</th>
              <th className="pb-3">Strength</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {state.evidenceItems.map((ev) => {
              const criterion = VISA_CRITERIA.find((c) => c.id === ev.criterionId)
              return (
                <tr key={ev.id}>
                  <td className="py-4 pr-4 align-top">
                    <p className="font-medium text-navy-900">{criterion?.code} — {criterion?.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{criterion?.category}</p>
                  </td>
                  <td className="py-4 pr-4 align-top text-slate-600 max-w-xs">{ev.label}</td>
                  <td className="py-4 align-top">
                    <StrengthBadge strength={ev.strength} />
                    <p className="text-xs text-slate-500 mt-2">{ev.notes}</p>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <StepNavigation stepId="evidence" />
    </>
  )
}
