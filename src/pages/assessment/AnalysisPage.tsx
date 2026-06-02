import { useState } from 'react'
import { Brain, Cpu, Scale, Loader2 } from 'lucide-react'
import { useAssessment } from '../../context/AssessmentContext'
import { StepGuard } from '../../hooks/useStepGuard'
import StepNavigation, { StepHeader } from '../../components/assessment/StepNavigation'
import Button from '../../components/ui/Button'
import { useNavigate } from 'react-router-dom'
import BuildPrincipleBanner from '../../components/assessment/BuildPrincipleBanner'
import ProfileExtractionReview from '../../components/assessment/ProfileExtractionReview'

export default function AnalysisPage() {
  return (
    <StepGuard stepId="analysis">
      <AnalysisContent />
    </StepGuard>
  )
}

function AnalysisContent() {
  const { state, runAnalysis } = useAssessment()
  const navigate = useNavigate()
  const [running, setRunning] = useState(false)

  const handleRun = async () => {
    setRunning(true)
    await runAnalysis()
    setRunning(false)
    navigate('/assessment/insights')
  }

  return (
    <>
      <StepHeader stepId="analysis" />
      <h1 className="text-2xl font-bold text-navy-900">Deep Profile Parsing & Rule Engine</h1>
      <p className="mt-2 text-slate-600 max-w-2xl">
        Profiles the candidate from uploads, then quantifies what the consulting team must build
        (papers, patents, products, articles, speaking, judging) to meet EB-1 criteria — matched to
        their field and career narrative.
      </p>

      <div className="mt-4">
        <BuildPrincipleBanner compact />
      </div>

      <ProfileExtractionReview />

      <div className="mt-8 grid sm:grid-cols-3 gap-4">
        {[
          { icon: Brain, title: 'NLP extraction', desc: 'Beyond keyword matching' },
          { icon: Scale, title: 'Rule engine', desc: 'Visa-specific criteria mapping' },
          { icon: Cpu, title: 'Tech-aware', desc: 'Domain classification (post-report)' },
        ].map(({ icon: Icon, title, desc }) => (
          <div key={title} className="rounded-xl border border-slate-200 p-4 bg-slate-50/50">
            <Icon className="h-6 w-6 text-navy-900 mb-2" />
            <p className="font-semibold text-navy-900 text-sm">{title}</p>
            <p className="text-xs text-slate-500 mt-1">{desc}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-xl bg-navy-900 text-white p-6">
        <p className="text-sm text-white/70">Selected pathways</p>
        <p className="text-lg font-semibold mt-1">{state.selectedCategories.join(' · ') || '—'}</p>
        <p className="text-sm text-white/70 mt-4">{state.uploads.length} document(s) queued for analysis</p>
      </div>

      {state.analysisMeta?.error && !state.analysisComplete && (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          {state.analysisMeta.error}
        </div>
      )}

      {state.analysisComplete ? (
        <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          LLM analysis complete — {state.parsedAchievements.length} achievements, {state.gaps.length}{' '}
          gaps, {state.roadmap.length} roadmap actions.
          {state.profileInsights.length > 0 &&
            ` ${state.profileInsights.length} strategy insight rows from LLM.`}{' '}
          Continue to profile insights.
        </div>
      ) : (
        <Button
          variant="primary"
          size="lg"
          className="mt-8"
          onClick={handleRun}
          disabled={running}
        >
          {running ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Running LLM analysis & insights…
            </>
          ) : (
            'Run full analysis'
          )}
        </Button>
      )}

      <StepNavigation
        stepId="analysis"
        nextDisabled={!state.analysisComplete}
        nextLabel={state.analysisComplete ? 'View evidence' : 'Continue'}
      />
    </>
  )
}
