/** User-facing labels — no internal tech (LLM, API, model names) in the product UI. */

export const UI_COPY = {
  appTagline: 'U.S. visa pathway readiness',
  insightsTitle: 'Profile Strategy Insights',
  insightsDescription:
    'Criterion-by-criterion strategy: official categories, actionable steps, recommended services, and regulatory basis for your selected pathways.',
  analysisRunning: 'Analyzing profile and building strategy…',
  reportTitle: 'Benchmark Readiness Report',
  reportGenerate: 'Generate readiness report',
  reportGenerating: 'Building personalized readiness report…',
  reportDescription:
    'Quantified EB-1 profile-building roadmap aligned with official pathway criteria.',
  dossierTitle: 'Professional Review Dossier',
  dossierDescription:
    'Single export combining the readiness report and improvement roadmap for sharing with counsel or advisors.',
  dossierExport: 'Export combined dossier (PDF)',
  dossierFilename: 'EB1-Professional-Dossier-*.pdf',
  exportPhase: 'Export',
  readinessLabel: 'Petition readiness',
  legalReadyLabel: 'Submission-ready status',
  regenerateInsights: 'Refresh insights',
  quantificationNote: 'Quantified for this profile',
  insightsRows: 'strategy rows',
  lowExtractionWarning:
    'Limited text was extracted from uploads. Upload a PDF or Word resume with selectable text (not a scan-only image).',
  buildPrincipleShort:
    'Build new evidence matched to this profile — existing uploads cannot substitute for papers, patents, and products the team must create.',
  recommendationsTitle: 'Evidence build plan',
  recommendationsDescription:
    'Quantified deliverables the consulting team must produce (publish, file, ship, document) — aligned to this profile. Not a checklist of files to collect.',
  uploadPurpose:
    'Uploads profile the candidate for quantification only. Petition evidence is built afterward by the consulting team.',
} as const

export function formatAnalysisSource(_meta?: { provider?: string } | null): string {
  return UI_COPY.quantificationNote
}

export const FLOW_LABELS = {
  exportPhase: 'Export',
  insightsStep: 'Profile strategy insights',
  reportStep: 'Readiness benchmark report',
  dossierStep: 'Professional review dossier',
} as const
