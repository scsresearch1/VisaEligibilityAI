import type {
  GapItem,
  DocumentRecommendation,
  RiskFlag,
  ParsedAchievement,
  RoadmapAction,
  VisaCategory,
} from '../../types/assessment'
import type { ActionDeliverableSpec } from '../action-deliverable-spec'
import type { LlmScientificAnalysis } from '../scientific-assessment/reconcile'

export function parseAnalysisJson(
  text: string,
  categories: VisaCategory[],
): LlmScientificAnalysis & { roadmapActions?: RoadmapAction[] } {
  let cleaned = text.trim()
  const fence = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fence) cleaned = fence[1].trim()
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start === -1) throw new Error('No JSON in analysis response')
  cleaned = cleaned.slice(start, end + 1)

  const parsed = JSON.parse(cleaned) as {
    profileFacts?: Record<string, unknown>
    criterionEvaluations?: Record<string, unknown>[]
    parsedAchievements?: Record<string, unknown>[]
    gaps?: Record<string, unknown>[]
    recommendations?: Record<string, unknown>[]
    riskFlags?: Record<string, unknown>[]
    roadmapActions?: Record<string, unknown>[]
  }

  const defaultCat = categories[0] ?? 'EB1A'

  const parsedAchievements: ParsedAchievement[] = (parsed.parsedAchievements ?? []).map((a, i) => ({
    id: `pa-llm-${i}`,
    type: String(a.type ?? 'Achievement'),
    summary: String(a.summary ?? ''),
    domain: String(a.domain ?? 'Professional'),
    confidence: Math.min(1, Math.max(0, Number(a.confidence) || 0.8)),
  }))

  const gaps: GapItem[] = (parsed.gaps ?? []).map((g, i) => ({
    id: `gap-llm-${i}`,
    category: (String(g.category ?? defaultCat) as VisaCategory),
    criterionId: g.criterionId ? String(g.criterionId) : undefined,
    severity: (['critical', 'high', 'medium', 'low'].includes(String(g.severity))
      ? String(g.severity)
      : 'medium') as GapItem['severity'],
    title: String(g.title ?? 'Evidence gap'),
    description: String(g.description ?? ''),
    impactScore: Math.min(99, Math.max(1, Number(g.impactScore) || 50)),
  }))

  const recommendations: DocumentRecommendation[] = (parsed.recommendations ?? []).map(
    (r, i) => ({
      id: `rec-llm-${i}`,
      category: (String(r.category ?? defaultCat) as VisaCategory),
      documentType: String(r.documentType ?? 'Document'),
      purpose: String(r.purpose ?? ''),
      priority: (['critical', 'high', 'medium'].includes(String(r.priority))
        ? String(r.priority)
        : 'medium') as DocumentRecommendation['priority'],
      estimatedImpactPercent: Math.min(30, Math.max(1, Number(r.estimatedImpactPercent) || 10)),
      quantifiedBenefit: String(r.quantifiedBenefit ?? ''),
    }),
  )

  const riskFlags: RiskFlag[] = (parsed.riskFlags ?? []).map((r, i) => ({
    id: `risk-llm-${i}`,
    claim: String(r.claim ?? ''),
    riskType: (['exaggerated', 'unsupported', 'weak', 'legally_sensitive'].includes(
      String(r.riskType),
    )
      ? String(r.riskType)
      : 'weak') as RiskFlag['riskType'],
    severity: (['high', 'medium', 'low'].includes(String(r.severity))
      ? String(r.severity)
      : 'medium') as RiskFlag['severity'],
    recommendation: String(r.recommendation ?? ''),
  }))

  const roadmapActions: RoadmapAction[] = (parsed.roadmapActions ?? []).map((a, i) => {
    const rawSpec = a.deliverableSpec as Record<string, unknown> | undefined
    let deliverableSpec: ActionDeliverableSpec | undefined
    if (rawSpec && typeof rawSpec === 'object') {
      const kind = String(rawSpec.kind ?? 'general') as ActionDeliverableSpec['kind']
      deliverableSpec = {
        kind: [
          'publications',
          'patents',
          'product',
          'whitepaper',
          'media',
          'speaking',
          'judging',
          'case_study',
          'documentation',
          'visibility',
          'general',
        ].includes(kind)
          ? kind
          : 'general',
        suggestedTitles: Array.isArray(rawSpec.suggestedTitles)
          ? rawSpec.suggestedTitles.map(String).slice(0, 5)
          : undefined,
        outline: rawSpec.outline ? String(rawSpec.outline) : undefined,
        domain: rawSpec.domain ? String(rawSpec.domain) : undefined,
      }
    }
    return {
      id: `plan-llm-${i}`,
      priority: Math.max(1, Number(a.priority) || i + 1),
      title: String(a.title ?? 'Profile-building action'),
      domain: String(a.domain ?? 'Professional field'),
      evidenceArea: String(a.evidenceArea ?? 'Evidence'),
      deliverableOutline: String(a.deliverableOutline ?? ''),
      deliverableSpec,
      description: String(a.description ?? ''),
      profileAnchor: a.profileAnchor ? String(a.profileAnchor) : undefined,
      timeframe: String(a.timeframe ?? '8–12 weeks'),
      expectedReadinessGain: Math.min(20, Math.max(3, Number(a.expectedReadinessGain) || 8)),
      category: (['add', 'improve', 'document', 'validate'].includes(String(a.category))
        ? String(a.category)
        : 'add') as RoadmapAction['category'],
      visaCategory: (['EB1A', 'EB1B', 'EB1C'].includes(String(a.visaCategory))
        ? String(a.visaCategory)
        : defaultCat) as VisaCategory,
    }
  })

  const criterionEvaluations = (parsed.criterionEvaluations ?? []).map((ev) => ({
    criterionId: String(ev.criterionId ?? ''),
    evidenceScore: Math.min(100, Math.max(0, Number(ev.evidenceScore) || 0)),
    strengthLabel: ev.strengthLabel ? String(ev.strengthLabel) : undefined,
    profileEvidence: Array.isArray(ev.profileEvidence)
      ? ev.profileEvidence.map(String)
      : undefined,
    regulatoryBasis: ev.regulatoryBasis ? String(ev.regulatoryBasis) : undefined,
    gapSummary: ev.gapSummary ? String(ev.gapSummary) : undefined,
    buildRecommendation: ev.buildRecommendation ? String(ev.buildRecommendation) : undefined,
  }))

  const profileFacts = parsed.profileFacts
    ? {
        domains: Array.isArray(parsed.profileFacts.domains)
          ? (parsed.profileFacts.domains as string[])
          : undefined,
        verifiedFacts: Array.isArray(parsed.profileFacts.verifiedFacts)
          ? (parsed.profileFacts.verifiedFacts as { fact: string; source: string; confidence: number }[])
          : undefined,
        unsupportedClaims: Array.isArray(parsed.profileFacts.unsupportedClaims)
          ? (parsed.profileFacts.unsupportedClaims as string[])
          : undefined,
      }
    : undefined

  if (
    gaps.length === 0 &&
    recommendations.length === 0 &&
    roadmapActions.length === 0 &&
    criterionEvaluations.length === 0
  ) {
    throw new Error('LLM returned empty analysis')
  }

  return {
    profileFacts,
    criterionEvaluations,
    parsedAchievements,
    gaps,
    recommendations,
    riskFlags,
    roadmapActions: roadmapActions.length > 0 ? roadmapActions : undefined,
  }
}
