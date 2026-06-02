import type { BenchmarkRoadmapRow } from '../../types/benchmark-report'
import { displayRoadmapArea } from '../../lib/user-facing-labels'

export default function BenchmarkRoadmapPreviewTable({ rows }: { rows: BenchmarkRoadmapRow[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full min-w-[800px] text-sm">
        <thead>
          <tr className="bg-navy-900 text-white text-left">
            <th className="px-4 py-3 font-semibold">Area</th>
            <th className="px-3 py-3">Outline</th>
            <th className="px-3 py-3">Current</th>
            <th className="px-3 py-3">Target</th>
            <th className="px-3 py-3">Build Qty</th>
            <th className="px-3 py-3">Priority</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
              <td className="px-4 py-3 font-medium text-navy-900">{displayRoadmapArea(row.area)}</td>
              <td className="px-3 py-3 text-slate-600 text-xs max-w-[200px]">{row.areaOutline || '—'}</td>
              <td className="px-3 py-3 tabular-nums">{row.currentScore}/100</td>
              <td className="px-3 py-3 tabular-nums">{row.targetScore}/100</td>
              <td className="px-3 py-3 font-bold text-navy-900">{row.quantityToBuild}</td>
              <td className="px-3 py-3">
                <span
                  className={[
                    'text-xs font-semibold px-2 py-0.5 rounded',
                    row.priority === 'Critical'
                      ? 'bg-red-100 text-red-800'
                      : row.priority === 'High'
                        ? 'bg-orange-100 text-orange-800'
                        : 'bg-slate-100',
                  ].join(' ')}
                >
                  {row.priority}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
