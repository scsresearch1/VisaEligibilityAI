import { extractTextFromDocument } from './document-extract'

export async function extractTextSnippet(file: File): Promise<string | undefined> {
  try {
    return await extractTextFromDocument(file)
  } catch {
    return undefined
  }
}

import type { StructuredResumeProfile } from './resume-deep-extract'
import { formatStructuredProfileForLlm } from './resume-deep-extract'

export function buildProfileContextBlock(
  uploads: { name: string; category: string; textSnippet?: string }[],
  categories: string[],
  analysisSummary: string,
  structured?: StructuredResumeProfile | null,
  options?: { maxSnippetChars?: number; maxTotalChars?: number },
): string {
  const snippetLimit = options?.maxSnippetChars ?? 8000
  const docs = uploads
    .map((u, i) => {
      const raw = u.textSnippet ?? '(no text extracted)'
      const body =
        raw.length > snippetLimit ? `${raw.slice(0, snippetLimit)}\n...[document truncated]` : raw
      return `### Document ${i + 1}: ${u.name} (${u.category})\n${body}`
    })
    .join('\n\n')

  const structuredBlock = structured
    ? formatStructuredProfileForLlm(structured)
    : '(Structured extraction pending — upload a resume PDF or Word file, then re-scan)'

  let block = [
    `Visa pathways selected: ${categories.join(', ') || 'none'}`,
    '',
    structuredBlock,
    '',
    '--- Raw uploaded materials ---',
    docs || '(no documents)',
    '',
    '--- Criterion & gap analysis summary ---',
    analysisSummary,
  ].join('\n')

  const maxTotal = options?.maxTotalChars
  if (maxTotal && block.length > maxTotal) {
    block = `${block.slice(0, maxTotal)}\n\n...[profile context truncated for token limit]`
  }
  return block
}
