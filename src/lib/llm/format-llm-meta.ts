/** User-facing messages for LLM run notes — avoid sanitizing raw provider names into gibberish. */

export type LlmMetaDisplay = {
  level: 'info' | 'warn'
  message: string
} | null

function normalizeInternalNote(note: string): string {
  return note
    .replace(/Gemini key missing\/invalid; used Groq for insights\.?/i, '')
    .replace(/Gemini key missing; used Groq for long task\.?/i, '')
    .replace(/Gemini key missing; used Groq \(split calls when needed\) for long task\.?/i, '')
    .replace(/Groq used split calls \(core assessment \+ roadmap\) to complete analysis within token limits\.?/i, '')
    .replace(/Gemini key missing\/invalid; used Groq for critical task\.?/i, '')
    .replace(/Gemini retry after sparse Groq insights\.?/i, '')
    .replace(/Groq failed.*used Gemini\.?/i, '')
    .trim()
}

export function formatLlmMetaForDisplay(
  error: string | undefined,
  context: 'insights' | 'analysis' | 'report' = 'insights',
): LlmMetaDisplay {
  if (!error?.trim()) return null

  const raw = error.trim()
  const lower = raw.toLowerCase()

  if (/gemini key missing|gemini unavailable|invalid.*aiza/i.test(lower)) {
    return {
      level: 'info',
      message:
        context === 'insights'
          ? 'Google AI (Gemini) is not configured. Insights were generated using the secondary model. Add VITE_GEMINI_API_KEY in Netlify for best quality.'
          : 'Google AI (Gemini) is not configured. Analysis used the secondary model. Add VITE_GEMINI_API_KEY for best quality.',
    }
  }

  if (/retried insights with compact prompt/i.test(lower)) {
    if (/synthesized from|partial/i.test(lower)) {
      return {
        level: 'info',
        message:
          'The first model response was sparse; we retried with a shorter prompt and filled remaining rows from your completed analysis.',
      }
    }
    return {
      level: 'info',
      message: 'Insights were completed using a compact prompt after the first response was sparse.',
    }
  }

  if (/strategy rows synthesized|synthesized from analysis|partial\)/i.test(lower)) {
    return {
      level: 'info',
      message:
        'Some strategy rows were built from your completed analysis and official pathway criteria (model output was partial).',
    }
  }

  if (/rate limit|429|tokens per minute/i.test(lower)) {
    return {
      level: 'warn',
      message:
        'The AI provider rate limit was reached. Wait about a minute and click Regenerate, or add a Google AI (Gemini) key to reduce load on Groq.',
    }
  }

  if (/truncated|max_tokens|json incomplete|split calls/i.test(lower)) {
    if (/split calls/i.test(lower)) {
      return {
        level: 'info',
        message:
          'Analysis completed using two smaller Groq requests to fit token limits. Add VITE_GEMINI_API_KEY for a single-call experience.',
      }
    }
    return {
      level: 'warn',
      message:
        'The model response was cut off. Add VITE_GEMINI_API_KEY (Google AI Studio) or shorten uploaded documents, then run analysis again.',
    }
  }

  if (/insights llm error|failed/i.test(lower)) {
    return {
      level: 'warn',
      message: normalizeInternalNote(raw) || 'Insights generation had an issue; rows below are from your analysis data.',
    }
  }

  const cleaned = normalizeInternalNote(raw)
  if (!cleaned) return null

  return { level: 'info', message: cleaned.slice(0, 280) }
}
