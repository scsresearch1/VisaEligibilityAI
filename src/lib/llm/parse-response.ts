import type { ProfileInsightRow, VisaCategory } from '../../types/assessment'
import { extractJsonObject, parseJsonLenient } from './parse-json-lenient'

interface RawRow {
  categoryOfficialName?: string
  actionableItems?: string[] | string
  rmTeamRecommendedServices?: string[] | string
  sourceStrategicBasis?: string
  visaCategory?: string
  criterionId?: string
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

function normalizeRawRow(row: RawRow, i: number): ProfileInsightRow | null {
  const name = String(row.categoryOfficialName ?? '').trim()
  const actions = toList(row.actionableItems)
  if (!name && actions.length === 0) return null

  return {
    id: `insight-${i}-${Date.now()}`,
    categoryOfficialName: name || 'Profile-building priority',
    actionableItems:
      actions.length > 0
        ? actions
        : ['Document evidence for this criterion within 8–12 weeks'],
    rmTeamRecommendedServices: toList(row.rmTeamRecommendedServices).length
      ? toList(row.rmTeamRecommendedServices)
      : ['Evidence package preparation', 'Criterion alignment review'],
    sourceStrategicBasis: String(row.sourceStrategicBasis ?? 'Derived from pathway criteria and profile.'),
    visaCategory: normalizeCategory(row.visaCategory),
  }
}

function extractRawRows(parsed: Record<string, unknown>): RawRow[] {
  const candidates = [
    parsed.rows,
    parsed.insights,
    parsed.strategyRows,
    parsed.profileInsights,
    (parsed.data as Record<string, unknown> | undefined)?.rows,
  ]

  for (const c of candidates) {
    if (Array.isArray(c) && c.length > 0) {
      return c as RawRow[]
    }
  }

  if (Array.isArray(parsed)) {
    return parsed as RawRow[]
  }

  return []
}

export function parseInsightsJson(text: string): ProfileInsightRow[] {
  const cleaned = extractJsonObject(text)
  const parsed = parseJsonLenient(cleaned, 'Insights') as Record<string, unknown>
  const rawRows = extractRawRows(parsed)

  const rows = rawRows
    .map((row, i) => normalizeRawRow(row, i))
    .filter((r): r is ProfileInsightRow => r !== null)

  if (rows.length === 0) {
    throw new Error('LLM returned empty rows array')
  }

  return rows
}
