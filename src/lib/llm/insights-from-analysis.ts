import { VISA_CRITERIA } from '../../data/visa-criteria'
import type { AssessmentState, ProfileInsightRow, VisaCategory } from '../../types/assessment'

function criterionTitle(criterionId: string): string {
  const c = VISA_CRITERIA.find((x) => x.id === criterionId)
  return c ? `${c.code}. ${c.title}` : criterionId
}

/** Build insight rows from completed analysis when LLM returns empty (grounded in real assessment data). */
export function buildInsightsRowsFromAnalysis(state: AssessmentState): ProfileInsightRow[] {
  const defaultVisa: VisaCategory = state.selectedCategories[0] ?? 'EB1A'
  const rows: ProfileInsightRow[] = []
  const usedNames = new Set<string>()

  const push = (row: ProfileInsightRow) => {
    const key = row.categoryOfficialName.toLowerCase()
    if (usedNames.has(key)) return
    usedNames.add(key)
    rows.push(row)
  }

  for (const g of state.gaps.slice(0, 10)) {
    push({
      id: `insight-gap-${g.id}`,
      categoryOfficialName: g.title,
      actionableItems: [
        g.description.slice(0, 280),
        `Priority: address within 8–12 weeks (${g.severity} severity gap)`,
      ],
      rmTeamRecommendedServices: [
        'Evidence gap remediation package',
        'Criterion-specific documentation support',
      ],
      sourceStrategicBasis: `Assessment gap${g.criterionId ? ` — ${g.criterionId}` : ''}: ${g.severity} severity, impact ${g.impactScore}/99.`,
      visaCategory: g.category ?? defaultVisa,
    })
  }

  for (const r of state.recommendations.slice(0, 6)) {
    push({
      id: `insight-rec-${r.id}`,
      categoryOfficialName: r.documentType,
      actionableItems: [
        r.purpose.slice(0, 260),
        `Priority: ${r.priority} · estimated impact +${r.estimatedImpactPercent}%`,
      ],
      rmTeamRecommendedServices: [
        'Document production & verification',
        'Criterion-aligned exhibit drafting',
      ],
      sourceStrategicBasis: r.quantifiedBenefit || `Recommendation for ${r.category} pathway.`,
      visaCategory: r.category ?? defaultVisa,
    })
  }

  for (const action of state.roadmap.slice(0, 8)) {
    push({
      id: `insight-road-${action.id}`,
      categoryOfficialName: action.title,
      actionableItems: [
        action.description.slice(0, 260),
        action.deliverableOutline
          ? `Deliverable: ${action.deliverableOutline.slice(0, 120)}`
          : `Timeframe: ${action.timeframe}`,
      ],
      rmTeamRecommendedServices: [
        'Profile-building execution',
        'Deliverable spec & quality review',
      ],
      sourceStrategicBasis: action.profileAnchor
        ? `Roadmap action anchored to profile: ${action.profileAnchor.slice(0, 160)}`
        : `Prioritized build action (${action.evidenceArea}) · +${action.expectedReadinessGain} readiness.`,
      visaCategory: action.visaCategory ?? defaultVisa,
    })
  }

  for (const ev of state.evidenceItems.filter(
    (e) => e.strength === 'missing' || e.strength === 'unsupported' || e.strength === 'weak',
  ).slice(0, 8)) {
    const c = VISA_CRITERIA.find((x) => x.id === ev.criterionId)
    push({
      id: `insight-ev-${ev.id}`,
      categoryOfficialName: c ? criterionTitle(c.id) : ev.label.slice(0, 80),
      actionableItems: [
        ev.notes?.slice(0, 220) ?? ev.label.slice(0, 220),
        `Current strength: ${ev.strength} — produce verifiable third-party exhibits`,
      ],
      rmTeamRecommendedServices: [
        'Evidence strengthening package',
        'Independent verification support',
      ],
      sourceStrategicBasis: `Evidence rubric: ${ev.label.slice(0, 180)}`,
      visaCategory: c?.category ?? defaultVisa,
    })
  }

  for (const c of state.criterionResults.filter((cr) => cr.status !== 'satisfied').slice(0, 10)) {
    push({
      id: `insight-crit-${c.criterionId}`,
      categoryOfficialName: criterionTitle(c.criterionId),
      actionableItems: [
        c.summary.slice(0, 260),
        `Strengthen ${c.criterionId} from ${c.status} (${c.strength}) to petition-grade documentation`,
      ],
      rmTeamRecommendedServices: ['Criterion evidence mapping', 'Expert letter targeting'],
      sourceStrategicBasis: `Criterion evaluation: ${c.status}, strength ${c.strength}.`,
      visaCategory:
        VISA_CRITERIA.find((x) => x.id === c.criterionId)?.category ?? defaultVisa,
    })
  }

  for (const a of state.parsedAchievements.slice(0, 4)) {
    push({
      id: `insight-ach-${a.id}`,
      categoryOfficialName: `${a.type} — profile signal`,
      actionableItems: [
        a.summary.slice(0, 260),
        'Convert resume claim into externally verifiable exhibit (letter, publication, metric)',
      ],
      rmTeamRecommendedServices: ['Achievement verification dossier'],
      sourceStrategicBasis: `Parsed achievement (${Math.round(a.confidence * 100)}% confidence) in ${a.domain}.`,
      visaCategory: defaultVisa,
    })
  }

  return rows.slice(0, 12)
}
