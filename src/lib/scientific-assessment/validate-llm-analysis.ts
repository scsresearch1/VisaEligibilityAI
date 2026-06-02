import { VISA_CRITERIA } from '../../data/visa-criteria'
import type { VisaCategory, ParsedAchievement, GapItem } from '../../types/assessment'
import type { ExtractedProfileSignals } from '../benchmark-report/extract-profile'
import type { LlmScientificAnalysis } from './reconcile'
import type { CriterionEvidenceScore } from './score-criterion'
import { buildProfileFactInventory, type ProfileFactInventory } from './profile-fact-inventory'
import type { StructuredResumeProfile } from '../resume-deep-extract'
import { evidenceScoreToStrength } from './methodology'

const MAX_SCORE_DELTA_UP = 15
const MAX_SCORE_DELTA_DOWN = 25
const MAX_SCORE_DELTA_UP_UNANCHORED = 5

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}

/** True if fragment appears in profile corpus (substring or 3-word phrase match). */
export function textAnchoredInCorpus(fragment: string, corpus: string): boolean {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^\w\s@.-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  const f = norm(fragment)
  if (f.length < 10) return false
  const c = norm(corpus)
  if (c.includes(f)) return true
  const words = f.split(' ').filter((w) => w.length > 2)
  if (words.length < 3) return f.length >= 14 && c.includes(f.slice(0, 40))
  for (let i = 0; i <= words.length - 3; i++) {
    const phrase = words.slice(i, i + 3).join(' ')
    if (phrase.length >= 10 && c.includes(phrase)) return true
  }
  return false
}

function hasAnchoredEvidence(
  profileEvidence: string[] | undefined,
  inventory: ProfileFactInventory,
): boolean {
  if (!profileEvidence?.length) return false
  return profileEvidence.some((e) => textAnchoredInCorpus(e, inventory.corpus))
}

export function clampLlmScoreToBaseline(
  ruleScore: number,
  llmScore: number,
  anchored: boolean,
): number {
  const up = anchored ? MAX_SCORE_DELTA_UP : MAX_SCORE_DELTA_UP_UNANCHORED
  return clamp(llmScore, ruleScore - MAX_SCORE_DELTA_DOWN, ruleScore + up)
}

export interface ValidateLlmAnalysisOptions {
  categories: VisaCategory[]
  profile: ExtractedProfileSignals
  ruleScores: CriterionEvidenceScore[]
  structured?: StructuredResumeProfile | null
}

/**
 * Normalize LLM output: enforce criterion coverage, anchor evidence, clamp scores to baseline.
 */
export function validateAndNormalizeLlmAnalysis(
  llm: LlmScientificAnalysis,
  options: ValidateLlmAnalysisOptions,
): LlmScientificAnalysis {
  const { categories, profile, ruleScores, structured } = options
  const inventory = buildProfileFactInventory(profile, structured)
  const validIds = new Set(
    VISA_CRITERIA.filter((c) => categories.includes(c.category)).map((c) => c.id),
  )
  const ruleById = new Map(ruleScores.map((r) => [r.criterionId, r]))

  const evalMap = new Map<string, NonNullable<LlmScientificAnalysis['criterionEvaluations']>[number]>()

  for (const ev of llm.criterionEvaluations ?? []) {
    if (!validIds.has(ev.criterionId)) continue
    const rule = ruleById.get(ev.criterionId)
    const rawScore = clamp(Number(ev.evidenceScore) || 0, 0, 100)
    const anchored = hasAnchoredEvidence(ev.profileEvidence, inventory)
    const adjusted = rule
      ? clampLlmScoreToBaseline(rule.evidenceScore, rawScore, anchored)
      : anchored
        ? rawScore
        : Math.min(rawScore, 45)

    const profileEvidence = (ev.profileEvidence ?? []).filter((e) =>
      textAnchoredInCorpus(e, inventory.corpus),
    )
    if (profileEvidence.length === 0 && rule?.profileSignals.length) {
      profileEvidence.push(...rule.profileSignals.slice(0, 2))
    }

    evalMap.set(ev.criterionId, {
      ...ev,
      evidenceScore: adjusted,
      strengthLabel: evidenceScoreToStrength(adjusted),
      profileEvidence: profileEvidence.length > 0 ? profileEvidence : undefined,
      regulatoryBasis:
        ev.regulatoryBasis ||
        rule?.regulatoryNote ||
        VISA_CRITERIA.find((c) => c.id === ev.criterionId)?.regulatoryCitation,
    })
  }

  for (const rule of ruleScores) {
    if (evalMap.has(rule.criterionId)) continue
    evalMap.set(rule.criterionId, {
      criterionId: rule.criterionId,
      evidenceScore: rule.evidenceScore,
      strengthLabel: rule.strength,
      profileEvidence: rule.profileSignals.length > 0 ? rule.profileSignals : undefined,
      regulatoryBasis: rule.regulatoryNote,
      gapSummary:
        rule.evidenceScore < 56
          ? `Baseline rubric ${rule.evidenceScore}/100 — insufficient documented evidence in profile.`
          : undefined,
      buildRecommendation: undefined,
    })
  }

  const criterionEvaluations = [...evalMap.values()].filter((e) => validIds.has(e.criterionId))

  const parsedAchievements: ParsedAchievement[] = (llm.parsedAchievements ?? [])
    .filter((a) => {
      const summary = `${a.type} ${a.summary}`.trim()
      if (summary.length < 12) return false
      return (
        textAnchoredInCorpus(summary, inventory.corpus) ||
        inventory.keyClaims.some((c) => textAnchoredInCorpus(summary, c.toLowerCase()))
      )
    })
    .map((a, i) => ({
      id: `pa-val-${i}`,
      type: a.type,
      summary: a.summary,
      domain: a.domain || inventory.domains[0] || 'Professional',
      confidence: clamp(a.confidence ?? 0.75, 0.35, 0.95),
    }))

  const gaps: GapItem[] = (llm.gaps ?? [])
    .filter((g) => !g.criterionId || validIds.has(g.criterionId))
    .map((g, i) => {
      const rule = g.criterionId ? ruleById.get(g.criterionId) : undefined
      const evalScore = g.criterionId ? evalMap.get(g.criterionId)?.evidenceScore : undefined
      const baseScore = evalScore ?? rule?.evidenceScore ?? 50
      return {
        ...g,
        id: g.id || `gap-val-${i}`,
        impactScore: clamp(
          g.impactScore || Math.round(100 - baseScore),
          1,
          99,
        ),
      }
    })

  const unsupported = (llm.profileFacts?.unsupportedClaims ?? []).filter((c) =>
    textAnchoredInCorpus(c, inventory.corpus),
  )

  return {
    ...llm,
    profileFacts: {
      domains: inventory.domains,
      verifiedFacts: inventory.verifiedFacts.slice(0, 20).map((f) => ({
        fact: f.fact,
        source: f.source,
        confidence: 0.9,
      })),
      unsupportedClaims: unsupported.slice(0, 8),
    },
    criterionEvaluations,
    parsedAchievements,
    gaps,
    recommendations: llm.recommendations ?? [],
    riskFlags: llm.riskFlags ?? [],
  }
}
