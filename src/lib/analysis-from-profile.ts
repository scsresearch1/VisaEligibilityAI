import { VISA_CRITERIA } from '../data/visa-criteria'
import type { ExtractedProfileSignals } from './benchmark-report/extract-profile'
import { primaryFieldLabel } from './benchmark-report/extract-profile'
import {
  buildFocusForCriterion,
  evidenceStatusLabel,
  gapBuildDescription,
} from './consulting-build-principle'
import type {
  AssessmentState,
  CriterionResult,
  DocumentRecommendation,
  EvidenceItem,
  GapItem,
  RiskFlag,
  RoadmapAction,
  VisaCategory,
} from '../types/assessment'
import type { BenchmarkRoadmapRow } from '../types/benchmark-report'
import { scoreAllCriteria } from './scientific-assessment/score-criterion'

type Strength = EvidenceItem['strength']

const STRENGTH_SCORE: Record<Strength, number> = {
  strong: 90,
  moderate: 58,
  weak: 38,
  attorney_review: 50,
  unsupported: 20,
  missing: 8,
}

function evidenceLabel(
  criterionId: string,
  profile: ExtractedProfileSignals,
  strength: Strength,
): string {
  const c = VISA_CRITERIA.find((x) => x.id === criterionId)
  const title = c?.title ?? criterionId
  const status = evidenceStatusLabel(strength, criterionId, profile.candidateName)
  const claim = profile.keyClaims[0]
  if (claim && (strength === 'weak' || strength === 'moderate')) {
    return `${title}: ${status} Profile anchor — "${claim.slice(0, 90)}…" — must be converted into built exhibits.`
  }
  return `${title}: ${status}`
}

export function buildCriterionAnalysis(
  categories: VisaCategory[],
  uploadCount: number,
  profile: ExtractedProfileSignals,
) {
  const rubricScores = scoreAllCriteria(categories, profile)

  const evidenceItems: EvidenceItem[] = rubricScores.map((r) => {
    const strength: Strength = uploadCount === 0 ? 'missing' : r.strength
    const score = uploadCount === 0 ? 8 : r.evidenceScore
    return {
      id: `ev-${r.criterionId}`,
      criterionId: r.criterionId,
      documentId: uploadCount > 0 ? 'resume-1' : undefined,
      label: evidenceLabel(r.criterionId, profile, strength).replace(
        /\.$/,
        ` (rubric ${score}/100).`,
      ),
      strength,
      notes:
        r.profileSignals.length > 0
          ? `Signals: ${r.profileSignals.join('; ')}. Build: ${buildFocusForCriterion(r.criterionId)}.`
          : `Rubric ${score}/100 — build: ${buildFocusForCriterion(r.criterionId)} in ${primaryFieldLabel(profile.domains)}.`,
    }
  })

  const criterionResults: CriterionResult[] = rubricScores.map((r) => {
    const ev = evidenceItems.find((e) => e.criterionId === r.criterionId)!
    const status =
      ev.strength === 'strong'
        ? 'satisfied'
        : ev.strength === 'moderate' || ev.strength === 'weak' || ev.strength === 'attorney_review'
          ? 'partial'
          : 'missing'
    return {
      criterionId: r.criterionId,
      status,
      strength: ev.strength,
      evidenceIds: [ev.id],
      summary: `${r.code} ${r.title}: ${status} (evidence index ${uploadCount === 0 ? 8 : r.evidenceScore}/100) — ${
        status === 'satisfied'
          ? 'threshold met pending external verification'
          : `consulting must build ${buildFocusForCriterion(r.criterionId)}`
      }.`,
    }
  })

  return { evidenceItems, criterionResults }
}

export { scoreAllCriteria }

export function buildGapsFromAnalysis(
  state: Pick<AssessmentState, 'criterionResults' | 'evidenceItems' | 'selectedCategories'>,
  profile: ExtractedProfileSignals,
): GapItem[] {
  const gaps: GapItem[] = []
  const field = primaryFieldLabel(profile.domains, profile.fullText)

  for (const c of VISA_CRITERIA.filter((cat) => state.selectedCategories.includes(cat.category))) {
    const result = state.criterionResults.find((r) => r.criterionId === c.id)
    const ev = state.evidenceItems.find((e) => e.criterionId === c.id)
    if (!result || result.status === 'satisfied') continue

    const score = ev ? STRENGTH_SCORE[ev.strength] : 0
    const severity: GapItem['severity'] =
      score < 15 ? 'critical' : score < 35 ? 'high' : 'medium'

    gaps.push({
      id: `gap-${c.id}`,
      category: c.category,
      criterionId: c.id,
      severity,
      title: `Must build: ${c.title}`,
      description: gapBuildDescription(c.title, field, profile.candidateName) +
        ` Target deliverable: ${buildFocusForCriterion(c.id)}.`,
      impactScore: Math.min(99, Math.max(40, 100 - score)),
    })
  }

  return gaps.slice(0, 12)
}

export function buildRecommendationsFromRoadmap(
  table: BenchmarkRoadmapRow[],
  categories: VisaCategory[],
  profile: ExtractedProfileSignals,
): DocumentRecommendation[] {
  const cat = categories[0] ?? 'EB1A'
  const recs: DocumentRecommendation[] = []

  for (const row of table) {
    if (row.quantityToBuild <= 0) continue
    const current = row.currentScore
    const target = row.targetScore
    const impact = Math.min(24, Math.max(6, Math.round((target - current) / 4)))

    recs.push({
      id: `rec-${row.id}`,
      category: cat,
      documentType: `Build ${row.quantityToBuild} × ${row.area}`,
      purpose: `${row.consultingResponsibility} (new asset production — not collection of existing files).`,
      priority:
        row.priority === 'Critical' ? 'critical' : row.priority === 'High' ? 'high' : 'medium',
      estimatedImpactPercent: impact,
      quantifiedBenefit: `After building, raise ${row.area.split('/')[0].trim()} from ${current}/100 toward ${target}/100`,
    })
  }

  if (recs.length === 0) {
    recs.push({
      id: 'rec-upload',
      category: cat,
      documentType: 'Profile intake refinement',
      purpose: `Sharpen build roadmap for ${profile.candidateName} (resume upload) — does not replace building papers, patents, or products.`,
      priority: 'high',
      estimatedImpactPercent: 10,
      quantifiedBenefit: 'Unlocks profile-matched build quantities',
    })
  }

  return recs
}

export function buildRiskFlagsFromProfile(profile: ExtractedProfileSignals): RiskFlag[] {
  const flags: RiskFlag[] = []
  const anchor =
    profile.keyClaims.length > 0
      ? profile.keyClaims.slice(0, 3).join('; ')
      : 'built publications, patents, and third-party verification tied to profile claims'

  profile.riskyPhrases.forEach((r, i) => {
    let riskType: RiskFlag['riskType'] = 'exaggerated'
    if (/\$|million|billion/i.test(r.phrase)) riskType = 'weak'
    if (/shipped|global|sole/i.test(r.phrase)) riskType = 'unsupported'

    flags.push({
      id: `risk-${i}`,
      claim: r.context.slice(0, 200),
      riskType,
      severity: riskType === 'exaggerated' ? 'high' : 'medium',
      recommendation: `Rebuild or support this claim with newly produced evidence (not resume text alone). Anchor: ${anchor}.`,
    })
  })

  if (flags.length === 0 && profile.keyClaims.length > 0) {
    flags.push({
      id: 'risk-generic',
      claim: profile.keyClaims[0].slice(0, 180),
      riskType: 'weak',
      severity: 'medium',
      recommendation:
        'Consulting must build independent letters, metrics, or publications that substantiate this claim.',
    })
  }

  if (flags.length === 0) {
    flags.push({
      id: 'risk-upload',
      claim: 'Limited extractable profile text',
      riskType: 'unsupported',
      severity: 'medium',
      recommendation:
        'Upload a PDF or Word resume for profiling, then execute the build roadmap — collection of old files will not close gaps.',
    })
  }

  return flags.slice(0, 6)
}

/** @deprecated Use buildPrioritizedActionPlan — kept for imports that only have a table */
export function buildRoadmapActionsFromTable(table: BenchmarkRoadmapRow[]): RoadmapAction[] {
  return table
    .filter((r) => r.quantityToBuild > 0 && !/counsel review|attorney-review/i.test(r.area))
    .slice(0, 8)
    .map((row, i) => ({
      id: `rm-${row.id}`,
      priority: i + 1,
      title: `Build: ${row.area} (${row.quantityToBuild})`,
      description: row.consultingResponsibility,
      timeframe:
        row.priority === 'Critical' ? '6–10 weeks' : row.priority === 'High' ? '8–12 weeks' : '10–16 weeks',
      expectedReadinessGain: Math.min(14, Math.max(4, Math.round((row.targetScore - row.currentScore) / 5))),
      category: 'add' as const,
      visaCategory: 'EB1A' as const,
    }))
}
