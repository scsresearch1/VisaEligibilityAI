import type { CriterionStatus, EvidenceStrength } from '../../types/assessment'

const strengthStyles: Record<EvidenceStrength, string> = {
  strong: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  moderate: 'bg-amber-100 text-amber-800 border-amber-200',
  weak: 'bg-orange-100 text-orange-800 border-orange-200',
  unsupported: 'bg-red-100 text-red-800 border-red-200',
  missing: 'bg-slate-100 text-slate-600 border-slate-200',
  attorney_review: 'bg-violet-100 text-violet-800 border-violet-200',
}

const statusStyles: Record<CriterionStatus, string> = {
  satisfied: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  partial: 'bg-amber-100 text-amber-800 border-amber-200',
  unsupported: 'bg-red-100 text-red-800 border-red-200',
  missing: 'bg-slate-100 text-slate-600 border-slate-200',
}

export function StrengthBadge({ strength }: { strength: EvidenceStrength }) {
  const label = strength.replace('_', ' ')
  return (
    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize ${strengthStyles[strength]}`}>
      {label}
    </span>
  )
}

export function StatusBadge({ status }: { status: CriterionStatus }) {
  return (
    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize ${statusStyles[status]}`}>
      {status}
    </span>
  )
}
