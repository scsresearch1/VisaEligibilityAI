import { useCallback, useMemo, useState } from 'react'
import {
  Activity,
  Brain,
  CircuitBoard,
  Cpu,
  Database,
  Layers,
  Network,
  Play,
  Scale,
  Sparkles,
  Terminal,
  Zap,
} from 'lucide-react'
import { useAssessment } from '../../context/AssessmentContext'
import { getAnalysisModelStack } from '../../lib/analysis-pipeline/config'
import {
  createInitialStages,
  type PipelineEvent,
  type PipelineStageState,
  type PipelineStageStatus,
} from '../../lib/analysis-pipeline/types'
import { isLlmConfigured } from '../../lib/llm/generate-profile-insights'
import Button from '../ui/Button'
import type { VisaCategory } from '../../types/assessment'

const STAGE_ICONS: Record<string, typeof Cpu> = {
  ingest: Database,
  structure: Layers,
  signals: Network,
  domains: Brain,
  rule_engine: Scale,
  llm_reconcile: Sparkles,
  insights: CircuitBoard,
  finalize: Activity,
}

function statusStyles(status: PipelineStageStatus): string {
  switch (status) {
    case 'running':
      return 'border-cyan-400/60 bg-cyan-950/40 shadow-[0_0_24px_rgba(34,211,238,0.15)]'
    case 'done':
      return 'border-emerald-500/40 bg-emerald-950/20'
    case 'error':
      return 'border-red-500/50 bg-red-950/30'
    case 'skipped':
      return 'border-white/10 bg-white/5 opacity-60'
    default:
      return 'border-white/10 bg-navy-950/30'
  }
}

function statusDot(status: PipelineStageStatus): string {
  switch (status) {
    case 'running':
      return 'bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.8)]'
    case 'done':
      return 'bg-emerald-400'
    case 'error':
      return 'bg-red-400'
    case 'skipped':
      return 'bg-slate-500'
    default:
      return 'bg-slate-600'
  }
}

interface DeepAnalysisEngineProps {
  categories: VisaCategory[]
  documentCount: number
  analysisComplete: boolean
  onRunComplete?: () => void
}

export default function DeepAnalysisEngine({
  categories,
  documentCount,
  analysisComplete,
  onRunComplete,
}: DeepAnalysisEngineProps) {
  const { runAnalysis, state } = useAssessment()
  const [running, setRunning] = useState(false)
  const [stages, setStages] = useState<PipelineStageState[]>(() => createInitialStages())
  const [terminalLines, setTerminalLines] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  const modelStack = useMemo(() => getAnalysisModelStack(), [])
  const llmReady = isLlmConfigured()

  const handlePipelineEvent = useCallback((event: PipelineEvent) => {
    if (event.type === 'init') {
      setStages(event.stages)
      setTerminalLines([])
      setError(null)
      return
    }
    if (event.type === 'stage') {
      setStages((prev) => prev.map((s) => (s.id === event.stage.id ? event.stage : s)))
      return
    }
    if (event.type === 'log') {
      const ts = new Date().toISOString().slice(11, 23)
      setTerminalLines((prev) => [...prev, `[${ts}] ${event.stageId}> ${event.line}`].slice(-40))
      setStages((prev) =>
        prev.map((s) =>
          s.id === event.stageId ? { ...s, logs: [...s.logs, event.line].slice(-8) } : s,
        ),
      )
      return
    }
    if (event.type === 'error') {
      setError(event.message)
      return
    }
    if (event.type === 'complete') {
      const s = event.summary
      setTerminalLines((prev) => [
        ...prev,
        `[done] Pipeline complete · ${s.criteriaScored} criteria · ${s.gaps} gaps · ${s.roadmapActions} actions`,
      ])
    }
  }, [])

  const handleRun = async () => {
    setRunning(true)
    setError(null)
    const ok = await runAnalysis({ onPipelineEvent: handlePipelineEvent })
    setRunning(false)
    if (ok) onRunComplete?.()
  }

  const activeStage = stages.find((s) => s.status === 'running')
  const completedCount = stages.filter((s) => s.status === 'done').length

  return (
    <section className="mt-8 overflow-hidden rounded-2xl border border-navy-700/80 bg-navy-950 text-white shadow-2xl shadow-navy-900/30">
      {/* Header */}
      <div className="relative mesh-gradient hero-grid px-6 py-6 sm:px-8 border-b border-white/10">
        <div className="absolute inset-0 bg-linear-to-br from-cyan-500/5 via-transparent to-gold-500/10 pointer-events-none" />
        <div className="relative flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-300">
              <Zap className="h-3 w-3" />
              Deep tech analysis stack
            </div>
            <h2 className="mt-3 text-xl sm:text-2xl font-bold tracking-tight">
              Profile parsing engine &{' '}
              <span className="text-gradient-gold">regulatory rule core</span>
            </h2>
            <p className="mt-2 text-sm text-white/65 leading-relaxed">
              Multi-stage pipeline: deterministic CV segmentation, entity signal graph, 8 CFR
              rule-engine scoring, then hybrid LLM reconciliation (Groq long-context + Gemini
              critical reasoning) — profile facts only, no assumed credentials.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 lg:justify-end">
            {modelStack.map((m) => (
              <div
                key={`${m.provider}-${m.model}`}
                className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 min-w-[140px]"
              >
                <p className="text-[10px] uppercase tracking-wider text-gold-400/90">{m.role}</p>
                <p className="text-xs font-mono font-semibold text-white mt-0.5 truncate max-w-[180px]">
                  {m.model}
                </p>
                <p className="text-[10px] text-white/45 mt-0.5">{m.provider}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-5 gap-0">
        {/* Pipeline stages */}
        <div className="lg:col-span-3 p-5 sm:p-6 border-b lg:border-b-0 lg:border-r border-white/10">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-white/50">
              Execution pipeline
            </p>
            {running && (
              <span className="text-xs font-mono text-cyan-300 flex items-center gap-1.5">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
                {activeStage?.label ?? 'Processing…'}
              </span>
            )}
          </div>

          <div className="space-y-2">
            {stages.map((stage, idx) => {
              const Icon = STAGE_ICONS[stage.id] ?? Cpu
              return (
                <div
                  key={stage.id}
                  className={`rounded-xl border px-4 py-3 transition-all duration-300 ${statusStyles(stage.status)}`}
                >
                  <div className="flex gap-3">
                    <div className="flex flex-col items-center pt-1">
                      <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${statusDot(stage.status)}`} />
                      {idx < stages.length - 1 && (
                        <div className="w-px flex-1 min-h-[8px] mt-1 bg-white/10" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2">
                        <Icon className="h-4 w-4 text-cyan-400/80 shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-white leading-snug">{stage.label}</p>
                          <p className="text-[11px] text-white/45 mt-0.5 font-mono">{stage.engine}</p>
                          <p className="text-xs text-white/55 mt-1">{stage.subtitle}</p>
                        </div>
                      </div>
                      {stage.metrics.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {stage.metrics.map((m) => (
                            <span
                              key={m.label}
                              className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/30 border border-white/10 text-cyan-200/90"
                            >
                              {m.label}: {m.value}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Pathway summary */}
          <div className="mt-5 rounded-xl border border-white/10 bg-black/25 p-4 grid sm:grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-white/40">Pathways</p>
              <p className="font-semibold mt-0.5 text-gold-400">
                {categories.join(' · ') || '—'}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-white/40">Documents</p>
              <p className="font-semibold mt-0.5">{documentCount} in ingest queue</p>
            </div>
          </div>
        </div>

        {/* Terminal + actions */}
        <div className="lg:col-span-2 flex flex-col bg-black/40">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/10 bg-black/50">
            <Terminal className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-[10px] font-mono uppercase tracking-wider text-white/50">
              pipeline.log
            </span>
            {running && (
              <span className="ml-auto text-[10px] font-mono text-cyan-400">
                {completedCount}/{stages.length}
              </span>
            )}
          </div>
          <div className="flex-1 min-h-[220px] max-h-[320px] overflow-y-auto p-3 font-mono text-[11px] leading-relaxed text-emerald-300/90">
            {terminalLines.length === 0 ? (
              <p className="text-white/30">
                // Awaiting run — stages execute sequentially with live telemetry
              </p>
            ) : (
              terminalLines.map((line, i) => (
                <div key={i} className="whitespace-pre-wrap break-all opacity-90 hover:opacity-100">
                  {line}
                </div>
              ))
            )}
          </div>

          <div className="p-4 border-t border-white/10 space-y-3">
            {!llmReady && (
              <p className="text-xs text-amber-300/90 rounded-lg border border-amber-500/30 bg-amber-950/40 px-3 py-2">
                Configure VITE_GEMINI_API_KEY and/or VITE_GROQ_API_KEY to enable LLM stages.
              </p>
            )}

            {(error || state.analysisMeta?.error) && !analysisComplete && (
              <p className="text-xs text-red-300 rounded-lg border border-red-500/40 bg-red-950/50 px-3 py-2">
                {error ?? state.analysisMeta?.error}
              </p>
            )}

            {analysisComplete && (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/40 px-3 py-2 text-xs text-emerald-200">
                <strong>Analysis committed.</strong> {state.parsedAchievements.length} achievements ·{' '}
                {state.gaps.length} gaps · {state.roadmap.length} build actions
                {state.profileInsights.length > 0 &&
                  ` · ${state.profileInsights.length} strategy rows`}
                .
              </div>
            )}

            {!analysisComplete ? (
              <Button
                variant="primary"
                size="lg"
                className="w-full justify-center bg-linear-to-r from-cyan-600 to-navy-700 hover:from-cyan-500 hover:to-navy-600 border-0"
                onClick={handleRun}
                disabled={running || documentCount === 0 || categories.length === 0}
              >
                {running ? (
                  <>
                    <Activity className="h-5 w-5 animate-pulse" />
                    Executing pipeline…
                  </>
                ) : (
                  <>
                    <Play className="h-5 w-5" />
                    Run full scientific analysis
                  </>
                )}
              </Button>
            ) : (
              <p className="text-center text-xs text-white/50">
                Re-run from upload or change pathways to invalidate cache.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
