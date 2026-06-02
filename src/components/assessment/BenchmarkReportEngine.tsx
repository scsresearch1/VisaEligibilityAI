import { useMemo } from 'react'
import { Activity, BarChart3, FileCheck, Layers, Scale, Sparkles } from 'lucide-react'
import { useAssessment } from '../../context/AssessmentContext'
import { getAnalysisModelStack } from '../../lib/analysis-pipeline/config'
import { buildEvidenceBuildPlan } from '../../lib/evidence-build-plan'
import { computeScientificReadinessBaseline } from '../../lib/benchmark-report/compute-readiness-baseline'

interface BenchmarkReportEngineProps {
  reportLoading: boolean
  reportGenerated: boolean
  onGenerate: () => void
}

export default function BenchmarkReportEngine({
  reportLoading,
  reportGenerated,
  onGenerate,
}: BenchmarkReportEngineProps) {
  const { state } = useAssessment()
  const modelStack = useMemo(() => getAnalysisModelStack(), [])
  const baseline = useMemo(
    () => (state.analysisComplete ? computeScientificReadinessBaseline(state) : null),
    [state],
  )
  const plan = useMemo(
    () => (state.analysisComplete ? buildEvidenceBuildPlan(state) : null),
    [state],
  )

  const buildAreas = plan?.items.filter((i) => i.quantityToBuild > 0).length ?? 0

  return (
    <section className="mt-8 overflow-hidden rounded-2xl border border-navy-700/80 bg-navy-950 text-white shadow-xl">
      <div className="relative mesh-gradient px-6 py-6 sm:px-8 border-b border-white/10">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-300">
          Scientific benchmark synthesis
        </p>
        <h2 className="mt-2 text-xl font-bold">
          Readiness report engine · 12 evidence areas
        </h2>
        <p className="mt-2 text-sm text-white/65 max-w-2xl">
          Merges criterion rubric scores, evidence build plan quantities, verified profile facts,
          and hybrid LLM quantification into a counsel-ready benchmark — publications through
          counsel review package.
        </p>
      </div>

      <div className="p-6 grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/50">
            Pipeline stages
          </p>
          {[
            { icon: Layers, label: 'Ingest completed analysis', detail: 'Gaps, criteria, roadmap actions' },
            { icon: Scale, label: 'Rubric reconciliation', detail: '8 CFR scores anchor current indices' },
            { icon: BarChart3, label: '12-area quantification', detail: 'Papers · patents · products · media · …' },
            { icon: Sparkles, label: 'LLM merge + validate', detail: 'Profile-anchored; no template hallucination' },
            { icon: FileCheck, label: 'Report compile', detail: 'Sections, timeline, attorney package' },
          ].map(({ icon: Icon, label, detail }) => (
            <div
              key={label}
              className="flex gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-3"
            >
              <Icon className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-white/50">{detail}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          {baseline && (
            <div className="rounded-xl border border-white/15 bg-black/30 p-4">
              <p className="text-xs text-white/50">Pre-build readiness (rubric)</p>
              <p className="text-3xl font-bold text-gold-400 mt-1">{baseline.readinessScore}/100</p>
              <p className="text-xs text-white/60 mt-2">{baseline.primaryGap}</p>
            </div>
          )}
          {plan && (
            <div className="rounded-xl border border-white/15 bg-black/30 p-4 text-sm">
              <p className="text-xs text-white/50">Build tracks active</p>
              <p className="text-2xl font-bold mt-1">{buildAreas} / {plan.items.length}</p>
              <p className="text-xs text-white/60 mt-2">{plan.totalToBuild} total assets to produce</p>
            </div>
          )}
          <div className="text-[10px] text-white/40 space-y-1">
            {modelStack.slice(0, 2).map((m) => (
              <p key={m.model}>
                {m.role}: {m.model}
              </p>
            ))}
          </div>
        </div>
      </div>

      {!reportGenerated && (
        <div className="px-6 pb-6">
          <button
            type="button"
            onClick={onGenerate}
            disabled={reportLoading || !state.analysisComplete}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-cyan-600 to-navy-700 px-8 py-3 font-semibold text-white disabled:opacity-50"
          >
            {reportLoading ? (
              <>
                <Activity className="h-5 w-5 animate-pulse" />
                Synthesizing benchmark report…
              </>
            ) : (
              <>
                <FileCheck className="h-5 w-5" />
                Generate scientific readiness report
              </>
            )}
          </button>
          {!state.analysisComplete && (
            <p className="mt-2 text-xs text-amber-300">Complete full scientific analysis first.</p>
          )}
        </div>
      )}
    </section>
  )
}
