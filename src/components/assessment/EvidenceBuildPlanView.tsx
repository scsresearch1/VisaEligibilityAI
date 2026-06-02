import {
  BookOpen,
  FileText,
  Gavel,
  Hammer,
  Megaphone,
  Mic2,
  Package,
  Scale,
  Search,
  Sparkles,
  Stamp,
  TrendingUp,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useMemo } from 'react'
import { useAssessment } from '../../context/AssessmentContext'
import {
  buildEvidenceBuildPlan,
  type EvidenceBuildGroup,
  type EvidenceBuildPlanItem,
} from '../../lib/evidence-build-plan'
import ActionDeliverableDetail from './ActionDeliverableDetail'
import QuantifiedRoadmapTable from './QuantifiedRoadmapTable'

const GROUP_ICONS: Record<EvidenceBuildGroup, LucideIcon> = {
  publications: FileText,
  patents: Stamp,
  products: Package,
  whitepapers: BookOpen,
  media: Megaphone,
  speaking: Mic2,
  judging: Gavel,
  recognition: Sparkles,
  case_studies: Users,
  documentation: FileText,
  visibility: TrendingUp,
  counsel_review: Scale,
}

const priorityColors = {
  critical: 'bg-red-100 text-red-800 border-red-200',
  high: 'bg-orange-100 text-orange-800 border-orange-200',
  medium: 'bg-amber-100 text-amber-800 border-amber-200',
  low: 'bg-slate-100 text-slate-600 border-slate-200',
}

const statusBadge = {
  build: 'bg-amber-50 text-amber-900 border-amber-200',
  met: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  strengthen: 'bg-sky-50 text-sky-800 border-sky-200',
}

function PlanCard({ item }: { item: EvidenceBuildPlanItem }) {
  const Icon = GROUP_ICONS[item.group]
  return (
    <li className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-start gap-4 p-5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-navy-900/5">
          <Icon className="h-5 w-5 text-navy-900" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-navy-900">{item.title}</h3>
            <span
              className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${statusBadge[item.status]}`}
            >
              {item.status === 'build'
                ? `Build ×${item.quantityToBuild}`
                : item.status === 'met'
                  ? 'Benchmark met'
                  : 'Optional strengthen'}
            </span>
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize border ${priorityColors[item.priority]}`}
            >
              {item.priority}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">{item.outline}</p>
          {item.linkedMetrics.length > 0 && (
            <p className="mt-2 text-xs text-slate-500">
              <span className="font-semibold text-navy-800">RM metrics: </span>
              {item.linkedMetrics.join(' · ')}
            </p>
          )}
          <p className="mt-3 text-sm text-slate-700 leading-relaxed">{item.consultingDeliverable}</p>
          {item.profileAnchor && (
            <p className="mt-2 text-xs text-slate-500 border-l-2 border-gold-400 pl-2">
              Profile anchor: {item.profileAnchor}
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 tabular-nums">
              <span className="text-slate-500 text-xs block">Evidence index</span>
              <span className="font-bold text-navy-900">
                {item.currentScore}
                <span className="text-slate-400 font-normal"> → </span>
                {item.targetScore}
              </span>
            </div>
            {item.quantityToBuild > 0 && (
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2">
                <span className="text-emerald-800 font-bold">+{item.estimatedImpactPercent}%</span>
                <span className="text-emerald-700 ml-1 text-xs">projected uplift</span>
              </div>
            )}
          </div>
          {item.deliverableSpec && <ActionDeliverableDetail spec={item.deliverableSpec} />}
        </div>
      </div>
    </li>
  )
}

export default function EvidenceBuildPlanView() {
  const { state } = useAssessment()
  const plan = useMemo(() => buildEvidenceBuildPlan(state), [state])

  const grouped = useMemo(() => {
    const order: EvidenceBuildGroup[] = [
      'publications',
      'patents',
      'products',
      'whitepapers',
      'media',
      'speaking',
      'judging',
      'recognition',
      'case_studies',
      'documentation',
      'visibility',
      'counsel_review',
    ]
    return order
      .map((g) => ({
        group: g,
        label: plan.groupLabels[g],
        items: plan.items.filter((i) => i.group === g),
      }))
      .filter((s) => s.items.length > 0)
  }, [plan])

  const buildCount = plan.items.filter((i) => i.status === 'build').length

  return (
    <div className="mt-6 space-y-8">
      <div className="rounded-xl bg-navy-900 text-white p-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <p className="text-xs text-white/60 uppercase tracking-wide">Total assets to build</p>
          <p className="text-3xl font-bold text-gold-400 mt-1">{plan.totalToBuild}</p>
        </div>
        <div>
          <p className="text-xs text-white/60 uppercase tracking-wide">Evidence areas</p>
          <p className="text-3xl font-bold mt-1">{plan.items.length}</p>
        </div>
        <div>
          <p className="text-xs text-white/60 uppercase tracking-wide">Active build tracks</p>
          <p className="text-3xl font-bold mt-1">{buildCount}</p>
        </div>
        <div>
          <p className="text-xs text-white/60 uppercase tracking-wide">Projected uplift</p>
          <p className="text-3xl font-bold text-gold-400 mt-1">+{plan.totalImpact}%</p>
        </div>
      </div>

      <section>
        <div className="flex items-center gap-2 mb-3">
          <Search className="h-4 w-4 text-navy-800" />
          <h2 className="text-sm font-bold uppercase tracking-widest text-navy-900">
            Quantified targets (SCI · SCOPUS · patents · products · …)
          </h2>
        </div>
        <p className="text-sm text-slate-600 mb-4 max-w-3xl">
          Official RM benchmark counts per pathway — publications, conferences, patents, products, book
          chapters, and guest lectures. Gaps drive build quantities in each category below.
        </p>
        <QuantifiedRoadmapTable roadmaps={plan.roadmaps} />
      </section>

      {grouped.map(({ group, label, items }) => {
        const Icon = GROUP_ICONS[group]
        const sectionBuild = items.reduce((s, i) => s + i.quantityToBuild, 0)
        return (
          <section key={group}>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <Icon className="h-5 w-5 text-navy-900" />
                <h2 className="text-lg font-bold text-navy-900">{label}</h2>
              </div>
              {sectionBuild > 0 && (
                <span className="text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-1 rounded-full">
                  {sectionBuild} asset{sectionBuild !== 1 ? 's' : ''} to produce
                </span>
              )}
            </div>
            <ul className="space-y-4">
              {items.map((item) => (
                <PlanCard key={item.id} item={item} />
              ))}
            </ul>
          </section>
        )
      })}

      {plan.items.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
          <Hammer className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p>Run full scientific analysis to generate the evidence build plan across all fields.</p>
        </div>
      )}
    </div>
  )
}
