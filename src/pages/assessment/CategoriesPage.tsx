import { useNavigate } from 'react-router-dom'
import { Check, AlertCircle } from 'lucide-react'
import { VISA_CATEGORY_INFO, VISA_CRITERIA } from '../../data/visa-criteria'
import { useAssessment } from '../../context/AssessmentContext'
import type { VisaCategory } from '../../types/assessment'
import { StepGuard } from '../../hooks/useStepGuard'
import EligibilityRulesPanel from '../../components/assessment/EligibilityRulesPanel'
import StepNavigation, { StepHeader } from '../../components/assessment/StepNavigation'

const CATEGORIES: VisaCategory[] = ['EB1A', 'EB1B', 'EB1C']

export default function CategoriesPage() {
  return (
    <StepGuard stepId="categories">
      <CategoriesContent />
    </StepGuard>
  )
}

function CategoriesContent() {
  const navigate = useNavigate()
  const { state, toggleCategory } = useAssessment()
  const hasSelection = state.selectedCategories.length > 0

  const handleContinue = () => {
    if (!hasSelection) return
    navigate('/assessment/analysis')
  }

  return (
    <>
      <StepHeader stepId="categories" />
      <h1 className="text-2xl font-bold text-navy-900">Visa Category Selection</h1>
      <p className="mt-2 text-slate-600 max-w-2xl">
        Evaluate the same profile against multiple EB-1 pathways. Select all categories that apply;
        criteria checklists follow official pathway rules (EB-1A: 3+ of 12; EB-1B: 2+ of 6; EB-1C: 4 duty criteria).
      </p>

      {!hasSelection && (
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <p>
            <strong>Select at least one visa category</strong> by clicking a card below, then press
            Continue.
          </p>
        </div>
      )}

      {hasSelection && (
        <p className="mt-4 text-sm text-emerald-700 font-medium">
          Selected: {state.selectedCategories.join(', ')}
        </p>
      )}

      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        {CATEGORIES.map((cat) => {
          const info = VISA_CATEGORY_INFO[cat]
          const selected = state.selectedCategories.includes(cat)
          const count = VISA_CRITERIA.filter((c) => c.category === cat).length

          return (
            <button
              key={cat}
              type="button"
              onClick={() => toggleCategory(cat)}
              className={[
                'text-left rounded-2xl border-2 p-6 transition-all',
                selected
                  ? 'border-navy-900 bg-navy-900/5 shadow-lg'
                  : 'border-slate-200 bg-white hover:border-navy-700/30',
              ].join(' ')}
            >
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold uppercase tracking-widest text-gold-600">{cat}</span>
                {selected && (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-navy-900 text-white">
                    <Check className="h-4 w-4" />
                  </span>
                )}
              </div>
              <h3 className="mt-3 font-semibold text-navy-900">{info.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{info.subtitle}</p>
              <p className="mt-4 text-xs text-slate-500">
                {count} criteria · need {info.minCriteria}+ satisfied
              </p>
            </button>
          )
        })}
      </div>

      {state.selectedCategories.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold text-navy-900 mb-4">Official pathway eligibility rules</h2>
          <EligibilityRulesPanel categories={state.selectedCategories} compact />
        </section>
      )}

      <StepNavigation
        stepId="categories"
        nextDisabled={!hasSelection}
        onNext={handleContinue}
      />
    </>
  )
}
