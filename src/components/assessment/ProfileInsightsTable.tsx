import type { ProfileInsightRow } from '../../types/assessment'
import { sanitizeProfileInsightRow } from '../../lib/user-facing-labels'

interface ProfileInsightsTableProps {
  rows: ProfileInsightRow[]
  compact?: boolean
}

export default function ProfileInsightsTable({ rows, compact }: ProfileInsightsTableProps) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-slate-500 py-8 text-center">
        No strategy insights yet. Run full profile analysis from the Analysis step.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto -mx-2 sm:mx-0">
      <table className="w-full min-w-[900px] text-sm border-collapse">
        <thead>
          <tr className="bg-navy-900 text-white text-left">
            <th className="px-4 py-3 font-semibold rounded-tl-lg w-[22%]">Category Official Name</th>
            <th className="px-4 py-3 font-semibold w-[24%]">Actionable Items</th>
            <th className="px-4 py-3 font-semibold w-[24%]">Consulting services</th>
            <th className="px-4 py-3 font-semibold rounded-tr-lg w-[30%]">Source / Strategic Basis</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => {
            const safe = sanitizeProfileInsightRow(row)
            return (
            <tr
              key={row.id}
              className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/80'}
            >
              <td className="px-4 py-4 align-top border-b border-slate-100">
                {row.visaCategory && (
                  <span className="inline-block mb-2 text-[10px] font-bold uppercase tracking-wider text-gold-600 bg-gold-500/10 px-2 py-0.5 rounded">
                    {row.visaCategory}
                  </span>
                )}
                <p className="font-medium text-navy-900 leading-snug">{safe.categoryOfficialName}</p>
              </td>
              <td className="px-4 py-4 align-top border-b border-slate-100">
                <ul className={`space-y-1.5 text-slate-700 ${compact ? 'text-xs' : ''}`}>
                  {safe.actionableItems.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="text-gold-600 shrink-0">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </td>
              <td className="px-4 py-4 align-top border-b border-slate-100">
                <ul className={`space-y-1.5 text-slate-700 ${compact ? 'text-xs' : ''}`}>
                  {safe.rmTeamRecommendedServices.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="text-navy-700 shrink-0">◆</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </td>
              <td className="px-4 py-4 align-top border-b border-slate-100 text-slate-600 leading-relaxed">
                {safe.sourceStrategicBasis}
              </td>
            </tr>
          )})}
        </tbody>
      </table>
    </div>
  )
}
