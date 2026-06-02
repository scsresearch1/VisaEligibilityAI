import { AlertTriangle } from 'lucide-react'
import { useAssessment } from '../../context/AssessmentContext'
import { StepGuard } from '../../hooks/useStepGuard'
import BenchmarkRoadmapPreviewTable from '../../components/assessment/BenchmarkRoadmapPreviewTable'
import StepInterimHeader from '../../components/assessment/StepInterimHeader'
import StepNavigation from '../../components/assessment/StepNavigation'
import { generateBenchmarkReport } from '../../lib/benchmark-report'

const severityStyles = {
  critical: 'border-red-300 bg-red-50',
  high: 'border-orange-300 bg-orange-50',
  medium: 'border-amber-200 bg-amber-50',
}

export default function GapsPage() {
  return (
    <StepGuard stepId="gaps">
      <GapsContent />
    </StepGuard>
  )
}

function GapsContent() {
  const { state } = useAssessment()
  const totalImpact = state.gaps.reduce((s, g) => s + g.impactScore, 0)
  const benchmark =
    state.selectedCategories.includes('EB1A') && state.analysisComplete
      ? state.benchmarkReport ?? generateBenchmarkReport(state)
      : null

  return (
    <>
      <StepInterimHeader
        stepId="gaps"
        description="Profile-building gaps — papers, patents, products, articles, judging, and remuneration evidence. Consulting team responsibility: build legitimate assets, not only collect files."
      />

      <div className="mt-6 grid sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200 p-4 bg-white">
          <p className="text-2xl font-bold text-navy-900">{state.gaps.length}</p>
          <p className="text-xs text-slate-500 mt-1">Gaps identified</p>
        </div>
        <div className="rounded-xl border border-slate-200 p-4 bg-white">
          <p className="text-2xl font-bold text-red-600">
            {state.gaps.filter((g) => g.severity === 'critical').length}
          </p>
          <p className="text-xs text-slate-500 mt-1">Critical</p>
        </div>
        <div className="rounded-xl border border-slate-200 p-4 bg-white">
          <p className="text-2xl font-bold text-navy-900">{totalImpact}</p>
          <p className="text-xs text-slate-500 mt-1">Combined impact score</p>
        </div>
      </div>

      <ul className="mt-8 space-y-4">
        {state.gaps.map((gap) => (
          <li
            key={gap.id}
            className={`rounded-xl border-2 p-5 ${severityStyles[gap.severity]}`}
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="flex flex-wrap justify-between gap-2">
                  <h3 className="font-semibold text-navy-900">{gap.title}</h3>
                  <span className="text-xs font-semibold uppercase text-slate-600">
                    Impact {gap.impactScore} · {gap.category}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-700">{gap.description}</p>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {benchmark && (
        <section className="mt-12">
          <h2 className="text-lg font-semibold text-navy-900 mb-2">Benchmark gap matrix</h2>
          <p className="text-sm text-slate-600 mb-4">
            Current vs. target scores and quantities to build per roadmap area.
          </p>
          <BenchmarkRoadmapPreviewTable rows={benchmark.roadmapTable} />
        </section>
      )}

      <StepNavigation stepId="gaps" />
    </>
  )
}
