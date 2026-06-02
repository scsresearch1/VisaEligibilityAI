export type PipelineStageId =
  | 'ingest'
  | 'structure'
  | 'signals'
  | 'domains'
  | 'rule_engine'
  | 'llm_reconcile'
  | 'insights'
  | 'finalize'

export type PipelineStageStatus = 'pending' | 'running' | 'done' | 'error' | 'skipped'

export interface PipelineMetric {
  label: string
  value: string | number
}

export interface PipelineStageDefinition {
  id: PipelineStageId
  label: string
  subtitle: string
  engine: string
}

export interface PipelineStageState extends PipelineStageDefinition {
  status: PipelineStageStatus
  metrics: PipelineMetric[]
  logs: string[]
}

export type PipelineEvent =
  | { type: 'init'; stages: PipelineStageState[] }
  | { type: 'stage'; stage: PipelineStageState }
  | { type: 'log'; stageId: PipelineStageId; line: string }
  | { type: 'complete'; summary: PipelineCompleteSummary }
  | { type: 'error'; message: string }

export interface PipelineCompleteSummary {
  sectionsDetected: number
  signalClaims: number
  domains: string[]
  criteriaScored: number
  analysisProvider?: string
  analysisModel?: string
  insightsProvider?: string
  gaps: number
  roadmapActions: number
}

export const PIPELINE_STAGE_DEFINITIONS: PipelineStageDefinition[] = [
  {
    id: 'ingest',
    label: 'Document ingest & normalization',
    subtitle: 'UTF-8 decode · PDF/DOCX text layer · snippet bounds',
    engine: 'Ingest pipeline v2',
  },
  {
    id: 'structure',
    label: 'Structural CV segmentation',
    subtitle: 'Heading classifier · work/education block parser · contact graph',
    engine: 'Section parser',
  },
  {
    id: 'signals',
    label: 'Entity & achievement signal extraction',
    subtitle: 'Publications · patents · leadership · risky-phrase NLP scan',
    engine: 'Profile signal graph',
  },
  {
    id: 'domains',
    label: 'Field inference & domain disambiguation',
    subtitle: 'Weighted ontology scoring · misalignment guard (academic/engineering)',
    engine: 'Domain inference engine',
  },
  {
    id: 'rule_engine',
    label: 'Regulatory rule engine (8 CFR)',
    subtitle: 'Per-criterion evidence rubric · reproducible baseline scores',
    engine: 'USCIS criteria mapper',
  },
  {
    id: 'llm_reconcile',
    label: 'LLM scientific reconciliation',
    subtitle: 'Hybrid routing · JSON schema validation · gap & roadmap synthesis',
    engine: 'Scientific assessment core',
  },
  {
    id: 'insights',
    label: 'Strategy insight synthesis',
    subtitle: 'Category-action matrix · regulatory basis · consulting services map',
    engine: 'Critical insights model',
  },
  {
    id: 'finalize',
    label: 'Quantified roadmap commit',
    subtitle: 'Metric counts · profile revision stamp · session persist',
    engine: 'State reconciler',
  },
]

export function createInitialStages(): PipelineStageState[] {
  return PIPELINE_STAGE_DEFINITIONS.map((def) => ({
    ...def,
    status: 'pending',
    metrics: [],
    logs: [],
  }))
}
