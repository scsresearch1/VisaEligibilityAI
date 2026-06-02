import { VISA_CRITERIA } from '../../data/visa-criteria'
import type { AssessmentState, ProfileInsightRow, VisaCategory } from '../../types/assessment'
import { buildInsightsRowsFromAnalysis } from './insights-from-analysis'
import { generateFallbackInsights } from './mock-insights'

const MIN_ROWS = 3
const MAX_ROWS = 12

function rowKey(row: ProfileInsightRow): string {
  return `${row.visaCategory ?? ''}:${row.categoryOfficialName}`.toLowerCase()
}

function mergeRows(primary: ProfileInsightRow[], extra: ProfileInsightRow[]): ProfileInsightRow[] {
  const seen = new Set(primary.map(rowKey))
  const out = [...primary]
  for (const row of extra) {
    const key = rowKey(row)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(row)
    if (out.length >= MAX_ROWS) break
  }
  return out
}

function rowsFromOfficialCriteria(categories: VisaCategory[]): ProfileInsightRow[] {
  const rows: ProfileInsightRow[] = []
  for (const cat of categories) {
    const criteria = VISA_CRITERIA.filter((c) => c.category === cat).slice(0, 4)
    for (const c of criteria) {
      rows.push({
        id: `insight-official-${c.id}`,
        visaCategory: cat,
        categoryOfficialName: `${c.code}. ${c.title}`,
        actionableItems: [
          `Map profile evidence to 8 CFR criterion ${c.code} with documentary exhibits`,
          c.evidenceStandard
            ? `Evidence standard: ${c.evidenceStandard.slice(0, 200)}`
            : 'Collect third-party verification beyond resume claims',
        ],
        rmTeamRecommendedServices: [
          'Criterion evidence mapping',
          'Regulatory alignment review',
        ],
        sourceStrategicBasis:
          c.regulatoryCitation ??
          `Official ${cat} eligibility criterion ${c.code} — assessment-driven build plan.`,
      })
    }
  }
  return rows
}

/**
 * Guarantees a non-empty strategy insights table (min 3 rows) from LLM + analysis + templates.
 */
export function ensureProfileInsightRows(
  state: AssessmentState,
  llmRows: ProfileInsightRow[],
): { rows: ProfileInsightRow[]; source: 'llm' | 'analysis' | 'template' | 'mixed' } {
  let rows = llmRows.filter((r) => r.categoryOfficialName?.trim() || r.actionableItems?.length)
  let source: 'llm' | 'analysis' | 'template' | 'mixed' = rows.length >= MIN_ROWS ? 'llm' : 'mixed'

  if (rows.length < MIN_ROWS) {
    const fromAnalysis = buildInsightsRowsFromAnalysis(state)
    if (fromAnalysis.length > 0) {
      rows = mergeRows(rows, fromAnalysis)
      source = rows.length === llmRows.length ? 'analysis' : 'mixed'
    }
  }

  if (rows.length < MIN_ROWS && state.selectedCategories.length > 0) {
    rows = mergeRows(rows, rowsFromOfficialCriteria(state.selectedCategories))
    source = 'mixed'
  }

  if (rows.length < MIN_ROWS) {
    rows = mergeRows(rows, generateFallbackInsights(state.selectedCategories))
    source = rows.some((r) => llmRows.includes(r)) ? 'mixed' : 'template'
  }

  if (rows.length === 0) {
    rows = generateFallbackInsights(['EB1A'])
    source = 'template'
  }

  return { rows: rows.slice(0, MAX_ROWS), source }
}
