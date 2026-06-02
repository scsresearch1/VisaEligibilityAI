import { useEffect, useState } from 'react'
import { CheckCircle2, AlertTriangle, Pencil, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react'
import { useAssessment } from '../../context/AssessmentContext'
import { getDisplayCandidateName } from '../../lib/candidate-display'
import type { NameExtractionSource, ResumeSectionKind } from '../../lib/resume-deep-extract'

const SOURCE_LABELS: Record<NameExtractionSource, string> = {
  resume_label: 'Resume "Name:" field',
  resume_header: 'Top of resume',
  email: 'Email address',
  linkedin: 'LinkedIn URL',
  filename: 'File name',
  default: 'Could not detect',
}

const KIND_LABELS: Record<ResumeSectionKind, string> = {
  header: 'Header / contact',
  summary: 'Summary',
  experience: 'Experience',
  education: 'Education',
  skills: 'Skills',
  projects: 'Projects',
  publications: 'Publications',
  patents: 'Patents',
  awards: 'Awards',
  certifications: 'Certifications',
  volunteer: 'Volunteer',
  languages: 'Languages',
  references: 'References',
  other: 'Other',
}

function qualityColor(q: 'rich' | 'partial' | 'minimal'): string {
  if (q === 'rich') return 'text-emerald-700 bg-emerald-50 border-emerald-200'
  if (q === 'partial') return 'text-amber-800 bg-amber-50 border-amber-200'
  return 'text-red-800 bg-red-50 border-red-200'
}

function SectionPanel({
  kind,
  heading,
  items,
  content,
  defaultOpen,
}: {
  kind: ResumeSectionKind
  heading: string
  items: string[]
  content: string
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen ?? false)
  const preview = items[0] ?? content.split('\n').find((l) => l.trim().length > 0)?.trim() ?? ''

  return (
    <div className="rounded-lg border border-slate-200 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2.5 bg-slate-50 hover:bg-slate-100 text-left text-sm"
      >
        {open ? (
          <ChevronDown className="h-4 w-4 text-slate-500 shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-slate-500 shrink-0" />
        )}
        <span className="font-semibold text-navy-900">{KIND_LABELS[kind]}</span>
        <span className="text-slate-500 truncate">— {heading}</span>
        <span className="ml-auto text-xs text-slate-400 shrink-0">
          {items.length > 0 ? `${items.length} items` : `${content.length} chars`}
        </span>
      </button>
      {open && (
        <div className="px-3 py-2 text-sm text-slate-700 border-t border-slate-100 max-h-48 overflow-y-auto">
          {items.length > 0 ? (
            <ul className="space-y-1">
              {items.slice(0, 15).map((item, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-gold-600">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          ) : (
            <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed">{content.slice(0, 1500)}</pre>
          )}
        </div>
      )}
      {!open && preview && (
        <p className="px-3 pb-2 text-xs text-slate-500 line-clamp-1 border-t border-slate-50">{preview}</p>
      )}
    </div>
  )
}

export default function ProfileExtractionReview() {
  const { state, setCandidateName, refreshProfileExtraction } = useAssessment()
  const profile = state.structuredProfile
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  const displayName = getDisplayCandidateName(state)
  const hasBinary = state.uploads.some((u) => {
    const s = u.textSnippet ?? ''
    return s.startsWith('[Extraction failed:') || s.startsWith('[Binary document:')
  })

  useEffect(() => {
    if (!editing) setDraft(displayName)
  }, [displayName, editing])

  if (state.uploads.length === 0) return null

  const nameMeta = profile?.nameMeta
  const overridden = Boolean(state.candidateNameOverride?.trim())
  const sections = profile?.parsedSections ?? []

  return (
    <section className="mt-6 rounded-xl border-2 border-navy-200 bg-white shadow-sm overflow-hidden">
      <div className="bg-navy-900 text-white px-5 py-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gold-400">
            Profile extraction review
          </p>
          <p className="text-sm text-white/80 mt-0.5">
            Section-by-section parse — verify each block matches your resume style
          </p>
        </div>
        <button
          type="button"
          onClick={() => refreshProfileExtraction()}
          className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Re-scan uploads
        </button>
      </div>

      <div className="p-5 space-y-5">
        {hasBinary && (
          <div className="flex gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <p>
              <strong>Could not read text from one or more files.</strong> Use a PDF with
              selectable text, Word (.doc / .docx), or plain .txt — not a scanned image-only PDF.
            </p>
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Candidate name
            </label>
            {editing ? (
              <div className="mt-2 flex flex-wrap gap-2">
                <input
                  type="text"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  className="flex-1 min-w-[200px] px-3 py-2 rounded-lg border border-slate-300 text-navy-900"
                  placeholder="Full legal name"
                />
                <button
                  type="button"
                  onClick={() => {
                    setCandidateName(draft)
                    setEditing(false)
                  }}
                  className="px-4 py-2 rounded-lg bg-navy-900 text-white text-sm font-medium"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDraft(displayName)
                    setEditing(false)
                  }}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-sm"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <p className="text-2xl font-bold text-navy-900">{displayName}</p>
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="inline-flex items-center gap-1 text-sm text-navy-700 underline"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Correct name
                </button>
              </div>
            )}
            <p className="mt-2 text-xs text-slate-500">
              {overridden ? (
                <span className="text-emerald-700 font-medium">You confirmed this name.</span>
              ) : nameMeta ? (
                <>
                  Detected from: <strong>{SOURCE_LABELS[nameMeta.source]}</strong>
                  {' · '}
                  Confidence:{' '}
                  <strong
                    className={
                      nameMeta.confidence === 'high'
                        ? 'text-emerald-700'
                        : nameMeta.confidence === 'medium'
                          ? 'text-amber-700'
                          : 'text-red-700'
                    }
                  >
                    {nameMeta.confidence}
                  </strong>
                </>
              ) : (
                'Re-scan after uploading a PDF or Word resume.'
              )}
            </p>
          </div>

          {profile && (
            <>
              <div>
                <p className="text-xs text-slate-500">Sections found</p>
                <p className="mt-1 text-lg font-bold text-navy-900">{profile.sectionsDetected}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Extraction depth</p>
                <p
                  className={`mt-1 inline-block text-xs font-semibold px-2 py-1 rounded border ${qualityColor(profile.extractionQuality)}`}
                >
                  {profile.extractionQuality}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Work roles parsed</p>
                <p className="mt-1 text-lg font-bold text-navy-900">{profile.workExperience.length}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Education · Skills · Projects</p>
                <p className="mt-1 text-sm text-navy-900">
                  {profile.education.length} · {profile.skills.length} · {profile.projects.length}
                </p>
              </div>
            </>
          )}
        </div>

        {sections.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase mb-3">
              Detected sections (expand to verify)
            </p>
            <div className="space-y-2">
              {sections.map((sec, i) => (
                <SectionPanel
                  key={`${sec.kind}-${sec.heading}-${i}`}
                  kind={sec.kind}
                  heading={sec.heading}
                  items={sec.items}
                  content={sec.content}
                  defaultOpen={sec.kind === 'experience' || sec.kind === 'summary'}
                />
              ))}
            </div>
          </div>
        )}

        {profile && profile.workExperience.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase mb-2">
              Structured work entries
            </p>
            <ul className="text-sm space-y-2">
              {profile.workExperience.map((w, i) => (
                <li key={i} className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2">
                  <span className="font-medium text-navy-900">{w.title}</span>
                  <span className="text-slate-600"> @ {w.company}</span>
                  {w.period && <span className="text-xs text-slate-500"> · {w.period}</span>}
                  {w.highlights[0] && (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{w.highlights[0]}</p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {profile && profile.extractionQuality !== 'minimal' && sections.length > 0 && (
          <div className="flex items-start gap-2 text-sm text-emerald-800">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <p>
              Open each section above and confirm the bullets match your resume. Different layouts
              (caps headers, pipes, company-first vs title-first) are handled automatically. If a
              section is missing, add a clear heading in your file (e.g.{' '}
              <strong>WORK EXPERIENCE</strong>) and re-scan.
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
