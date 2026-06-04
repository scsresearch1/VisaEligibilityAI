import type { ExtractedProfileSignals } from '../benchmark-report/extract-profile'
import type { ArchetypeCalibration, ProfileArchetype } from './types'

const CALIBRATION: Record<ProfileArchetype, ArchetypeCalibration> = {
  academic_teaching: {
    archetype: 'academic_teaching',
    label: 'Engineering educator / academic leadership (thin research)',
    readinessBand: { min: 20, max: 30 },
    projectedBand: { min: 60, max: 74 },
    targetTotalAssets: 49,
  },
  research_phd: {
    archetype: 'research_phd',
    label: 'PhD researcher with publications/patents (quality conversion focus)',
    readinessBand: { min: 62, max: 72 },
    projectedBand: { min: 82, max: 92 },
    targetTotalAssets: 42,
  },
  industry_senior: {
    archetype: 'industry_senior',
    label: 'Senior enterprise technical / commercial leadership',
    readinessBand: { min: 52, max: 64 },
    projectedBand: { min: 80, max: 90 },
    targetTotalAssets: 41,
  },
  mixed_professional: {
    archetype: 'mixed_professional',
    label: 'Mixed professional profile',
    readinessBand: { min: 38, max: 55 },
    projectedBand: { min: 72, max: 86 },
    targetTotalAssets: 44,
  },
}

function yearsExperience(profile: ExtractedProfileSignals): number {
  const fromMetrics = profile.keyMetrics
    .map((m) => m.match(/(\d+)\+?\s*years?/i)?.[1])
    .filter(Boolean)
    .map(Number)
  if (fromMetrics.length > 0) return Math.max(...fromMetrics)

  const text = profile.fullText.match(/(\d+)\+?\s*years?\s+(?:of\s+)?experience/i)?.[1]
  return text ? Number(text) : 0
}

function isTeachingHeavy(profile: ExtractedProfileSignals): boolean {
  const teachingRoles = profile.workExperience.filter((w) =>
    /professor|lecturer|faculty|hod|head of department|teaching|examiner/i.test(
      `${w.title} ${w.company}`,
    ),
  ).length
  const pubCount = profile.publications.length
  return teachingRoles >= 1 && pubCount <= 4 && profile.patents.length === 0
}

function isResearchHeavy(profile: ExtractedProfileSignals): boolean {
  const hasPhd = profile.education.some((e) => /ph\.?\s*d|doctor of philosophy/i.test(e.degree ?? ''))
  const pubCount = profile.publications.length
  const patentCount = profile.patents.length
  const pharma =
    /pharma|vaccine|drug delivery|chitosan|dpi|formulation|biotech/i.test(profile.fullText)
  return (
    (hasPhd && pubCount >= 4) ||
    (pubCount >= 6 && patentCount >= 2) ||
    (pharma && pubCount >= 3 && patentCount >= 1)
  )
}

function isIndustrySenior(profile: ExtractedProfileSignals): boolean {
  const years = yearsExperience(profile)
  const seniorTitle = profile.workExperience.some((w) =>
    /architect|director|vp|principal|integration|solutions|consultant|program manager/i.test(
      w.title,
    ),
  )
  const enterprise =
    /pwc|microsoft|tibco|mulesoft|fortune|nestl|sap|oracle|cloud|edi|gtm|\$[\d,.]+\s*m/i.test(
      profile.fullText,
    )
  const lowAcademic =
    profile.workExperience.filter((w) => /professor|lecturer|faculty/i.test(w.title)).length === 0
  return lowAcademic && (years >= 15 || seniorTitle) && (enterprise || profile.hasProductClaim)
}

/** Classify profile tier aligned to RM reference dossiers. */
export function detectProfileArchetype(profile: ExtractedProfileSignals): ProfileArchetype {
  if (isResearchHeavy(profile)) return 'research_phd'
  if (isIndustrySenior(profile)) return 'industry_senior'
  if (isTeachingHeavy(profile)) return 'academic_teaching'
  return 'mixed_professional'
}

export function getArchetypeCalibration(archetype: ProfileArchetype): ArchetypeCalibration {
  return CALIBRATION[archetype]
}

export function archetypeLabel(archetype: ProfileArchetype): string {
  return getArchetypeCalibration(archetype).label
}

/** Blend computed readiness into reference-calibrated band. */
export function calibrateReadinessScore(
  computed: number,
  archetype: ProfileArchetype,
): number {
  const { readinessBand } = getArchetypeCalibration(archetype)
  const mid = Math.round((readinessBand.min + readinessBand.max) / 2)
  const blended = Math.round(computed * 0.35 + mid * 0.65)
  return Math.min(readinessBand.max, Math.max(readinessBand.min, blended))
}

export function calibrateProjectedReadiness(
  archetype: ProfileArchetype,
  totalAssets: number,
): { min: number; max: number } {
  const { projectedBand } = getArchetypeCalibration(archetype)
  const uplift = Math.min(6, Math.round(totalAssets / 12))
  return {
    min: Math.min(92, projectedBand.min + uplift - 3),
    max: Math.min(98, projectedBand.max + uplift),
  }
}

/** Scale roadmap build quantities toward reference asset totals (41–49). */
export function scaleBuildQuantitiesToTarget(
  rows: { id: string; quantityToBuild: number }[],
  archetype: ProfileArchetype,
): number[] {
  const target = getArchetypeCalibration(archetype).targetTotalAssets
  const current = rows.reduce((s, r) => s + r.quantityToBuild, 0)
  if (current === 0 || current === target) {
    return rows.map((r) => r.quantityToBuild)
  }

  const scaled = rows.map((r) => {
    if (r.id === 'br-attorney') return 1
    const share = r.quantityToBuild / current
    return Math.max(r.quantityToBuild > 0 ? 1 : 0, Math.round(share * (target - 1)))
  })

  let sum = scaled.reduce((a, b) => a + b, 0)
  const adjustable = scaled
    .map((q, i) => ({ q, i, id: rows[i].id }))
    .filter((x) => x.id !== 'br-attorney' && x.q > 0)

  while (sum > target && adjustable.length > 0) {
    const idx = adjustable.sort((a, b) => b.q - a.q)[0].i
    if (scaled[idx] > 1) {
      scaled[idx] -= 1
      sum -= 1
    } else break
  }

  while (sum < target - 1 && adjustable.length > 0) {
    const idx = adjustable[0].i
    scaled[idx] += 1
    sum += 1
  }

  return scaled
}
