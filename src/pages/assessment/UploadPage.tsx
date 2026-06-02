import { useRef, useState } from 'react'
import { FileUp, Trash2, CheckCircle2, AlertCircle } from 'lucide-react'
import { DOCUMENT_CATEGORIES } from '../../data/document-types'
import { COMMON_SUPPORTING_DOCUMENTS } from '../../data/eligibility-rules'
import EligibilityRulesPanel from '../../components/assessment/EligibilityRulesPanel'
import { useAssessment } from '../../context/AssessmentContext'
import type { DocumentCategory } from '../../types/assessment'
import StepNavigation, { StepHeader } from '../../components/assessment/StepNavigation'
import Button from '../../components/ui/Button'
import BuildPrincipleBanner from '../../components/assessment/BuildPrincipleBanner'
import ProfileExtractionReview from '../../components/assessment/ProfileExtractionReview'
import { isExtractionFailed, RESUME_ACCEPT } from '../../lib/document-extract'
import { UI_COPY } from '../../lib/ui-copy'

export default function UploadPage() {
  const { state, addUpload, removeUpload } = useAssessment()
  const [category, setCategory] = useState<DocumentCategory>('resume')
  const inputRef = useRef<HTMLInputElement>(null)

  const linkedInUploaded = state.uploads.some((u) => u.category === 'linkedin')
  const resumeUploaded = state.uploads.some((u) => u.category === 'resume')

  return (
    <>
      <StepHeader stepId="upload" />
      <h1 className="text-2xl font-bold text-navy-900">Profile Upload</h1>
      <p className="mt-2 text-slate-600 max-w-2xl">{UI_COPY.uploadPurpose}</p>

      <div className="mt-4">
        <BuildPrincipleBanner compact />
      </div>

      <p className="mt-4 text-sm text-slate-600 max-w-2xl">
        Resume / CV: <strong>PDF</strong>, <strong>Word (.doc / .docx)</strong>, or plain text (.txt / .md).
        Text is parsed in your browser — scanned image-only PDFs may need a text-based export.
      </p>

      <div className="mt-8 grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Document type</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as DocumentCategory)}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-navy-900/20 focus:border-navy-700"
          >
            {DOCUMENT_CATEGORIES.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <input
            ref={inputRef}
            type="file"
            accept={RESUME_ACCEPT}
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0]
              if (file) await addUpload(file, category)
              e.target.value = ''
            }}
          />
          <Button variant="secondary" size="md" fullWidth onClick={() => inputRef.current?.click()}>
            <FileUp className="h-4 w-4" />
            Choose file
          </Button>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
        <p className="text-sm font-medium text-navy-900 mb-3">Availability check</p>
        <ul className="space-y-2 text-sm">
          <li className="flex items-center gap-2">
            {resumeUploaded ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-amber-500" />
            )}
            Resume / CV {resumeUploaded ? '— uploaded' : '— recommended'}
          </li>
          <li className="flex items-center gap-2">
            {linkedInUploaded ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-amber-500" />
            )}
            LinkedIn export {linkedInUploaded ? '— uploaded' : '— optional; cross-checked with resume'}
          </li>
        </ul>
      </div>

      {state.selectedCategories.length > 0 && (
        <section className="mt-10">
          <h2 className="text-sm font-semibold text-navy-900 mb-3">
            Pathway document checklist (selected pathways)
          </h2>
          <ul className="text-xs text-slate-600 grid sm:grid-cols-2 gap-1 mb-6">
            {state.selectedCategories.flatMap((cat) =>
              COMMON_SUPPORTING_DOCUMENTS[cat].slice(0, 8).map((d) => (
                <li key={`${cat}-${d.label}`} className="flex gap-1">
                  <span className="text-gold-600 font-bold">{cat}:</span> {d.label}
                </li>
              )),
            )}
          </ul>
          <EligibilityRulesPanel categories={state.selectedCategories} compact />
        </section>
      )}

      <ProfileExtractionReview />

      {state.uploads.length > 0 && (
        <ul className="mt-8 space-y-2">
          {state.uploads.map((file) => {
            const meta = DOCUMENT_CATEGORIES.find((d) => d.id === file.category)
            return (
              <li
                key={file.id}
                className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="font-medium text-navy-900 truncate">{file.name}</p>
                  <p className="text-xs text-slate-500">
                    {meta?.label} · {(file.size / 1024).toFixed(1)} KB
                    {isExtractionFailed(file.textSnippet) ? (
                      <span className="text-red-600 font-medium"> · text not extracted</span>
                    ) : file.textSnippet && file.textSnippet.length > 80 ? (
                      <span className="text-emerald-700 font-medium"> · parsed</span>
                    ) : null}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeUpload(file.id)}
                  className="p-2 text-slate-400 hover:text-red-600 rounded-lg"
                  aria-label="Remove file"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <StepNavigation stepId="upload" nextDisabled={state.uploads.length === 0} />
    </>
  )
}
