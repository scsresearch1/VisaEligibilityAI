import type { AssessmentState } from '../../types/assessment'
import type { BenchmarkReport, BenchmarkRoadmapRow, BenchmarkSection } from '../../types/benchmark-report'
import type { ExtractedProfileSignals } from './extract-profile'
import {
  publicationTitlesForProfile,
  patentTitlesForProfile,
  productSpecsForProfile,
} from '../reference-profile/deliverable-titles'

function qtyForArea(table: BenchmarkRoadmapRow[], areaSubstring: string): number {
  return table.find((r) => r.area.includes(areaSubstring))?.quantityToBuild ?? 0
}

function isCounselReviewArea(area: string): boolean {
  return /counsel review|attorney-review/i.test(area)
}

function uniqueLines(lines: string[], max: number): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const line of lines) {
    const key = line.toLowerCase().slice(0, 80)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(line)
    if (out.length >= max) break
  }
  return out
}

function buildPaperItems(profile: ExtractedProfileSignals, count: number) {
  const field = profile.domains.slice(0, 2).join(' / ') || 'documented technical domain'
  const domainTitles = publicationTitlesForProfile(profile, count)
  if (domainTitles.length >= count) {
    return domainTitles.slice(0, count).map((title, i) => ({
      title,
      purpose: `Strengthen authorship criterion with verifiable publication ${i + 1} tied to ${field}.`,
      eb1aContribution: 'Original authorship and scholarly contribution.',
    }))
  }

  const items: BenchmarkSection['items'] = []

  if (profile.publications.length > 0) {
    profile.publications.slice(0, count).forEach((pub, i) => {
      items.push({
        title: pub.slice(0, 120),
        purpose: `Strengthen authorship criterion with verifiable publication ${i + 1} tied to ${field}.`,
        eb1aContribution: 'Original authorship and scholarly contribution.',
      })
    })
  }

  for (const job of profile.workExperience) {
    if (items.length >= count) break
    for (const h of job.highlights) {
      if (items.length >= count) break
      items.push({
        title: `Research paper: ${h.slice(0, 90)}`,
        purpose: `Authored output grounded in ${job.title} at ${job.company}${job.period ? ` (${job.period})` : ''}.`,
        eb1aContribution: `Field expertise in ${field}.`,
        technicalBasis: h,
      })
    }
  }

  while (items.length < Math.max(1, count)) {
    const n = items.length + 1
    const gap = profile.keyClaims[0]?.slice(0, 100) ?? field
    items.push({
      title: `Publication ${n}: ${gap}`,
      purpose: `Close authorship gap with indexed technical writing in ${field}.`,
      eb1aContribution: 'Supports published material / authorship criteria.',
    })
  }

  return items.slice(0, count)
}

function buildPatentItems(profile: ExtractedProfileSignals, count: number) {
  const patentTitles = patentTitlesForProfile(profile, count)
  if (patentTitles.length >= count) {
    return patentTitles.slice(0, count).map((title) => ({
      title,
      technicalBasis: 'Enablement draft from profile-documented innovation.',
      eb1aContribution: 'Patent / original contribution evidence.',
    }))
  }

  const items: BenchmarkSection['items'] = []

  profile.patents.slice(0, count).forEach((p) => {
    items.push({
      title: p.slice(0, 120),
      technicalBasis: 'Existing or planned IP from uploaded profile.',
      eb1aContribution: 'Patent / original contribution evidence.',
    })
  })

  const techJobs = profile.workExperience.filter((w) =>
    /engineer|architect|developer|research|scientist|invent/i.test(w.title),
  )
  for (const job of techJobs) {
    if (items.length >= count) break
    const basis = job.highlights[0] ?? `${job.title} at ${job.company}`
    items.push({
      title: `Patent concept: ${basis.slice(0, 85)}`,
      technicalBasis: `Novel method or system from ${job.company} engagement — requires enablement draft.`,
      eb1aContribution: 'Original contribution / IP criterion.',
    })
  }

  while (items.length < Math.max(1, count)) {
    const claim = profile.keyMetrics[items.length] ?? profile.keyClaims[items.length] ?? 'core technical method'
    items.push({
      title: `Patent disclosure ${items.length + 1}: ${String(claim).slice(0, 80)}`,
      technicalBasis: 'Draft specification from profile-documented innovation.',
      eb1aContribution: 'Patent pipeline for EB-1A.',
    })
  }

  return items.slice(0, count)
}

function buildProductItems(profile: ExtractedProfileSignals, count: number) {
  const field = profile.domains[0] ?? 'technical practice'
  const specs = productSpecsForProfile(profile, count)
  if (specs.length >= count) {
    return specs.slice(0, count).map((p) => ({
      title: p.name,
      purpose: p.technicalImpact,
      eb1aContribution: 'Product / original contribution criterion.',
      coreModules: [p.financialImpact, p.socialImpact],
    }))
  }

  const items: BenchmarkSection['items'] = []

  for (const job of profile.workExperience) {
    if (items.length >= count) break
    if (!/product|platform|engineer|architect|lead|director/i.test(`${job.title} ${job.highlights.join(' ')}`)) {
      continue
    }
    const h = job.highlights[0] ?? job.title
    items.push({
      title: `Demonstrable artifact: ${h.slice(0, 90)}`,
      purpose: `Externally reviewable deliverable from ${job.company} (${job.title}).`,
      eb1aContribution: `Original contribution / leading role in ${field}.`,
      coreModules: job.highlights.slice(0, 4),
    })
  }

  while (items.length < Math.max(1, count)) {
    const m = profile.keyMetrics[items.length] ?? profile.skills[items.length] ?? field
    items.push({
      title: `Prototype ${items.length + 1}: ${String(m).slice(0, 70)}`,
      purpose: 'Convert resume claims into testable technical output with validation notes.',
      eb1aContribution: 'Supports product / technical artifact criterion.',
    })
  }

  return items.slice(0, count)
}

export function buildDynamicDetailedSections(
  profile: ExtractedProfileSignals,
  _state: AssessmentState,
  table: BenchmarkRoadmapRow[],
): BenchmarkSection[] {
  const field =
    profile.domains.length > 0 ? profile.domains.slice(0, 4).join(', ') : 'the candidate\'s documented field'
  const paperQty = qtyForArea(table, 'Publications')
  const patentQty = qtyForArea(table, 'Patent')
  const productQty = qtyForArea(table, 'Product / Technical')

  const summaryIntro = profile.professionalSummary
    ? profile.professionalSummary.slice(0, 400)
    : profile.keyClaims.slice(0, 3).join(' ')

  const sections: BenchmarkSection[] = [
    {
      id: 'sec-profile',
      number: 4,
      title: 'Profile-Derived Positioning Summary',
      intro: `Profile intake for ${profile.candidateName} (quality: ${profile.extractionQuality}). Used to scope what the consulting team must build — uploads do not satisfy petition criteria by themselves.`,
      bullets: uniqueLines(
        [
          ...profile.keyClaims,
          ...profile.workExperience.map(
            (w) => `${w.title} @ ${w.company}${w.period ? ` (${w.period})` : ''}`,
          ),
          ...profile.keyMetrics.map((m) => `Metric: ${m}`),
        ],
        10,
      ),
    },
  ]

  if (paperQty > 0) {
    sections.push({
      id: 'sec-papers',
      number: 5,
      title: 'Recommended Papers to Build',
      intro: `Build ${paperQty} publication(s) aligned to ${field}. ${summaryIntro ? `Profile context: ${summaryIntro.slice(0, 200)}` : ''}`,
      items: buildPaperItems(profile, paperQty),
    })
  }

  if (patentQty > 0) {
    sections.push({
      id: 'sec-patents',
      number: 6,
      title: 'Recommended Patents to Build',
      intro: `Prepare ${patentQty} patent-ready concept(s) from documented technical work.`,
      items: buildPatentItems(profile, patentQty),
    })
  }

  if (productQty > 0) {
    sections.push({
      id: 'sec-products',
      number: 7,
      title: 'Recommended Products / Prototypes to Build',
      intro: `Deliver ${productQty} reviewable artifact(s) in ${field}.`,
      items: buildProductItems(profile, productQty),
    })
  }

  sections.push({
    id: 'sec-criteria',
    number: 16,
    title: 'EB1A Criteria Improvement Projection',
    table: table
      .filter((r) => !isCounselReviewArea(r.area))
      .map((r) => ({
        label: r.area,
        current: `${r.currentScore}/100`,
        build: `${r.quantityToBuild} asset(s)`,
        target: `${r.targetScore}/100`,
      })),
  })

  return sections
}

export function buildDynamicTimeline(
  profile: ExtractedProfileSignals,
  table: BenchmarkRoadmapRow[],
): BenchmarkReport['timeline'] {
  const papers = qtyForArea(table, 'Publications')
  const patents = qtyForArea(table, 'Patent')
  const products = qtyForArea(table, 'Product / Technical')
  const articles = qtyForArea(table, 'Industry Articles')
  const speaking = qtyForArea(table, 'Speaking')
  const judging = qtyForArea(table, 'Judging')
  const expert = qtyForArea(table, 'Expert Profile')
  const domain = profile.domains[0] ?? 'primary field'

  const phase1Outputs = uniqueLines(
    [
      `EB-1 strategy map for ${profile.candidateName}`,
      `Evidence architecture (${domain})`,
      papers > 0 ? `${papers} publication topic outline(s)` : '',
      patents > 0 ? `${patents} patent concept brief(s)` : '',
    ],
    5,
  )

  return [
    { phase: 'Phase 1: Strategy and Asset Design', duration: '2 weeks', outputs: phase1Outputs },
    {
      phase: 'Phase 2: Product and Technical Framework Development',
      duration: '6 to 8 weeks',
      outputs: [
        `${products || 1} prototype(s) from profile work history`,
        'architecture / validation documentation',
      ],
    },
    {
      phase: 'Phase 3: Publication and White Paper Development',
      duration: '8 to 12 weeks',
      outputs: [
        `${papers || 1} paper(s)`,
        `${qtyForArea(table, 'White Papers') || 1} white paper(s)`,
        `${articles || 1} industry article(s)`,
      ],
    },
    {
      phase: 'Phase 4: Patent Filing Pipeline',
      duration: '6 to 10 weeks',
      outputs: [`${patents || 1} patent filing(s) with technical disclosure`],
    },
    {
      phase: 'Phase 5: Speaking, Reviewing, and Recognition Development',
      duration: '8 to 16 weeks',
      outputs: [
        `${speaking || 1} speaking engagement(s)`,
        `${judging || 1} judging / review activity(ies)`,
        `${expert || 1} expert-recognition asset(s)`,
      ],
    },
    {
      phase: 'Phase 6: Professional verification',
      duration: '1 to 3 weeks',
      outputs: ['1 counsel-review dossier', 'claim-safety review', 'verified action plan'],
    },
  ]
}
