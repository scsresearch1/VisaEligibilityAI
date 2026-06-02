import { Map, ArrowUpRight, Target } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAssessment } from '../../context/AssessmentContext'
import { StepGuard } from '../../hooks/useStepGuard'
import QuantifiedRoadmapTable from '../../components/assessment/QuantifiedRoadmapTable'
import BenchmarkRoadmapPreviewTable from '../../components/assessment/BenchmarkRoadmapPreviewTable'
import BuildPrincipleBanner from '../../components/assessment/BuildPrincipleBanner'
import StepInterimHeader from '../../components/assessment/StepInterimHeader'
import ActionDeliverableDetail from '../../components/assessment/ActionDeliverableDetail'
import StepNavigation from '../../components/assessment/StepNavigation'
import { generateBenchmarkReport } from '../../lib/benchmark-report'
import { isMetaFreshForProfile } from '../../lib/llm/llm-output-policy'
import {
  buildQuantifiedRoadmaps,
  deriveDemoMetricCounts,
  extractProfileMetricCounts,
} from '../../lib/quantified-roadmap'

const categoryLabels = {
  add: 'Add',
  improve: 'Improve',
  document: 'Document',
  validate: 'Validate',
}

export default function RoadmapPage() {
  return (
    <StepGuard stepId="roadmap">
      <RoadmapContent />
    </StepGuard>
  )
}

function RoadmapContent() {
  const { state } = useAssessment()

  const roadmaps = useMemo(() => {
    const counts =
      state.quantifiedRoadmap?.current ??
      extractProfileMetricCounts(state)
    const total = Object.values(counts).reduce((a, b) => a + b, 0)
    const current =
      total < 4 && state.analysisComplete
        ? deriveDemoMetricCounts(state.uploads.length, state.selectedCategories)
        : counts
    return buildQuantifiedRoadmaps(state.selectedCategories, current)
  }, [state])

  const roadmapFresh = isMetaFreshForProfile(state.analysisMeta, state.profileRevision)
  const sorted = useMemo(() => {
    if (!roadmapFresh) return []
    return [...state.roadmap].sort((a, b) => a.priority - b.priority)
  }, [state.roadmap, roadmapFresh])
  const totalGapAll = roadmaps.reduce((s, r) => s + r.totalGap, 0)
  const benchmark =
    state.selectedCategories.includes('EB1A') && state.analysisComplete
      ? state.benchmarkReport ?? generateBenchmarkReport(state)
      : null

  return (
    <>
      <StepInterimHeader stepId="roadmap" />

      <div className="mt-4">
        <BuildPrincipleBanner compact />
      </div>

      {state.analysisComplete && (
        <p className="mt-6 text-sm">
          <Link
            to="/assessment/dossier"
            className="inline-flex items-center gap-1 font-semibold text-navy-900 underline"
          >
            Export combined Report + Roadmap PDF
          </Link>
          <span className="text-slate-500 ml-2">— single professional dossier for sharing</span>
        </p>
      )}

      <div className="mt-6 grid sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <Target className="h-6 w-6 text-navy-900 mb-2" />
          <p className="text-2xl font-bold text-navy-900">{totalGapAll}</p>
          <p className="text-xs text-slate-500 mt-1">Total quantified gaps across pathways</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-2xl font-bold text-gold-600">
            {roadmaps.length > 0
              ? Math.round(
                  roadmaps.reduce((s, r) => s + r.overallCompletionPercent, 0) / roadmaps.length,
                )
              : 0}
            %
          </p>
          <p className="text-xs text-slate-500 mt-1">Avg. benchmark completion</p>
        </div>
        <div className="rounded-xl bg-linear-to-r from-navy-900 to-navy-800 text-white p-4">
          <Map className="h-6 w-6 text-gold-400 mb-2" />
          <p className="text-2xl font-bold">
            {benchmark?.totalAssetsToBuild ?? sorted.length}
          </p>
          <p className="text-xs text-white/70 mt-1">
            {benchmark ? 'Benchmark assets to build' : 'Prioritized actions'}
          </p>
        </div>
      </div>

      {benchmark && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold text-navy-900 mb-4">
            Readiness benchmark roadmap ({benchmark.totalAssetsToBuild} assets)
          </h2>
          <BenchmarkRoadmapPreviewTable rows={benchmark.roadmapTable} />
          <ul className="mt-6 grid sm:grid-cols-2 gap-2 text-sm text-slate-700">
            {benchmark.minimumBuildPackage.map((item) => (
              <li key={item} className="flex gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <span className="text-gold-600 font-bold">+</span>
                {item}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-navy-900 mb-4">Quantified benchmark matrix</h2>
        <p className="text-sm text-slate-600 mb-6">
          Top row: your current counts vs. targets. Bottom row: official pathway targets per category.
          Cells show <strong>+N needed</strong> until the target is met.
        </p>
        <QuantifiedRoadmapTable roadmaps={roadmaps} />
      </section>

      <section className="mt-12">
        <h2 className="text-lg font-semibold text-navy-900 mb-1">Prioritized action plan</h2>
        <p className="text-sm text-slate-600 mb-6 max-w-3xl">
          Generated by the LLM from your current profile and pathways — re-run analysis after any
          upload or category change.
        </p>
        {!roadmapFresh && state.analysisComplete && (
          <p className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            Action plan is out of date or missing. Go to Analysis and run full analysis again.
          </p>
        )}
        <ol className="space-y-5">
          {sorted.map((action) => (
            <li
              key={action.id}
              className="relative rounded-xl border border-slate-200 bg-white p-5 pl-14 shadow-sm"
            >
              <span className="absolute left-4 top-5 flex h-8 w-8 items-center justify-center rounded-full bg-navy-900 text-white text-sm font-bold">
                {action.priority}
              </span>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h3 className="font-semibold text-navy-900 text-base leading-snug pr-4">
                  {action.title}
                </h3>
                <div className="flex gap-2 flex-wrap shrink-0">
                  {action.domain && (
                    <span className="text-xs font-medium text-navy-800 bg-slate-100 px-2 py-0.5 rounded">
                      {action.domain}
                    </span>
                  )}
                  {action.visaCategory && (
                    <span className="text-xs font-bold text-gold-700 bg-gold-500/10 px-2 py-0.5 rounded">
                      {action.visaCategory}
                    </span>
                  )}
                  {action.quantityToBuild != null && action.quantityToBuild > 0 && (
                    <span className="text-xs font-semibold text-navy-700 bg-navy-50 px-2 py-0.5 rounded">
                      Build ×{action.quantityToBuild}
                    </span>
                  )}
                  {action.metricGap != null && action.metricGap > 0 && (
                    <span className="text-xs font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded">
                      Gap: +{action.metricGap}
                    </span>
                  )}
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {categoryLabels[action.category]}
                  </span>
                </div>
              </div>

              {action.evidenceArea && (
                <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Evidence area
                </p>
              )}
              {action.evidenceArea && (
                <p className="text-sm font-medium text-navy-800">{action.evidenceArea}</p>
              )}

              {action.deliverableOutline && (
                <p className="mt-3 text-sm text-slate-700 border-l-2 border-gold-500 pl-3">
                  <span className="font-semibold text-navy-900">Deliverable: </span>
                  {action.deliverableOutline}
                </p>
              )}

              {action.deliverableSpec && (
                <ActionDeliverableDetail spec={action.deliverableSpec} />
              )}

              <p className="mt-3 text-sm text-slate-600 leading-relaxed">{action.description}</p>

              {action.profileAnchor && (
                <p className="mt-3 text-xs text-slate-500 italic border-t border-slate-100 pt-3">
                  <span className="font-semibold not-italic text-slate-600">Profile anchor: </span>
                  {action.profileAnchor}
                </p>
              )}

              <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500">
                <span>Timeline: {action.timeframe}</span>
                <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                  <ArrowUpRight className="h-3 w-3" />
                  +{action.expectedReadinessGain}% readiness
                </span>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <StepNavigation stepId="roadmap" />
    </>
  )
}
