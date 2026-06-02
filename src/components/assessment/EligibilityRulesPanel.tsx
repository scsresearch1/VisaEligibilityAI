import { FileText, AlertCircle } from 'lucide-react'
import {
  COMMON_SUPPORTING_DOCUMENTS,
  ELIGIBILITY_SOURCE,
  IMPORTANT_NOTES,
  VISA_CATEGORY_INFO,
  VISA_CRITERIA,
  EB1C_PROGRAM_REQUIREMENTS,
} from '../../data/eligibility-rules'
import type { VisaCategory } from '../../types/assessment'
import { sanitizeUserFacingText } from '../../lib/user-facing-labels'

interface EligibilityRulesPanelProps {
  categories: VisaCategory[]
  compact?: boolean
}

export default function EligibilityRulesPanel({ categories, compact }: EligibilityRulesPanelProps) {
  if (categories.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        Select at least one visa category to view official pathway eligibility rules.
      </p>
    )
  }

  return (
    <div className="space-y-6">
      {categories.map((cat) => {
        const info = VISA_CATEGORY_INFO[cat]
        const criteria = VISA_CRITERIA.filter((c) => c.category === cat)
        const docs = COMMON_SUPPORTING_DOCUMENTS[cat]
        const notes = IMPORTANT_NOTES[cat]

        return (
          <article
            key={cat}
            className="rounded-xl border border-slate-200 bg-white overflow-hidden"
          >
            <div className="bg-navy-900 px-4 py-3 text-white">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-gold-400" />
                <h3 className="font-semibold text-sm">{info.title}</h3>
              </div>
              <p className="text-xs text-white/60 mt-1">{sanitizeUserFacingText(ELIGIBILITY_SOURCE[cat])}</p>
            </div>

            <div className={compact ? 'p-4 space-y-4 text-sm' : 'p-5 space-y-5'}>
              <p className="text-slate-600">{info.subtitle}</p>
              <p className="text-xs font-semibold text-navy-900">
                Threshold: satisfy at least {info.minCriteria} of {info.totalCriteria} numbered
                requirements below, with strong supporting evidence.
              </p>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
                  Eligibility requirements
                </h4>
                <ol className="space-y-2 list-none">
                  {criteria.map((c) => (
                    <li key={c.id} className="flex gap-3 text-sm">
                      <span className="shrink-0 font-mono font-bold text-gold-600 w-6">{c.code}.</span>
                      <div>
                        <p className="font-medium text-navy-900">{c.title}</p>
                        {!compact && (
                          <p className="text-slate-600 mt-0.5 text-xs leading-relaxed">{c.description}</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              </div>

              {cat === 'EB1C' && (
                <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
                    Program requirements (notes)
                  </h4>
                  <ul className="text-xs text-slate-600 space-y-1">
                    {EB1C_PROGRAM_REQUIREMENTS.map((r) => (
                      <li key={r}>• {r}</li>
                    ))}
                  </ul>
                </div>
              )}

              {!compact && (
                <>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
                      Common supporting documents
                    </h4>
                    <ul className="grid sm:grid-cols-2 gap-1 text-xs text-slate-600">
                      {docs.map((d) => (
                        <li key={d.label} className="flex gap-1.5">
                          <span className="text-emerald-600">✓</span>
                          {d.label}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50/80 p-3">
                    <AlertCircle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
                    <ul className="text-xs text-amber-900 space-y-1">
                      {notes.map((n) => (
                        <li key={n}>• {n}</li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
            </div>
          </article>
        )
      })}
    </div>
  )
}
