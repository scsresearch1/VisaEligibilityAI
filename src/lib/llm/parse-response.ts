import type { ProfileInsightRow, VisaCategory } from '../../types/assessment'

interface RawRow {
  categoryOfficialName?: string
  actionableItems?: string[] | string
  rmTeamRecommendedServices?: string[] | string
  sourceStrategicBasis?: string
  visaCategory?: string
}

function toList(value: string[] | string | undefined): string[] {
  if (!value) return []
  if (Array.isArray(value)) return value.filter(Boolean).map(String)
  return value
    .split(/\n|;/)
    .map((s) => s.replace(/^[-•*]\s*/, '').trim())
    .filter(Boolean)
}

function normalizeCategory(cat?: string): VisaCategory | undefined {
  if (!cat) return undefined
  const u = cat.toUpperCase().replace(/-/g, '')
  if (u.includes('EB1A') || u === 'A') return 'EB1A'
  if (u.includes('EB1B') || u === 'B') return 'EB1B'
  if (u.includes('EB1C') || u === 'C') return 'EB1C'
  return undefined
}

import { extractJsonObject, parseJsonLenient } from './parse-json-lenient'

export function parseInsightsJson(text: string): ProfileInsightRow[] {
  const cleaned = extractJsonObject(text)

  const parsed = parseJsonLenient(cleaned, 'Insights') as { rows?: RawRow[] }
  const rows = parsed.rows ?? (Array.isArray(parsed) ? (parsed as RawRow[]) : [])

  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error('LLM returned empty rows array')
  }

  return rows.map((row, i) => ({
    id: `insight-${i}-${Date.now()}`,
    categoryOfficialName: String(row.categoryOfficialName ?? 'Unnamed category'),
    actionableItems: toList(row.actionableItems),
    rmTeamRecommendedServices: toList(row.rmTeamRecommendedServices),
    sourceStrategicBasis: String(row.sourceStrategicBasis ?? ''),
    visaCategory: normalizeCategory(row.visaCategory),
  }))
}
