import type { AssessmentState, VisaCategory } from '../types/assessment'
import { extractProfileSignals } from './benchmark-report/extract-profile'
import { buildHeuristicPersonalizedPayload } from './benchmark-report/personalized-heuristic'
import {
  buildCriterionAnalysis,
  buildGapsFromAnalysis,
  buildRecommendationsFromRoadmap,
  buildRiskFlagsFromProfile,
} from './analysis-from-profile'
import { buildPrioritizedActionPlan } from './prioritized-action-plan'

/** Rule-based analysis — unique per profile text and criteria; no sample-candidate templates. */
export function buildProfileAwareAnalysis(
  categories: VisaCategory[],
  uploadCount: number,
  uploads: Parameters<typeof extractProfileSignals>[0],
) {
  const profile = extractProfileSignals(uploads)
  const { evidenceItems, criterionResults } = buildCriterionAnalysis(
    categories,
    uploadCount,
    profile,
  )

  const partial: Pick<
    AssessmentState,
    'selectedCategories' | 'criterionResults' | 'evidenceItems' | 'uploads'
  > = {
    selectedCategories: categories,
    criterionResults,
    evidenceItems,
    uploads,
  }

  const gaps = buildGapsFromAnalysis(partial, profile)
  const stateForRoadmap = {
    ...partial,
    analysisComplete: true,
    gaps,
  } as AssessmentState

  const roadmapTable = buildHeuristicPersonalizedPayload(stateForRoadmap, profile).roadmapTable
  const recommendations = buildRecommendationsFromRoadmap(roadmapTable, categories, profile)
  const riskFlags = buildRiskFlagsFromProfile(profile)

  const parsedAchievements =
    profile.keyClaims.length > 0
      ? profile.keyClaims.map((summary, i) => ({
          id: `pa-${i}`,
          type: ['Contribution', 'Leadership', 'Research', 'Impact', 'Recognition'][i % 5],
          summary,
          domain: profile.domains[i % Math.max(profile.domains.length, 1)] ?? 'Professional',
          confidence: 0.85,
        }))
      : [
          {
            id: 'pa-0',
            type: 'Profile',
            summary: `Uploaded materials for ${profile.candidateName}`,
            domain: profile.domains[0] ?? 'Professional',
            confidence: 0.65,
          },
        ]

  return {
    parsedAchievements,
    evidenceItems,
    criterionResults,
    gaps,
    recommendations,
    riskFlags,
    techDomains: profile.domains.length > 0 ? profile.domains : ['Professional practice'],
    roadmap: buildPrioritizedActionPlan({
      ...stateForRoadmap,
      gaps,
      recommendations,
      riskFlags,
      reportGenerated: false,
      parsedAchievements: [],
      techDomains: profile.domains,
      profileInsights: [],
      llmMeta: null,
      quantifiedRoadmap: null,
      benchmarkReport: null,
      structuredProfile: null,
      candidateNameOverride: null,
      analysisMeta: null,
      roadmap: [],
      profileRevision: 0,
    } as import('../types/assessment').AssessmentState),
  }
}
