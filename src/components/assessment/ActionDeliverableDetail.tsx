import type { ActionDeliverableSpec } from '../../lib/action-deliverable-spec'

const KIND_LABELS: Record<ActionDeliverableSpec['kind'], string> = {
  publications: 'Suggested paper titles',
  patents: 'Patent outline',
  product: 'Product build',
  whitepaper: 'Suggested white paper titles',
  media: 'Suggested article angles',
  speaking: 'Speaking outline',
  judging: 'Judging / review outline',
  case_study: 'Case study outline',
  documentation: 'Documentation outline',
  visibility: 'Visibility plan',
  general: 'Build outline',
}

export default function ActionDeliverableDetail({ spec }: { spec: ActionDeliverableSpec }) {
  const label = KIND_LABELS[spec.kind]

  return (
    <div className="mt-4 rounded-lg bg-slate-50 border border-slate-200 p-4 space-y-3">
      <p className="text-xs font-bold uppercase tracking-wide text-navy-800">{label}</p>

      {spec.kind === 'product' && spec.domain && (
        <p className="text-sm">
          <span className="font-semibold text-navy-900">Domain: </span>
          <span className="text-slate-700">{spec.domain}</span>
        </p>
      )}

      {spec.suggestedTitles && spec.suggestedTitles.length > 0 && (
        <ol className="list-decimal list-inside space-y-1.5 text-sm text-slate-700">
          {spec.suggestedTitles.map((title) => (
            <li key={title} className="leading-snug pl-1">
              {title}
            </li>
          ))}
        </ol>
      )}

      {spec.outline && (
        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{spec.outline}</p>
      )}

      {spec.kind !== 'product' && spec.domain && !spec.suggestedTitles?.length && (
        <p className="text-xs text-slate-500">Field: {spec.domain}</p>
      )}
    </div>
  )
}
