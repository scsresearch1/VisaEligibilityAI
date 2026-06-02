import type { AssessmentState, VisaCategory } from '../types/assessment'
import { buildProfileAwareAnalysis } from './profile-analysis'

export function runMockAnalysis(
  categories: VisaCategory[],
  uploadCount: number,
  uploads: AssessmentState['uploads'] = [],
) {
  return buildProfileAwareAnalysis(categories, uploadCount, uploads)
}
