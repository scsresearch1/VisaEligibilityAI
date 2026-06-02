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
): string {
  const docs = uploads
    .map(
      (u, i) =>
        `### Document ${i + 1}: ${u.name} (${u.category})\n${u.textSnippet ?? '(no text extracted)'}`,
    )
    .join('\n\n')

  const structuredBlock = structured
    ? formatStructuredProfileForLlm(structured)
    : '(Structured extraction pending — upload a resume PDF or Word file, then re-scan)'

  return [
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
}
