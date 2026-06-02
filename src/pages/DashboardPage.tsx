import { Link } from 'react-router-dom'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  FileUp,
  LogOut,
  Shield,
  RotateCcw,
  CheckCircle2,
  Circle,
} from 'lucide-react'
import Button from '../components/ui/Button'
import { appConfig } from '../config/app.config'
import { signOut } from '../lib/auth'
import { AssessmentProvider, useAssessment } from '../context/AssessmentContext'
import { FLOW_STEPS } from '../lib/assessment-flow'
import { isStepUnlocked } from '../lib/assessment-flow'

function DashboardContent() {
  const navigate = useNavigate()
  const { state, unlocks, readinessScore, resetAssessment } = useAssessment()

  const handleSignOut = () => {
    signOut()
    navigate('/login', { replace: true })
  }

  const continuePath =
    !state.uploads.length
      ? '/assessment/upload'
      : !state.selectedCategories.length
        ? '/assessment/categories'
        : !state.analysisComplete
          ? '/assessment/analysis'
          : state.profileInsights.length === 0
            ? '/assessment/insights'
            : !state.reportGenerated
              ? '/assessment/evidence'
              : '/assessment/roadmap'

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-900 text-gold-400">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <span className="font-bold text-navy-900">{appConfig.appName}</span>
              <p className="text-xs text-slate-500">Assessment Hub</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={resetAssessment}>
              <RotateCcw className="h-4 w-4" />
              <span className="hidden sm:inline">Reset</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <h1 className="text-3xl font-bold text-navy-900 tracking-tight">EB-1 Assessment Workflow</h1>
            <p className="mt-2 text-slate-600 max-w-xl">
              Complete each step in order. Your profile is evaluated across EB-1A, EB-1B, and EB-1C with
              quantified recommendations and a submission-ready report.
            </p>

            <Button to={continuePath} variant="secondary" size="lg" className="mt-8">
              Continue assessment
              <ArrowRight className="h-5 w-5" />
            </Button>

            <div className="mt-12 space-y-3">
              {FLOW_STEPS.map((step) => {
                const unlocked = isStepUnlocked(step.id, unlocks)
                const done =
                  (step.id === 'upload' && state.uploads.length > 0) ||
                  (step.id === 'categories' && state.selectedCategories.length > 0) ||
                  (step.id === 'analysis' && state.analysisComplete) ||
                  (step.id === 'report' && state.reportGenerated)

                return (
                  <Link
                    key={step.id}
                    to={unlocked ? step.path : '#'}
                    onClick={(e) => !unlocked && e.preventDefault()}
                    className={[
                      'flex items-center gap-4 rounded-xl border p-4 transition-colors',
                      unlocked
                        ? 'border-slate-200 bg-white hover:border-navy-700/30 hover:shadow-md'
                        : 'border-slate-100 bg-slate-50 opacity-60 cursor-not-allowed',
                    ].join(' ')}
                  >
                    {done ? (
                      <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0" />
                    ) : (
                      <Circle className="h-6 w-6 text-slate-300 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-navy-900">
                        {step.stepNumber}. {step.title}
                      </p>
                      <p className="text-sm text-slate-500 truncate">{step.description}</p>
                    </div>
                    {unlocked && <ArrowRight className="h-4 w-4 text-slate-400 shrink-0" />}
                  </Link>
                )
              })}
            </div>
          </div>

          <div className="space-y-6">
            <div className="glass-panel rounded-2xl p-6">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Status</p>
              <p className="text-4xl font-bold text-navy-900 mt-2">{readinessScore}%</p>
              <p className="text-sm text-slate-600 mt-1">Petition readiness score</p>
              <ul className="mt-6 space-y-2 text-sm text-slate-600">
                <li>{state.uploads.length} files uploaded</li>
                <li>{state.selectedCategories.length || 0} visa categories selected</li>
                <li>{state.analysisComplete ? 'Analysis complete' : 'Analysis pending'}</li>
                <li>{state.profileInsights.length} strategy insight rows</li>
                <li>{state.reportGenerated ? 'Report generated' : 'Report pending'}</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <FileUp className="h-8 w-8 text-navy-900 mb-3" />
              <h2 className="font-semibold text-navy-900">Start here</h2>
              <p className="text-sm text-slate-600 mt-2">
                Upload your resume and supporting documents, then select visa categories.
              </p>
              <Button to="/assessment/upload" variant="primary" size="md" className="mt-4" fullWidth>
                Go to upload
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <AssessmentProvider>
      <DashboardContent />
    </AssessmentProvider>
  )
}
