/** Parse LLM JSON; repair common truncation from token limits. */
export function parseJsonLenient(cleaned: string, label: string): unknown {
  try {
    return JSON.parse(cleaned)
  } catch {
    const suffixes = [
      '"}]}',
      '"]}',
      ']}',
      '}]',
      '"}',
      '}',
    ]
    for (const suffix of suffixes) {
      try {
        return JSON.parse(cleaned + suffix)
      } catch {
        /* try next */
      }
    }
    throw new Error(
      `${label}: invalid or truncated JSON from the model. Retry in a few seconds or add VITE_GEMINI_API_KEY (AIza…) for fallback.`,
    )
  }
}

export function extractJsonObject(text: string): string {
  let cleaned = text.trim()
  const fence = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fence) cleaned = fence[1].trim()
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start === -1) throw new Error('No JSON object in model response')
  return cleaned.slice(start, end + 1)
}
