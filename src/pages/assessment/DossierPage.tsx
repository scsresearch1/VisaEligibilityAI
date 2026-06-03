import { useMemo } from 'react'
import { FileText, Loader2 } from 'lucide-react'
import { useAssessment } from '../../context/AssessmentContext'
import { StepGuard } from '../../hooks/useStepGuard'
import CombinedDossierPreview from '../../components/assessment/CombinedDossierPreview'
import ExportPdfButton from '../../components/assessment/ExportPdfButton'
import StepNavigation from '../../components/assessment/StepNavigation'
import Button from '../../components/ui/Button'
import { buildAttorneyDossierData } from '../../lib/export/build-dossier-data'
import { downloadCombinedAttorneyDossierPdf } from '../../lib/export/export-combined-dossier-pdf'
import { downloadCombinedAttorneyDossierWord } from '../../lib/export/export-combined-dossier-word'
import { formatStepCaption } from '../../lib/assessment-flow'
import { UI_COPY } from '../../lib/ui-copy'

export default function DossierPage() {
  return (
    <StepGuard stepId="dossier">
      <DossierContent />
    </StepGuard>
  )
}

function DossierContent() {
  const { state, generateReport, reportLoading, readinessScore } = useAssessment()

  const dossierData = useMemo(() => {
    if (!state.analysisComplete) return null
    return buildAttorneyDossierData(state, readinessScore)
  }, [state, readinessScore])

  const canExport = state.reportGenerated && Boolean(dossierData)

  return (
    <>
      <p className="text-xs font-semibold uppercase tracking-widest text-gold-600 mb-2">
        {formatStepCaption('dossier')}
      </p>
      <h1 className="text-2xl font-bold text-navy-900">{UI_COPY.dossierTitle}</h1>
      <p className="mt-2 text-slate-600 max-w-2xl">
        Single professional document for sharing with immigration counsel — combines the full
        benchmark report, quantified roadmap, criterion analysis, and verification index. Export as
        PDF or Word (.doc).
      </p>

      {!state.reportGenerated ? (
        <div className="mt-8 rounded-xl border-2 border-dashed border-navy-300 bg-navy-900/5 p-8 text-center">
          <FileText className="h-12 w-12 text-navy-900 mx-auto mb-4" />
          <p className="text-navy-900 font-medium">Generate the readiness report first</p>
          <p className="text-sm text-slate-600 mt-2 max-w-lg mx-auto">
            The combined dossier merges your benchmark report and roadmap. Complete the Report step,
            then return here to preview and export as PDF or Word.
          </p>
          <Button
            variant="secondary"
            size="lg"
            className="mt-6"
            onClick={() => generateReport()}
            disabled={reportLoading}
          >
            {reportLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Building report…
              </>
            ) : (
              'Generate readiness report'
            )}
          </Button>
        </div>
      ) : (
        <>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <ExportPdfButton
              variant="primary"
              label="Export combined dossier (PDF)"
              loadingLabel="Generating PDF…"
              disabled={!canExport}
              onExport={() => {
                if (!dossierData) return
                downloadCombinedAttorneyDossierPdf(dossierData, state)
              }}
            />
            <ExportPdfButton
              variant="secondary"
              label="Export combined dossier (Word)"
              loadingLabel="Generating Word…"
              errorMessage="Word export failed. Please try again."
              disabled={!canExport}
              onExport={() => {
                if (!dossierData) return
                downloadCombinedAttorneyDossierWord(dossierData, state)
              }}
            />
            <span className="text-sm text-slate-500">
              Filenames:{' '}
              <code className="text-xs bg-slate-100 px-1 rounded">EB1-Professional-Dossier-*.pdf</code>
              {' '}or{' '}
              <code className="text-xs bg-slate-100 px-1 rounded">.doc</code>
            </span>
          </div>

          <ul className="mt-4 flex flex-wrap gap-3 text-xs text-slate-600">
            <li className="rounded-full bg-emerald-50 text-emerald-800 px-3 py-1 border border-emerald-200">
              ✓ Benchmark report
            </li>
            <li className="rounded-full bg-emerald-50 text-emerald-800 px-3 py-1 border border-emerald-200">
              ✓ Roadmap &amp; action plan
            </li>
            <li className="rounded-full bg-emerald-50 text-emerald-800 px-3 py-1 border border-emerald-200">
              ✓ Criterion &amp; gap tables
            </li>
          </ul>

          {dossierData && (
            <div className="mt-10 max-h-[70vh] overflow-y-auto rounded-2xl border border-slate-300">
              <CombinedDossierPreview data={dossierData} state={state} />
            </div>
          )}
        </>
      )}

      <StepNavigation stepId="dossier" />
    </>
  )
}
