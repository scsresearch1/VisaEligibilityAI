import type { AssessmentState, ProfileMetricCounts } from '../../types/assessment'
import type { ExtractedProfileSignals } from '../benchmark-report/extract-profile'
import { EB1A_ROADMAP_AREAS } from '../benchmark-report/roadmap-areas'
import { extractProfileMetricCounts } from '../quantified-roadmap'
import { detectProfileArchetype } from './profile-archetype'

const AREA_IDS = EB1A_ROADMAP_AREAS.map((a) => a.id)

export type RoadmapAreaScores = Record<string, number>

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(n)))
}

function pubScore(profile: ExtractedProfileSignals, counts: ProfileMetricCounts): number {
  const n = profile.publications.length + counts.sci + counts.scopus
  if (n >= 8) return 72
  if (n >= 4) return 48
  if (n >= 1) return 35
  return profile.hasPublication ? 22 : 8
}

function patentScore(profile: ExtractedProfileSignals, counts: ProfileMetricCounts): number {
  const n = profile.patents.length + counts.patent
  if (n >= 4) return 68
  if (n >= 2) return 42
  if (n >= 1) return 28
  return profile.hasPatent ? 18 : 0
}

function productScore(profile: ExtractedProfileSignals, counts: ProfileMetricCounts): number {
  const n = counts.product + (profile.hasProductClaim ? 1 : 0)
  if (n >= 3) return 55
  if (n >= 1) return 35
  return 12
}

function mediaScore(profile: ExtractedProfileSignals): number {
  if (/media|press|interview|featured|forbes/i.test(profile.fullText)) return 22
  return 0
}

function speakingScore(counts: ProfileMetricCounts): number {
  const n = counts.conference + counts.guestLecture
  if (n >= 8) return 58
  if (n >= 4) return 38
  if (n >= 1) return 18
  return 10
}

function judgingScore(profile: ExtractedProfileSignals): number {
  if (/judge|reviewer|examiner|panel|peer review/i.test(profile.fullText)) return 45
  if (profile.workExperience.some((w) => /examiner|review/i.test(w.title))) return 32
  return 0
}

function expertScore(profile: ExtractedProfileSignals): number {
  let s = 18
  if (profile.certifications.length >= 3) s += 12
  if (profile.awards.length > 0) s += 15
  if (profile.hasLeadership) s += 10
  return clamp(s, 8, 55)
}

function caseStudyScore(profile: ExtractedProfileSignals): number {
  const projects = profile.workExperience.filter((w) => w.highlights.length >= 2).length
  return clamp(20 + projects * 8, 12, 55)
}

function whitepaperScore(profile: ExtractedProfileSignals): number {
  if (countsBook(profile) > 0) return 35
  if (profile.publications.length > 0) return 22
  return 12
}

function countsBook(profile: ExtractedProfileSignals): number {
  return profile.publications.filter((p) => /chapter|book/i.test(p)).length
}

function proddocScore(product: number, patent: number): number {
  return clamp(15 + product * 8 + patent * 5, 12, 45)
}

function visibilityScore(counts: ProfileMetricCounts): number {
  return clamp(counts.sci * 2 + counts.scopus * 2, 8, 35)
}

function attorneyScore(state: AssessmentState): number {
  const n = state.criterionResults.length
  return clamp(35 + n * 2.5, 35, 70)
}

/** Inventory-driven current scores per roadmap area (reference report style). */
export function computeInventoryRoadmapScores(
  state: AssessmentState,
  profile: ExtractedProfileSignals,
): RoadmapAreaScores {
  const counts = state.quantifiedRoadmap?.current ?? extractProfileMetricCounts(state)
  const archetype = detectProfileArchetype(profile)

  const scores: RoadmapAreaScores = {
    'br-pub': pubScore(profile, counts),
    'br-patent': patentScore(profile, counts),
    'br-product': productScore(profile, counts),
    'br-whitepaper': whitepaperScore(profile),
    'br-articles': mediaScore(profile),
    'br-speaking': speakingScore(counts),
    'br-judging': judgingScore(profile),
    'br-expert': expertScore(profile),
    'br-case': caseStudyScore(profile),
    'br-proddoc': proddocScore(productScore(profile, counts), patentScore(profile, counts)),
    'br-visibility': visibilityScore(counts),
    'br-attorney': attorneyScore(state),
  }

  if (archetype === 'industry_senior') {
    scores['br-product'] = Math.max(scores['br-product'], 35)
    if (/repo|tibco|shipped/i.test(profile.fullText)) {
      scores['br-patent'] = Math.max(scores['br-patent'], 25)
      scores['br-pub'] = Math.max(scores['br-pub'], 35)
    }
  }

  if (archetype === 'academic_teaching') {
    scores['br-speaking'] = Math.max(scores['br-speaking'], 15)
    scores['br-judging'] = Math.max(scores['br-judging'], 8)
  }

  if (archetype === 'research_phd') {
    scores['br-pub'] = Math.max(scores['br-pub'], 45)
    scores['br-patent'] = Math.max(scores['br-patent'], 40)
  }

  for (const id of AREA_IDS) {
    if (scores[id] == null) scores[id] = 12
  }

  return scores
}

export function mergeInventoryWithCriterionScore(
  inventoryScore: number,
  criterionScore: number,
): number {
  return clamp(inventoryScore * 0.62 + criterionScore * 0.38, 0, 99)
}
