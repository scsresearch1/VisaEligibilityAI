import { Link, useLocation } from 'react-router-dom'
import { Check, Lock } from 'lucide-react'
import { FLOW_PHASES, FLOW_STEPS, isStepUnlocked } from '../../lib/assessment-flow'
import { getStepInterimBadge, isStepOutputReady } from '../../lib/interim-step-counts'
import { useAssessment } from '../../context/AssessmentContext'

export default function AssessmentSidebar() {
  const { pathname } = useLocation()
  const { unlocks, state, readinessScore } = useAssessment()

  return (
    <aside className="w-full lg:w-72 shrink-0">
      <div className="glass-panel rounded-2xl p-5 sticky top-24">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Petition readiness</p>
          <div className="mt-2 flex items-end gap-2">
            <span className="text-3xl font-bold text-navy-900">{readinessScore}%</span>
            {state.analysisComplete && (
              <span className="text-xs text-emerald-600 font-medium mb-1">Analyzed</span>
            )}
          </div>
          <div className="mt-2 h-2 rounded-full bg-slate-200 overflow-hidden">
            <div
              className="h-full bg-gold-500 rounded-full transition-all duration-500"
              style={{ width: `${readinessScore}%` }}
            />
          </div>
        </div>

        <nav className="space-y-6">
          {FLOW_PHASES.map((phase) => {
            const steps = FLOW_STEPS.filter((s) => s.phase === phase.id)
            return (
              <div key={phase.id}>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">{phase.label}</p>
                <ul className="space-y-1">
                  {steps.map((step) => {
                    const unlocked = isStepUnlocked(step.id, unlocks)
                    const active = pathname === step.path
                    const done =
                      (step.id === 'upload' && state.uploads.length > 0) ||
                      (step.id === 'categories' && state.selectedCategories.length > 0) ||
                      (step.id === 'analysis' && state.analysisComplete) ||
                      (step.id === 'report' && state.reportGenerated) ||
                      isStepOutputReady(step.id, state)

                    const badge = getStepInterimBadge(step.id, state)

                    return (
                      <li key={step.id}>
                        {unlocked ? (
                          <Link
                            to={step.path}
                            className={[
                              'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
                              active
                                ? 'bg-navy-900 text-white font-medium'
                                : 'text-slate-600 hover:bg-slate-100 hover:text-navy-900',
                            ].join(' ')}
                          >
                            <span
                              className={[
                                'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold',
                                step.id === 'dossier' && active
                                  ? 'bg-gold-500 text-navy-900 ring-2 ring-gold-300'
                                  : done
                                    ? 'bg-emerald-500 text-white'
                                    : active
                                      ? 'bg-gold-400 text-navy-900'
                                      : 'bg-slate-200 text-slate-600',
                              ].join(' ')}
                              title={
                                state.analysisComplete && step.id !== 'upload' && step.id !== 'categories'
                                  ? `${badge} interim outputs`
                                  : undefined
                              }
                            >
                              {done ? <Check className="h-3 w-3" /> : badge}
                            </span>
                            <span className="truncate">
                              {step.stepNumber}. {step.shortTitle}
                            </span>
                          </Link>
                        ) : (
                          <span className="flex items-center gap-2 px-3 py-2 text-sm text-slate-400">
                            <Lock className="h-4 w-4 shrink-0" />
                            <span className="truncate">
                              {step.stepNumber}. {step.shortTitle}
                            </span>
                          </span>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </div>
            )
          })}
        </nav>
      </div>
    </aside>
  )
}
