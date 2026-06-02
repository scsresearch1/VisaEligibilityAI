import type { AssessmentState, ProfileInsightRow, VisaCategory } from '../../types/assessment'

/** Build insight rows from completed analysis when LLM returns empty (grounded in real assessment data). */
export function buildInsightsRowsFromAnalysis(state: AssessmentState): ProfileInsightRow[] {
  const defaultVisa: VisaCategory = state.selectedCategories[0] ?? 'EB1A'
  const rows: ProfileInsightRow[] = []

  for (const g of state.gaps.slice(0, 10)) {
    rows.push({
      id: `insight-gap-${g.id}`,
      categoryOfficialName: g.title,
      actionableItems: [
        g.description.slice(0, 280),
        `Priority: address within 8–12 weeks (${g.severity} gap)`,
      ],
      rmTeamRecommendedServices: [
        'Evidence gap remediation package',
        'Criterion-specific documentation support',
      ],
      sourceStrategicBasis: `Assessment gap${g.criterionId ? ` — ${g.criterionId}` : ''}: ${g.severity} severity.`,
      visaCategory: g.category ?? defaultVisa,
    })
  }

  if (rows.length < 3) {
    for (const c of state.criterionResults.filter((cr) => cr.status !== 'satisfied').slice(0, 8)) {
      if (rows.some((r) => r.categoryOfficialName.includes(c.criterionId))) continue
      rows.push({
        id: `insight-crit-${c.criterionId}`,
        categoryOfficialName: `Criterion ${c.criterionId} — ${c.strength}`,
        actionableItems: [
          `Strengthen evidence for ${c.criterionId} (current: ${c.status})`,
          'Align publications, patents, or role proof to this criterion',
        ],
        rmTeamRecommendedServices: ['Criterion evidence mapping', 'Expert letter targeting'],
        sourceStrategicBasis: `Criterion evaluation: ${c.status}, strength ${c.strength}.`,
        visaCategory: defaultVisa,
      })
      if (rows.length >= 6) break
    }
  }

  return rows.slice(0, 12)
}
