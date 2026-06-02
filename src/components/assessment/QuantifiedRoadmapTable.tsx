import {
  Award,
  BookOpen,
  FileText,
  Medal,
  Mic2,
  Package,
  Search,
  Stamp,
  Star,
  Users,
} from 'lucide-react'
import {
  ROADMAP_METRICS,
  VISA_CATEGORY_ROADMAP_LABELS,
  type RoadmapMetricKey,
} from '../../data/roadmap-benchmarks'
import type { QuantifiedCategoryRoadmap } from '../../lib/quantified-roadmap'

const METRIC_ICONS: Record<RoadmapMetricKey, typeof FileText> = {
  sci: FileText,
  scopus: Search,
  conference: Users,
  patent: Stamp,
  product: Package,
  bookChapter: BookOpen,
  guestLecture: Mic2,
}

const CATEGORY_ICONS = {
  star: Star,
  ribbon: Award,
  medal: Medal,
}

function CellValue({ current, target, gap, met }: { current: number; target: number; gap: number; met: boolean }) {
  return (
    <td className="px-3 py-4 text-center align-middle border-b border-slate-100">
      <div className="flex flex-col items-center gap-1">
        <span className={`text-lg font-bold tabular-nums ${met ? 'text-emerald-600' : 'text-navy-900'}`}>
          {current}
        </span>
        <span className="text-[10px] text-slate-400">/ {target}</span>
        {!met && gap > 0 && (
          <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
            +{gap} needed
          </span>
        )}
        {met && (
          <span className="text-[10px] font-semibold text-emerald-700">Met</span>
        )}
      </div>
    </td>
  )
}

interface QuantifiedRoadmapTableProps {
  roadmaps: QuantifiedCategoryRoadmap[]
}

export default function QuantifiedRoadmapTable({ roadmaps }: QuantifiedRoadmapTableProps) {
  if (roadmaps.length === 0) return null

  return (
    <div className="space-y-8">
      {roadmaps.map((rm) => {
        const info = VISA_CATEGORY_ROADMAP_LABELS[rm.visaCategory]
        const CatIcon = CATEGORY_ICONS[info.icon]

        return (
          <div key={rm.visaCategory} className="overflow-hidden rounded-xl border border-slate-200 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 bg-navy-900 px-4 py-3 text-white">
              <div className="flex items-center gap-2">
                <CatIcon className="h-5 w-5 text-gold-400" />
                <span className="font-semibold">{rm.visaCategory}</span>
                <span className="text-white/60 text-sm hidden sm:inline">— {info.title}</span>
              </div>
              <div className="text-sm">
                <span className="text-gold-400 font-bold">{rm.overallCompletionPercent}%</span>
                <span className="text-white/70"> benchmark met</span>
                {rm.totalGap > 0 && (
                  <span className="ml-2 text-amber-300">· {rm.totalGap} items to close</span>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="bg-navy-800 text-white">
                    <th className="px-4 py-3 text-left font-semibold w-28">CATEGORY</th>
                    {ROADMAP_METRICS.map((m) => {
                      const Icon = METRIC_ICONS[m.key]
                      return (
                        <th key={m.key} className="px-2 py-3 text-center font-semibold">
                          <div className="flex flex-col items-center gap-1">
                            <Icon className="h-4 w-4 text-gold-400/90" />
                            <span className="text-[10px] tracking-wide">{m.label}</span>
                          </div>
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-white">
                    <td className="px-4 py-4 font-bold text-navy-900 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <CatIcon className="h-4 w-4 text-gold-600" />
                        {rm.visaCategory}
                      </div>
                    </td>
                    {rm.metrics.map((m) => (
                      <CellValue
                        key={m.key}
                        current={m.current}
                        target={m.target}
                        gap={m.gap}
                        met={m.met}
                      />
                    ))}
                  </tr>
                  <tr className="bg-slate-50 text-xs text-slate-600">
                    <td className="px-4 py-2 font-medium">TARGET</td>
                    {rm.metrics.map((m) => (
                      <td key={m.key} className="px-3 py-2 text-center font-bold text-navy-900 tabular-nums">
                        {m.target}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )
      })}
    </div>
  )
}
