import { useNavigate } from 'react-router-dom'
import { FileSearch, GitBranch, Shield } from 'lucide-react'
import { useAssessment } from '../../context/AssessmentContext'
import { StepGuard } from '../../hooks/useStepGuard'
import StepNavigation, { StepHeader } from '../../components/assessment/StepNavigation'
import BuildPrincipleBanner from '../../components/assessment/BuildPrincipleBanner'
import ProfileExtractionReview from '../../components/assessment/ProfileExtractionReview'
import DeepAnalysisEngine from '../../components/assessment/DeepAnalysisEngine'

export default function AnalysisPage() {
  return (
    <StepGuard stepId="analysis">
      <AnalysisContent />
    </StepGuard>
  )
}

function AnalysisContent() {
  const { state } = useAssessment()
  const navigate = useNavigate()

  return (
    <>
      <StepHeader stepId="analysis" />

      <div className="mt-2 flex flex-wrap gap-3">
        {[
          {
            icon: FileSearch,
            label: 'Structural parse',
            detail: 'Multi-layout CV segmentation',
          },
          {
            icon: GitBranch,
            label: 'Hybrid LLM stack',
            detail: 'Groq long-context · Gemini critical path',
          },
          {
            icon: Shield,
            label: '8 CFR rule engine',
            detail: 'Reproducible criterion baseline',
          },
        ].map(({ icon: Icon, label, detail }) => (
          <span
            key={label}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 shadow-sm"
          >
            <Icon className="h-3.5 w-3.5 text-navy-800" />
            <span className="font-semibold text-navy-900">{label}</span>
            <span className="text-slate-400 hidden sm:inline">· {detail}</span>
          </span>
        ))}
      </div>

      <div className="mt-4">
        <BuildPrincipleBanner compact />
      </div>

      <ProfileExtractionReview />

      <DeepAnalysisEngine
        categories={state.selectedCategories}
        documentCount={state.uploads.length}
        analysisComplete={state.analysisComplete}
        onRunComplete={() => navigate('/assessment/insights')}
      />

      <StepNavigation
        stepId="analysis"
        nextDisabled={!state.analysisComplete}
        nextLabel={state.analysisComplete ? 'View strategy insights' : 'Continue'}
      />
    </>
  )
}
