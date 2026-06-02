import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { runDeepAnalysisPipeline } from '../lib/analysis-pipeline/run-pipeline'
import type { PipelineEvent } from '../lib/analysis-pipeline/types'
import { generateProfileInsights } from '../lib/llm/generate-profile-insights'
import { ensureProfileInsightRows } from '../lib/llm/ensure-profile-insights'
import {
  assertLlmProvider,
  bumpProfileRevision,
  clearDerivedOutputs,
  isMetaFreshForProfile,
  LlmOutputRequiredError,
} from '../lib/llm/llm-output-policy'
import { extractTextSnippet } from '../lib/profile-text'
import { deepExtractResume } from '../lib/resume-deep-extract'
import { generateBenchmarkReportAsync } from '../lib/benchmark-report'
import type { BenchmarkReport } from '../types/benchmark-report'
import { computeUnlocks, type StepUnlockState } from '../lib/assessment-flow'
import { computePetitionReadinessScore } from '../lib/readiness-score'
import { getDisplayCandidateName } from '../lib/candidate-display'
import type {
  AssessmentState,
  DocumentCategory,
  UploadedFile,
  VisaCategory,
} from '../types/assessment'

const STORAGE_KEY = 'veai_assessment'

const initialState: AssessmentState = {
  uploads: [],
  selectedCategories: [],
  analysisComplete: false,
  reportGenerated: false,
  parsedAchievements: [],
  evidenceItems: [],
  criterionResults: [],
  gaps: [],
  recommendations: [],
  riskFlags: [],
  techDomains: [],
  roadmap: [],
  quantifiedRoadmap: null,
  profileInsights: [],
  llmMeta: null,
  analysisMeta: null,
  structuredProfile: null,
  candidateNameOverride: null,
  benchmarkReport: null,
  profileRevision: 0,
}

function loadState(): AssessmentState {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AssessmentState>
      const merged: AssessmentState = {
        ...initialState,
        ...parsed,
        profileRevision: parsed.profileRevision ?? 0,
      }
      const staleAnalysis =
        merged.analysisComplete &&
        merged.analysisMeta &&
        !isMetaFreshForProfile(merged.analysisMeta, merged.profileRevision)
      const staleReport =
        merged.reportGenerated &&
        merged.llmMeta &&
        !isMetaFreshForProfile(merged.llmMeta, merged.profileRevision)
      const staleInsights =
        merged.profileInsights.length > 0 &&
        merged.llmMeta &&
        !isMetaFreshForProfile(merged.llmMeta, merged.profileRevision)
      if (staleAnalysis || staleReport || staleInsights) {
        return {
          ...merged,
          ...clearDerivedOutputs(),
          structuredProfile: merged.structuredProfile,
          uploads: merged.uploads,
          selectedCategories: merged.selectedCategories,
          candidateNameOverride: merged.candidateNameOverride,
        }
      }
      return merged
    }
  } catch {
    /* ignore */
  }
  return { ...initialState }
}

interface AssessmentContextValue {
  state: AssessmentState
  unlocks: StepUnlockState
  addUpload: (file: File, category: DocumentCategory) => void
  removeUpload: (id: string) => void
  setCategories: (categories: VisaCategory[]) => void
  toggleCategory: (category: VisaCategory) => void
  runAnalysis: (options?: {
    onPipelineEvent?: (event: PipelineEvent) => void
  }) => Promise<boolean>
  regenerateInsights: () => Promise<void>
  generateReport: () => Promise<void>
  resetAssessment: () => void
  setCandidateName: (name: string) => void
  refreshProfileExtraction: () => void
  readinessScore: number
  insightsLoading: boolean
  reportLoading: boolean
  benchmarkReport: BenchmarkReport | null
}

const AssessmentContext = createContext<AssessmentContextValue | null>(null)

export function AssessmentProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AssessmentState>(loadState)
  const [insightsLoading, setInsightsLoading] = useState(false)
  const [reportLoading, setReportLoading] = useState(false)

  const persist = useCallback((next: AssessmentState) => {
    setState(next)
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }, [])

  const unlocks = useMemo(
    () =>
      computeUnlocks({
        uploadsCount: state.uploads.length,
        categoriesCount: state.selectedCategories.length,
        analysisComplete: state.analysisComplete,
        reportGenerated: state.reportGenerated,
      }),
    [state],
  )

  const readinessScore = useMemo(() => computePetitionReadinessScore(state), [state])

  const addUpload = useCallback(
    async (file: File, category: DocumentCategory) => {
      const textSnippet = await extractTextSnippet(file)
      const entry: UploadedFile = {
        id: crypto.randomUUID(),
        name: file.name,
        category,
        size: file.size,
        uploadedAt: new Date().toISOString(),
        detectedInProfile: category === 'resume' || category === 'linkedin',
        textSnippet,
      }
      const uploads = [...state.uploads, entry]
      const structuredProfile = deepExtractResume(uploads)
      const profileRevision = bumpProfileRevision(state)
      persist({
        ...state,
        ...clearDerivedOutputs(),
        uploads,
        structuredProfile,
        profileRevision,
      })
    },
    [state, persist],
  )

  const removeUpload = useCallback(
    (id: string) => {
      const uploads = state.uploads.filter((u) => u.id !== id)
      const structuredProfile = uploads.length > 0 ? deepExtractResume(uploads) : null
      const profileRevision = bumpProfileRevision(state)
      persist({
        ...state,
        ...clearDerivedOutputs(),
        uploads,
        structuredProfile,
        profileRevision,
      })
    },
    [state, persist],
  )

  const refreshProfileExtraction = useCallback(() => {
    if (state.uploads.length === 0) return
    const structuredProfile = deepExtractResume(state.uploads)
    persist({ ...state, structuredProfile })
  }, [state, persist])

  const setCandidateName = useCallback(
    (name: string) => {
      const trimmed = name.trim()
      const base =
        state.structuredProfile ??
        (state.uploads.length > 0 ? deepExtractResume(state.uploads) : null)
      const displayName = trimmed || base?.candidateName || 'Candidate'
      const structuredProfile = base ? { ...base, candidateName: displayName } : null
      const benchmarkReport = state.benchmarkReport
        ? {
            ...state.benchmarkReport,
            candidateName: displayName,
            reportTitle: state.benchmarkReport.reportTitle.replace(
              /^EB1A Profile-Building Roadmap for .+$/,
              `EB1A Profile-Building Roadmap for ${displayName}`,
            ),
          }
        : null
      persist({
        ...state,
        candidateNameOverride: trimmed || null,
        structuredProfile,
        benchmarkReport,
      })
    },
    [state, persist],
  )

  const setCategories = useCallback(
    (categories: VisaCategory[]) => {
      persist({
        ...state,
        ...clearDerivedOutputs(),
        selectedCategories: categories,
        profileRevision: bumpProfileRevision(state),
      })
    },
    [state, persist],
  )

  const toggleCategory = useCallback(
    (category: VisaCategory) => {
      setState((prev) => {
        const exists = prev.selectedCategories.includes(category)
        const selectedCategories = exists
          ? prev.selectedCategories.filter((c) => c !== category)
          : [...prev.selectedCategories, category]
        const next: AssessmentState = {
          ...prev,
          ...clearDerivedOutputs(),
          selectedCategories,
          profileRevision: bumpProfileRevision(prev),
        }
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next))
        return next
      })
    },
    [],
  )

  const runLlmInsights = useCallback(
    async (base: AssessmentState) => {
      setInsightsLoading(true)
      try {
        const { rows, meta } = await generateProfileInsights(base)
        persist({ ...base, profileInsights: rows, llmMeta: meta })
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        const { rows } = ensureProfileInsightRows(base, [])
        persist({
          ...base,
          profileInsights: rows,
          llmMeta: {
            provider: base.analysisMeta?.provider === 'gemini' ? 'gemini' : 'groq',
            model: base.analysisMeta?.model,
            generatedAt: new Date().toISOString(),
            error: `Insights LLM failed (${message}); ${rows.length} rows synthesized from analysis.`,
            profileRevision: base.profileRevision,
          },
        })
      } finally {
        setInsightsLoading(false)
      }
    },
    [persist],
  )

  const runAnalysis = useCallback(
    async (options?: { onPipelineEvent?: (event: PipelineEvent) => void }) => {
      const { nextState } = await runDeepAnalysisPipeline({
        state,
        onEvent: (event) => options?.onPipelineEvent?.(event),
      })
      persist(nextState)
      return nextState.analysisComplete
    },
    [state, persist],
  )

  const regenerateInsights = useCallback(async () => {
    if (!state.analysisComplete) return
    if (!isMetaFreshForProfile(state.analysisMeta, state.profileRevision)) return
    await runLlmInsights(state)
  }, [state, runLlmInsights])

  const generateReport = useCallback(async () => {
    if (reportLoading) return
    setReportLoading(true)
    try {
      const structuredProfile =
        state.uploads.length > 0 ? deepExtractResume(state.uploads) : state.structuredProfile
      const freshState = structuredProfile ? { ...state, structuredProfile } : state
      const { report: rawReport, meta } = await generateBenchmarkReportAsync(freshState)
      const displayName = getDisplayCandidateName(freshState)
      const benchmarkReport = {
        ...rawReport,
        candidateName: displayName,
        reportTitle: rawReport.reportTitle.replace(
          /^EB1A Profile-Building Roadmap for .+$/,
          `EB1A Profile-Building Roadmap for ${displayName}`,
        ),
      }
      assertLlmProvider(meta, 'Benchmark report')
      if (!isMetaFreshForProfile(freshState.analysisMeta, freshState.profileRevision)) {
        throw new LlmOutputRequiredError(
          'Analysis is out of date — re-run full analysis after uploading or changing pathways.',
        )
      }

      persist({
        ...freshState,
        reportGenerated: true,
        benchmarkReport,
        llmMeta: meta,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      persist({
        ...state,
        llmMeta: {
          provider: 'none',
          generatedAt: new Date().toISOString(),
          error: message,
          profileRevision: state.profileRevision,
        },
      })
    } finally {
      setReportLoading(false)
    }
  }, [state, persist, reportLoading])

  const resetAssessment = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY)
    setState({ ...initialState })
  }, [])

  const value = useMemo(
    () => ({
      state,
      unlocks,
      addUpload,
      removeUpload,
      setCategories,
      toggleCategory,
      runAnalysis,
      regenerateInsights,
      generateReport,
      resetAssessment,
      setCandidateName,
      refreshProfileExtraction,
      readinessScore,
      insightsLoading,
      reportLoading,
      benchmarkReport: state.benchmarkReport,
    }),
    [
      state,
      unlocks,
      addUpload,
      removeUpload,
      setCategories,
      toggleCategory,
      runAnalysis,
      regenerateInsights,
      generateReport,
      resetAssessment,
      setCandidateName,
      refreshProfileExtraction,
      readinessScore,
      insightsLoading,
      reportLoading,
    ],
  )

  return <AssessmentContext.Provider value={value}>{children}</AssessmentContext.Provider>
}

export function useAssessment() {
  const ctx = useContext(AssessmentContext)
  if (!ctx) throw new Error('useAssessment must be used within AssessmentProvider')
  return ctx
}
