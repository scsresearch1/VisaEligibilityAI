import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { generateProfileInsights } from '../lib/llm/generate-profile-insights'
import { generatePersonalizedAnalysis } from '../lib/llm/generate-personalized-analysis'
import {
  assertLlmProvider,
  bumpProfileRevision,
  clearDerivedOutputs,
  isMetaFreshForProfile,
} from '../lib/llm/llm-output-policy'
import { isLlmConfigured } from '../lib/llm/generate-profile-insights'
import { LlmOutputRequiredError } from '../lib/llm/llm-output-policy'
import { extractTextSnippet } from '../lib/profile-text'
import { deepExtractResume } from '../lib/resume-deep-extract'
import { extractProfileSignals } from '../lib/benchmark-report/extract-profile'
import { deriveDemoMetricCounts, extractProfileMetricCounts } from '../lib/quantified-roadmap'
import { isLlmOutputRequired } from '../lib/llm/llm-output-policy'
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
  runAnalysis: () => Promise<void>
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
        persist({
          ...base,
          llmMeta: {
            provider: 'none',
            generatedAt: new Date().toISOString(),
            error: `Insights step failed: ${message}`,
            profileRevision: base.profileRevision,
          },
        })
      } finally {
        setInsightsLoading(false)
      }
    },
    [persist],
  )

  const runAnalysis = useCallback(async () => {
    const structuredProfile = deepExtractResume(state.uploads)
    const profile = extractProfileSignals(state.uploads)

    const base: AssessmentState = {
      ...state,
      ...clearDerivedOutputs(),
      structuredProfile,
      profileRevision: state.profileRevision,
      techDomains: profile.domains.length > 0 ? profile.domains : [],
    }

    if (!isLlmConfigured()) {
      persist({
        ...base,
        analysisMeta: {
          provider: 'none',
          generatedAt: new Date().toISOString(),
          error: 'Set VITE_GEMINI_API_KEY (AIza…) and/or VITE_GROQ_API_KEY (gsk_) in Netlify or .env',
          profileRevision: state.profileRevision,
        },
      })
      return
    }

    try {
      const personalized = await generatePersonalizedAnalysis(base)

      let counts = extractProfileMetricCounts({ ...base, ...personalized })
      const totalCounted = Object.values(counts).reduce((a, b) => a + b, 0)
      if (totalCounted < 4 && !isLlmOutputRequired()) {
        counts = deriveDemoMetricCounts(state.uploads.length, state.selectedCategories)
      }

      const afterLlm: AssessmentState = {
        ...base,
        parsedAchievements: personalized.parsedAchievements,
        evidenceItems: personalized.evidenceItems,
        criterionResults: personalized.criterionResults,
        gaps: personalized.gaps,
        recommendations: personalized.recommendations,
        riskFlags: personalized.riskFlags,
        roadmap: personalized.roadmapActions,
        techDomains: profile.domains,
        quantifiedRoadmap: { current: counts, computedAt: new Date().toISOString() },
        analysisComplete: true,
        analysisMeta: personalized.meta,
      }

      persist(afterLlm)
      await runLlmInsights(afterLlm)
      return
    } catch (err) {
      const message =
        err instanceof LlmOutputRequiredError
          ? err.message
          : err instanceof Error
            ? err.message
            : String(err)
      persist({
        ...base,
        analysisMeta: {
          provider: 'none',
          generatedAt: new Date().toISOString(),
          error: message,
          profileRevision: state.profileRevision,
        },
      })
    }
  }, [state, persist, runLlmInsights])

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
