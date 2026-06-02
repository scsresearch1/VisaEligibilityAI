import { Hammer } from 'lucide-react'
import BuildPrincipleBanner from '../../components/assessment/BuildPrincipleBanner'
import { useAssessment } from '../../context/AssessmentContext'
import { StepGuard } from '../../hooks/useStepGuard'
import StepInterimHeader from '../../components/assessment/StepInterimHeader'
import StepNavigation from '../../components/assessment/StepNavigation'
import { UI_COPY } from '../../lib/ui-copy'

const priorityColors = {
  critical: 'bg-red-100 text-red-800',
  high: 'bg-orange-100 text-orange-800',
  medium: 'bg-amber-100 text-amber-800',
}

export default function RecommendationsPage() {
  return (
    <StepGuard stepId="recommendations">
      <RecommendationsContent />
    </StepGuard>
  )
}

function RecommendationsContent() {
  const { state } = useAssessment()
  const totalImpact = state.recommendations.reduce((s, r) => s + r.estimatedImpactPercent, 0)
  return (
    <>
      <StepInterimHeader
        stepId="recommendations"
        title={UI_COPY.recommendationsTitle}
        description={UI_COPY.recommendationsDescription}
      />

      <div className="mt-4">
        <BuildPrincipleBanner compact />
      </div>

      <div className="mt-6 rounded-xl bg-navy-900 text-white p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-white/70">Projected readiness uplift when build plan is executed</p>
          <p className="text-3xl font-bold text-gold-400 mt-1">+{totalImpact}%</p>
        </div>
        <p className="text-sm text-white/60 max-w-md">
          Each row is a deliverable the consulting team must produce — papers, patents, products, etc. — matched to this profile.
        </p>
      </div>

      <ul className="mt-8 space-y-4">
        {state.recommendations.map((rec) => (
          <li key={rec.id} className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-navy-900/5">
                <Hammer className="h-5 w-5 text-navy-900" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-navy-900">{rec.documentType}</h3>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${priorityColors[rec.priority]}`}>
                    {rec.priority}
                  </span>
                  <span className="text-xs text-slate-500">{rec.category}</span>
                </div>
                <p className="mt-1 text-sm text-slate-600">{rec.purpose}</p>
                <div className="mt-4 flex flex-wrap gap-4 text-sm">
                  <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2">
                    <span className="text-emerald-800 font-bold">+{rec.estimatedImpactPercent}%</span>
                    <span className="text-emerald-700 ml-1">estimated impact</span>
                  </div>
                  <p className="text-slate-600 flex items-center">{rec.quantifiedBenefit}</p>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <StepNavigation stepId="recommendations" />
    </>
  )
}
