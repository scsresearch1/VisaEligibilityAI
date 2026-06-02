import { useState } from 'react'
import { Download, FileCheck, AlertOctagon, Cpu, Eye, EyeOff, Loader2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAssessment } from '../../context/AssessmentContext'
import { StepGuard } from '../../hooks/useStepGuard'
import { showAdvancedInsights } from '../../lib/assessment-flow'
import { benchmarkReportToPlainText } from '../../lib/benchmark-report'
import StepNavigation, { StepHeader } from '../../components/assessment/StepNavigation'
import Button from '../../components/ui/Button'
import BenchmarkReportView from '../../components/assessment/BenchmarkReportView'
import ProfileInsightsTable from '../../components/assessment/ProfileInsightsTable'
import { appConfig } from '../../config/app.config'
import BuildPrincipleBanner from '../../components/assessment/BuildPrincipleBanner'
import { displayPersonalizationNote, sanitizeProfileInsightRow } from '../../lib/user-facing-labels'

export default function ReportPage() {
  return (
    <StepGuard stepId="report">
      <ReportContent />
    </StepGuard>
  )
}

function ReportContent() {
  const {
    state,
    generateReport,
    reportLoading,
    benchmarkReport,
    readinessScore,
  } = useAssessment()
  const reportMetaNote = state.llmMeta?.error
  const [showHidden, setShowHidden] = useState(false)
  const [showSupplementary, setShowSupplementary] = useState(false)
  const advanced = showAdvancedInsights(state.reportGenerated)

  const handleGenerate = async () => {
    await generateReport()
    setShowHidden(true)
  }

  const handleExport = () => {
    const lines: string[] = []
    if (benchmarkReport) {
      lines.push(benchmarkReportToPlainText(benchmarkReport))
      lines.push('\n\n========== SUPPLEMENTARY DATA ==========\n\n')
    }
    lines.push(
      `${appConfig.appName} — Supplementary Assessment Data`,
      `Readiness: ${readinessScore}%`,
      '',
      '--- Profile strategy insights ---',
      ...state.profileInsights.flatMap((row) => {
        const safe = sanitizeProfileInsightRow(row)
        return [
          `Category: ${safe.categoryOfficialName}`,
          `Actionable: ${safe.actionableItems.join('; ')}`,
          `Consulting services: ${safe.rmTeamRecommendedServices.join('; ')}`,
          `Basis: ${safe.sourceStrategicBasis}`,
          '',
        ]
      }),
    )
    if (advanced) {
      lines.push('--- Risk Flags ---', ...state.riskFlags.map((r) => `${r.claim}: ${r.recommendation}`))
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const name = benchmarkReport?.candidateName.replace(/\s+/g, '-') ?? 'candidate'
    a.download = `visa-benchmark-report-${name}-${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <StepHeader stepId="report" />
      <h1 className="text-2xl font-bold text-navy-900">Benchmark Readiness Report</h1>
      <p className="mt-2 text-slate-600 max-w-2xl">
        Professional, quantified EB-1 profile-building roadmap — what the consulting team must build
        (not collect) matched to this profile.
      </p>

      <div className="mt-4">
        <BuildPrincipleBanner compact />
      </div>

      {!state.reportGenerated ? (
        <div className="mt-8 rounded-xl border-2 border-dashed border-navy-300 bg-navy-900/5 p-8 text-center">
          <FileCheck className="h-12 w-12 text-navy-900 mx-auto mb-4" />
          <p className="text-navy-900 font-medium">Generate readiness benchmark report</p>
          <p className="text-sm text-slate-600 mt-2 max-w-lg mx-auto">
            Personalizes current scores, build quantities, and priorities from your uploaded profile
            and selected criteria.
          </p>
          <Button
            variant="secondary"
            size="lg"
            className="mt-6"
            onClick={handleGenerate}
            disabled={reportLoading}
          >
            {reportLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Building personalized report…
              </>
            ) : (
              'Generate readiness report'
            )}
          </Button>
        </div>
      ) : (
        <>
          <div className="mt-6 flex flex-wrap gap-3 items-center">
            <Button to="/assessment/dossier" variant="primary" size="md">
              <Download className="h-4 w-4" />
              Export combined dossier (PDF)
            </Button>
            <Button variant="ghost" size="md" onClick={handleExport} className="border border-slate-200">
              <Download className="h-4 w-4" />
              Export supplementary (.txt)
            </Button>
            <Link to="/assessment/dossier" className="text-sm text-navy-700 underline">
              Professional dossier →
            </Link>
            <button
              type="button"
              onClick={() => setShowSupplementary(!showSupplementary)}
              className="text-sm font-medium text-navy-700 hover:text-navy-900 px-4 py-2 rounded-lg border border-slate-200"
            >
              {showSupplementary ? 'Hide' : 'Show'} supplementary tables
            </button>
          </div>

          {reportMetaNote && (
            <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              {reportMetaNote}
            </p>
          )}

          {benchmarkReport && (
            <>
              <p className="mt-4 text-xs text-slate-500">
                {displayPersonalizationNote(benchmarkReport)}
                {' · '}
                {benchmarkReport.totalAssetsToBuild} assets to build for this profile
              </p>
              <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 sm:p-10 shadow-sm">
                <BenchmarkReportView report={benchmarkReport} />
              </div>
            </>
          )}

          {showSupplementary && (
            <div className="mt-10 space-y-8 border-t border-slate-200 pt-10">
              <section>
                <h3 className="font-semibold text-navy-900">Profile strategy insights</h3>
                <div className="mt-4">
                  <ProfileInsightsTable rows={state.profileInsights} />
                </div>
              </section>
            </div>
          )}

          {advanced && (
            <>
              <div className="mt-10 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-navy-900 flex items-center gap-2">
                  <AlertOctagon className="h-5 w-5 text-red-600" />
                  Risk & Claim Safety
                </h2>
                <button
                  type="button"
                  onClick={() => setShowHidden(!showHidden)}
                  className="text-sm text-navy-700 flex items-center gap-1"
                >
                  {showHidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  {showHidden ? 'Hide' : 'Show'}
                </button>
              </div>
              {showHidden && (
                <ul className="mt-4 space-y-3">
                  {state.riskFlags.map((risk) => (
                    <li key={risk.id} className="rounded-xl border border-red-200 bg-red-50/50 p-4 text-sm">
                      <p className="font-medium text-navy-900">&ldquo;{risk.claim}&rdquo;</p>
                      <p className="text-xs uppercase text-red-700 mt-1 capitalize">
                        {risk.riskType} · {risk.severity}
                      </p>
                      <p className="mt-2 text-slate-700">{risk.recommendation}</p>
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-8">
                <h2 className="text-lg font-semibold text-navy-900 flex items-center gap-2">
                  <Cpu className="h-5 w-5" />
                  Technology-Aware Evaluation
                </h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  {state.techDomains.map((d) => (
                    <span
                      key={d}
                      className="px-3 py-1.5 rounded-full bg-navy-900/5 border text-sm font-medium text-navy-900"
                    >
                      {d}
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}
        </>
      )}

      <StepNavigation stepId="report" nextDisabled={!state.reportGenerated} />
    </>
  )
}
