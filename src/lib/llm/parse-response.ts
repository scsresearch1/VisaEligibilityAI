import { VISA_CRITERIA } from '../../data/visa-criteria'
import type { ProfileInsightRow, VisaCategory } from '../../types/assessment'
import { extractJsonObject, parseJsonLenient } from './parse-json-lenient'

interface RawRow {
  categoryOfficialName?: string
  category?: string
  title?: string
  name?: string
  actionableItems?: string[] | string
  actions?: string[] | string
  rmTeamRecommendedServices?: string[] | string
  services?: string[] | string
  sourceStrategicBasis?: string
  strategicBasis?: string
  basis?: string
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

function criterionNameFromId(criterionId?: string): string | undefined {
  if (!criterionId) return undefined
  const c = VISA_CRITERIA.find((x) => x.id === criterionId)
  return c ? `${c.code}. ${c.title}` : criterionId
}

function normalizeRawRow(row: RawRow, i: number): ProfileInsightRow | null {
  const name = String(
    row.categoryOfficialName ??
      row.title ??
      row.name ??
      row.category ??
      criterionNameFromId(row.criterionId) ??
      '',
  ).trim()
  const actions = toList(row.actionableItems ?? row.actions)
  const services = toList(row.rmTeamRecommendedServices ?? row.services)
  const basis = String(
    row.sourceStrategicBasis ?? row.strategicBasis ?? row.basis ?? '',
  ).trim()

  if (!name && actions.length === 0 && !row.criterionId) return null

  return {
    id: `insight-${i}-${Date.now()}`,
    categoryOfficialName: name || criterionNameFromId(row.criterionId) || 'Profile-building priority',
    actionableItems:
      actions.length > 0
        ? actions
        : ['Document evidence for this criterion within 8–12 weeks'],
    rmTeamRecommendedServices:
      services.length > 0
        ? services
        : ['Evidence package preparation', 'Criterion alignment review'],
    sourceStrategicBasis:
      basis || 'Derived from pathway criteria and profile assessment.',
    visaCategory: normalizeCategory(row.visaCategory),
  }
}

function extractRawRows(parsed: Record<string, unknown>): RawRow[] {
  const candidates = [
    parsed.rows,
    parsed.insights,
    parsed.strategyRows,
    parsed.profileInsights,
    parsed.strategy_insights,
    parsed.data,
    (parsed.data as Record<string, unknown> | undefined)?.rows,
    (parsed.result as Record<string, unknown> | undefined)?.rows,
  ]

  for (const c of candidates) {
    if (Array.isArray(c) && c.length > 0) {
      return c as RawRow[]
    }
    if (c && typeof c === 'object' && !Array.isArray(c)) {
      const nested = (c as Record<string, unknown>).rows
      if (Array.isArray(nested) && nested.length > 0) return nested as RawRow[]
    }
  }

  if (Array.isArray(parsed)) {
    return parsed as RawRow[]
  }

  return []
}

/** Parse insights JSON; returns [] instead of throwing when empty or malformed. */
export function parseInsightsJsonLenient(text: string): ProfileInsightRow[] {
  try {
    const cleaned = extractJsonObject(text)
    const parsed = parseJsonLenient(cleaned, 'Insights') as Record<string, unknown>
    const rawRows = extractRawRows(parsed)
    return rawRows
      .map((row, i) => normalizeRawRow(row, i))
      .filter((r): r is ProfileInsightRow => r !== null)
  } catch {
    return []
  }
}

export function parseInsightsJson(text: string): ProfileInsightRow[] {
  const rows = parseInsightsJsonLenient(text)
  if (rows.length === 0) {
    throw new Error('LLM returned empty rows array')
  }
  return rows
}
