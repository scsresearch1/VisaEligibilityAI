/**
 * RM USA Works model: intake uploads profile the candidate only.
 * Petition-grade evidence must be newly built (papers, patents, products, etc.)
 * matched to that profile — not satisfied by collecting existing files alone.
 */

export const CONSULTING_BUILD_PRINCIPLE =
  'Uploaded materials are for profiling only. The consulting team must build new, externally verifiable evidence assets (publish papers, file patents, ship demonstrable products, secure articles, speaking, judging records, etc.) tailored to this candidate\'s field and career narrative — existing documents alone cannot close EB-1 gaps.'

export const CONSULTING_BUILD_PRINCIPLE_SHORT =
  'Build new evidence matched to this profile — do not rely on collecting existing documents.'

/** Criterion code → primary build deliverable the consulting team must produce */
export const CRITERION_BUILD_FOCUS: Record<string, string> = {
  '1': 'national/international awards program submissions',
  '2': 'selective membership and fellowship documentation',
  '3': 'published material about the candidate in trade or major media',
  '4': 'judging / peer-review appointments with proof of role',
  '5': 'original contributions: patents, products, or technical artifacts',
  '6': 'scholarly articles and technical publications',
  '7': 'display of work at exhibitions or showcases',
  '8': 'leading or critical role documentation with org impact',
  '9': 'high remuneration benchmarking package',
  '10': 'commercial success in performing arts (if applicable)',
  '11': 'high salary / remuneration evidence in the field',
  '12': 'critical role at distinguished organizations',
}

export function buildFocusForCriterion(criterionId: string): string {
  const code = criterionId.replace(/^(eb1a|eb1b|eb1c)-/, '')
  return CRITERION_BUILD_FOCUS[code] ?? 'criterion-aligned evidence assets'
}

export function gapBuildDescription(
  criterionTitle: string,
  field: string,
  candidateName: string,
): string {
  return `No petition-ready ${criterionTitle.toLowerCase()} exists yet for ${candidateName} in ${field}. The consulting team must build and document new assets (not collect existing files) mapped to this criterion.`
}

export function evidenceStatusLabel(
  strength: 'missing' | 'unsupported' | 'weak' | 'moderate' | 'strong' | 'attorney_review',
  criterionId: string,
  candidateName: string,
): string {
  const build = buildFocusForCriterion(criterionId)
  if (strength === 'missing' || strength === 'unsupported') {
    return `Not yet built — consulting must produce: ${build} (profile: ${candidateName}).`
  }
  if (strength === 'weak') {
    return `Insufficient built evidence — expand with: ${build}.`
  }
  if (strength === 'moderate') {
    return `Partial built signal — strengthen with additional: ${build}.`
  }
  return `Built evidence present — verify externally before filing.`
}
