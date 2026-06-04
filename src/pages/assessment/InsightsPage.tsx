import { Sparkles, RefreshCw, AlertCircle } from 'lucide-react'
import { useAssessment } from '../../context/AssessmentContext'
import { StepGuard } from '../../hooks/useStepGuard'
import ProfileExtractionReview from '../../components/assessment/ProfileExtractionReview'
import BenchmarkRoadmapPreviewTable from '../../components/assessment/BenchmarkRoadmapPreviewTable'
import ProfileInsightsTable from '../../components/assessment/ProfileInsightsTable'
import StepInterimHeader from '../../components/assessment/StepInterimHeader'
import StepNavigation from '../../components/assessment/StepNavigation'
import { generateBenchmarkReport } from '../../lib/benchmark-report'
import Button from '../../components/ui/Button'
import { UI_COPY } from '../../lib/ui-copy'
import { formatLlmMetaForDisplay } from '../../lib/llm/format-llm-meta'

export default function InsightsPage() {
  return (
    <StepGuard stepId="insights">
      <InsightsContent />
    </StepGuard>
  )
}

function InsightsContent() {
  const { state, regenerateInsights, insightsLoading } = useAssessment()
  const meta = state.llmMeta
  const metaDisplay = formatLlmMetaForDisplay(meta?.error, 'insights')
  const extraction = state.structuredProfile?.extractionQuality
  const benchmarkPreview =
    state.selectedCategories.includes('EB1A') && state.analysisComplete
      ? state.benchmarkReport ?? generateBenchmarkReport(state)
      : null

  return (
    <>
      <StepInterimHeader
        stepId="insights"
        title={UI_COPY.insightsTitle}
        description={UI_COPY.insightsDescription}
      />
      <div className="mt-4">
        <ProfileExtractionReview />
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4 mt-4">
        <div className="flex items-center gap-2 text-navy-900">
          <Sparkles className="h-6 w-6 text-gold-500" />
          <p className="text-sm font-medium">
            {state.profileInsights.length} {UI_COPY.insightsRows}
            {insightsLoading ? ' · generating…' : ''}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => regenerateInsights()}
          disabled={insightsLoading || !state.analysisComplete}
          className="border border-slate-200"
        >
          <RefreshCw className={`h-4 w-4 ${insightsLoading ? 'animate-spin' : ''}`} />
          {UI_COPY.regenerateInsights}
        </Button>
      </div>

      {extraction === 'minimal' && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {UI_COPY.lowExtractionWarning}
        </div>
      )}

      {metaDisplay && (
        <div
          className={`mt-4 flex items-start gap-2 rounded-xl border px-4 py-3 text-sm ${
            metaDisplay.level === 'warn'
              ? 'border-amber-200 bg-amber-50 text-amber-900'
              : 'border-slate-200 bg-slate-50 text-slate-700'
          }`}
        >
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{metaDisplay.message}</span>
        </div>
      )}

      <div className="mt-8">
        <ProfileInsightsTable rows={state.profileInsights} />
      </div>

      {benchmarkPreview && (
        <section className="mt-12">
          <h2 className="text-lg font-semibold text-navy-900 mb-2">
            Interim benchmark roadmap (12 areas)
          </h2>
          <p className="text-sm text-slate-600 mb-4">
            Quantified assets the consulting team must build — mirrors the professional dossier
            roadmap ({benchmarkPreview.totalAssetsToBuild} total assets).
          </p>
          <BenchmarkRoadmapPreviewTable rows={benchmarkPreview.roadmapTable} />
        </section>
      )}

      <StepNavigation stepId="insights" />
    </>
  )
}
