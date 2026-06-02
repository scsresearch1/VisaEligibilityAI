import type { BenchmarkReport } from '../../types/benchmark-report'
import { displaySubmissionReadyStatus } from '../user-facing-labels'
import { sanitizeBenchmarkForDisplay } from './sanitize-display'

export function benchmarkReportToPlainText(report: BenchmarkReport): string {
  const r = sanitizeBenchmarkForDisplay(report)
  const lines: string[] = [
    'Visa Eligibility AI Benchmark Report',
    r.reportTitle,
    `Generated: ${new Date(r.generatedAt).toLocaleString()}`,
    '',
  ]

  let sectionNum = 1
  lines.push(`${sectionNum++}. Corrected Evaluation Logic`, '')
  r.evaluationLogic.forEach((p) => lines.push(p, ''))

  lines.push(`${sectionNum++}. Current EB1A Baseline`, '')
  lines.push(`Current EB1A Readiness: ${r.baseline.readinessScore} / 100`)
  lines.push(`Current Evidence Strength: ${r.baseline.evidenceStrength}`)
  lines.push(`Submission-ready status: ${displaySubmissionReadyStatus(r.baseline.attorneyReadyStatus)}`)
  lines.push(`Primary Gap: ${r.baseline.primaryGap}`)
  lines.push(`Main Consulting Requirement: ${r.baseline.consultingRequirement}`)
  lines.push(`Verification: ${r.baseline.verificationOwner}`, '')

  lines.push(`${sectionNum++}. Final Quantified Roadmap Output`, '')
  lines.push('Roadmap Quantity and Score Table')
  lines.push(
    'Roadmap Area\tCurrent Score\tTarget Score\tQuantity to Build\tPriority\tConsulting Team Responsibility',
  )
  for (const row of r.roadmapTable) {
    lines.push(
      `${row.area}\t${row.currentScore} / 100\t${row.targetScore} / 100\t${row.quantityToBuild}\t${row.priority}\t${row.consultingResponsibility}`,
    )
  }
  lines.push('')

  lines.push(`${sectionNum++}. Total Roadmap Build Requirement`, '')
  lines.push('Minimum Recommended Build Package', '')
  r.minimumBuildPackage.forEach((item) => lines.push(item))
  lines.push('', `Total Roadmap Assets to Build: ${r.totalAssetsToBuild}`, '')

  for (const sec of r.sections) {
    lines.push(`${sec.number}. ${sec.title}`, '')
    if (sec.intro) lines.push(sec.intro, '')
    sec.items?.forEach((item, i) => {
      lines.push(`Item ${i + 1}: ${item.title}`)
      if (item.purpose) lines.push(`Purpose: ${item.purpose}`)
      if (item.technicalBasis) lines.push(`Technical Basis: ${item.technicalBasis}`)
      if (item.eb1aContribution) lines.push(`EB1A Contribution: ${item.eb1aContribution}`)
      if (item.coreModules) lines.push('Core Modules:', ...item.coreModules.map((m) => `  - ${m}`))
      lines.push('')
    })
    sec.table?.forEach((t) => {
      lines.push(`${t.label}: ${t.current} → ${t.build} → ${t.target}`)
    })
    lines.push('')
  }

  lines.push('Implementation Timeline', '')
  r.timeline.forEach((t) => {
    lines.push(`${t.phase} — ${t.duration}`)
    lines.push('Outputs:', ...t.outputs.map((o) => `  - ${o}`), '')
  })

  lines.push('Verification package', '')
  r.attorneyPackageItems.forEach((item) => lines.push(item))
  lines.push('', r.attorneyPackageTotal, '')

  lines.push('Final Benchmark Conclusion', '')
  lines.push(r.conclusion.summary, '')
  lines.push(`Current EB1A Readiness: ${r.conclusion.currentReadiness} / 100`)
  lines.push(
    `Projected Readiness After Roadmap Execution: ${r.conclusion.projectedReadinessMin} to ${r.conclusion.projectedReadinessMax} / 100`,
  )
  lines.push(
    `Projected submission-ready score: ${r.conclusion.projectedAttorneyMin} to ${r.conclusion.projectedAttorneyMax} / 100`,
  )
  lines.push(`Total assets: ${r.conclusion.totalAssets}`)
  lines.push('', 'Quantified from this profile and selected pathway criteria.')

  return lines.join('\n')
}
