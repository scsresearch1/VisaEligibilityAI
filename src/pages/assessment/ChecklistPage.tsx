import { VISA_CRITERIA, VISA_CATEGORY_INFO } from '../../data/visa-criteria'
import { useAssessment } from '../../context/AssessmentContext'
import { StepGuard } from '../../hooks/useStepGuard'
import { StatusBadge, StrengthBadge } from '../../components/assessment/StrengthBadge'
import StepInterimHeader from '../../components/assessment/StepInterimHeader'
import StepNavigation from '../../components/assessment/StepNavigation'
import type { CriterionResult, VisaCategory } from '../../types/assessment'

export default function ChecklistPage() {
  return (
    <StepGuard stepId="checklist">
      <ChecklistContent />
    </StepGuard>
  )
}

function ChecklistContent() {
  const { state } = useAssessment()

  const partial = state.criterionResults.filter((r) => r.status === 'partial').length
  const missing = state.criterionResults.filter((r) => r.status === 'missing').length

  return (
    <>
      <StepInterimHeader stepId="checklist" />

      <div className="mt-6 grid sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200 p-4 bg-white">
          <p className="text-2xl font-bold text-navy-900">{state.criterionResults.length}</p>
          <p className="text-xs text-slate-500 mt-1">Criteria evaluated</p>
        </div>
        <div className="rounded-xl border border-amber-200 p-4 bg-amber-50">
          <p className="text-2xl font-bold text-amber-800">{partial}</p>
          <p className="text-xs text-slate-600 mt-1">Partially satisfied</p>
        </div>
        <div className="rounded-xl border border-red-200 p-4 bg-red-50">
          <p className="text-2xl font-bold text-red-700">{missing}</p>
          <p className="text-xs text-slate-600 mt-1">Missing / unsupported</p>
        </div>
      </div>

      {state.selectedCategories.map((cat) => (
        <CategoryChecklist
          key={cat}
          category={cat}
          results={state.criterionResults}
        />
      ))}

      <StepNavigation stepId="checklist" />
    </>
  )
}

function CategoryChecklist({
  category,
  results,
}: {
  category: VisaCategory
  results: CriterionResult[]
}) {
  const info = VISA_CATEGORY_INFO[category]
  const criteria = VISA_CRITERIA.filter((c) => c.category === category)
  const satisfied = results.filter(
    (r) => criteria.some((c) => c.id === r.criterionId) && r.status === 'satisfied',
  ).length

  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-end justify-between gap-2 mb-4">
        <h2 className="text-lg font-semibold text-navy-900">{info.title}</h2>
        <p className="text-sm text-slate-600">
          {satisfied} / {info.minCriteria} minimum required ({criteria.length} total criteria)
        </p>
      </div>
      <ul className="space-y-3">
        {criteria.map((c) => {
          const result = results.find((r) => r.criterionId === c.id)
          if (!result) return null
          return (
            <li key={c.id} className="rounded-xl border border-slate-200 p-4 bg-white">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <span className="text-xs font-mono text-slate-500">{c.code}</span>
                  <p className="font-medium text-navy-900">{c.title}</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <StatusBadge status={result.status} />
                  <StrengthBadge strength={result.strength} />
                </div>
              </div>
              <p className="mt-2 text-sm text-slate-600">{result.summary}</p>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
