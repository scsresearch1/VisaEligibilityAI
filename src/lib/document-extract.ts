import * as CFB from 'cfb'
import mammoth from 'mammoth'
import * as pdfjs from 'pdfjs-dist'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

const MAX_SNIPPET = 12000
const MAX_PDF_PAGES = 25

export const EXTRACTION_FAILED_PREFIX = '[Extraction failed:'
/** @deprecated Legacy session storage — treat same as failed extraction */
const LEGACY_BINARY_PREFIX = '[Binary document:'

export const RESUME_ACCEPT =
  '.pdf,.doc,.docx,.txt,.md,.rtf,.csv,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain'

pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker

export function isExtractionFailed(snippet?: string): boolean {
  const s = snippet ?? ''
  return s.startsWith(EXTRACTION_FAILED_PREFIX) || s.startsWith(LEGACY_BINARY_PREFIX)
}

function truncate(text: string): string {
  return text.length > MAX_SNIPPET ? `${text.slice(0, MAX_SNIPPET)}\n...[truncated]` : text
}

function normalizeWhitespace(text: string): string {
  return text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
}

function extractionFailedMessage(file: File, detail?: string): string {
  const hint = detail ? ` ${detail}` : ''
  return `${EXTRACTION_FAILED_PREFIX} ${file.name}, ${(file.size / 1024).toFixed(1)} KB — could not read text in browser.${hint} Try re-saving as .docx or .pdf, or upload a plain .txt copy.]`
}

function extension(file: File): string {
  const m = file.name.match(/\.([a-z0-9]+)$/i)
  return m ? m[1].toLowerCase() : ''
}

function isZipArchive(bytes: Uint8Array): boolean {
  return bytes.length > 3 && bytes[0] === 0x50 && bytes[1] === 0x4b
}

function isOleCompound(bytes: Uint8Array): boolean {
  return (
    bytes.length > 4 &&
    bytes[0] === 0xd0 &&
    bytes[1] === 0xcf &&
    bytes[2] === 0x11 &&
    bytes[3] === 0xe0
  )
}

/** Pull readable UTF-16LE ASCII runs from binary Word / OLE streams */
function extractUtf16LeAsciiRuns(bytes: Uint8Array, minRun = 4): string[] {
  const chunks: string[] = []
  let i = 0
  while (i < bytes.length - 1) {
    if (bytes[i] >= 0x20 && bytes[i] < 0x7f && bytes[i + 1] === 0) {
      let run = ''
      while (
        i < bytes.length - 1 &&
        bytes[i] >= 0x20 &&
        bytes[i] < 0x7f &&
        bytes[i + 1] === 0
      ) {
        run += String.fromCharCode(bytes[i])
        i += 2
      }
      if (run.length >= minRun) chunks.push(run)
    } else {
      i += 1
    }
  }
  return chunks
}

function streamToBytes(content: CFB.CFB$Blob | string | undefined): Uint8Array | null {
  if (!content) return null
  if (content instanceof Uint8Array) return content
  if (typeof content === 'string') return new TextEncoder().encode(content)
  return new Uint8Array(content as ArrayLike<number>)
}

/** Legacy Word 97–2003 (.doc) via OLE compound file (browser-safe) */
function extractLegacyDocBinary(arrayBuffer: ArrayBuffer): string {
  const bytes = new Uint8Array(arrayBuffer)
  if (!isOleCompound(bytes)) {
    throw new Error('Not a recognized Word .doc file')
  }

  const parts: string[] = []
  const cfb = CFB.read(bytes, { type: 'array' })

  for (const name of ['WordDocument', 'Contents', '1Table']) {
    const entry = CFB.find(cfb, name)
    const content = streamToBytes(entry?.content)
    if (content) parts.push(...extractUtf16LeAsciiRuns(content))
  }

  if (parts.length < 8) {
    parts.push(...extractUtf16LeAsciiRuns(bytes, 6))
  }

  const text = normalizeWhitespace([...new Set(parts)].join('\n'))
  if (text.length < 20) {
    throw new Error(
      'Could not extract readable text from .doc — open in Word and Save As .docx or PDF',
    )
  }
  return text
}

/** Preserve line breaks from PDF text positions (critical for name & section parsing). */
function pdfPageItemsToText(
  items: Array<{ str?: string; transform?: number[] } | { type: string }>,
): string {
  const rows: { y: number; x: number; str: string }[] = []
  for (const item of items) {
    if (!('str' in item) || !item.str?.trim() || !item.transform || item.transform.length < 6) {
      continue
    }
    const tr = item.transform
    rows.push({ y: tr[5]!, x: tr[4]!, str: item.str.trim() })
  }
  rows.sort((a, b) => b.y - a.y || a.x - b.x)

  const lines: string[] = []
  let currentY: number | null = null
  let currentParts: string[] = []
  const yTolerance = 5

  const flush = () => {
    const line = currentParts.join(' ').replace(/\s+/g, ' ').trim()
    if (line) lines.push(line)
    currentParts = []
  }

  for (const row of rows) {
    if (currentY !== null && Math.abs(row.y - currentY) > yTolerance) flush()
    currentParts.push(row.str)
    currentY = row.y
  }
  flush()

  return lines.join('\n')
}

async function extractPdfText(file: File): Promise<string> {
  const data = new Uint8Array(await file.arrayBuffer())
  const pdf = await pdfjs.getDocument({ data }).promise
  const pageCount = Math.min(pdf.numPages, MAX_PDF_PAGES)
  const parts: string[] = []

  for (let i = 1; i <= pageCount; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const pageText = pdfPageItemsToText(
      content.items as Array<{ str?: string; transform?: number[] } | { type: string }>,
    )
    if (pageText.trim()) parts.push(pageText)
  }

  if (pdf.numPages > MAX_PDF_PAGES) {
    parts.push(`\n...[first ${MAX_PDF_PAGES} of ${pdf.numPages} pages]`)
  }

  const text = normalizeWhitespace(parts.join('\n'))
  if (text.length < 20) {
    throw new Error('PDF contains little or no selectable text (scanned image PDFs are not supported)')
  }
  return text
}

async function extractDocxFromBuffer(arrayBuffer: ArrayBuffer): Promise<string> {
  const result = await mammoth.extractRawText({ arrayBuffer })
  const text = normalizeWhitespace(result.value)
  if (text.length < 20) {
    throw new Error('Word document appears empty')
  }
  return text
}

async function extractDocxText(file: File): Promise<string> {
  return extractDocxFromBuffer(await file.arrayBuffer())
}

async function extractDocText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const bytes = new Uint8Array(arrayBuffer)

  if (isZipArchive(bytes)) {
    return extractDocxFromBuffer(arrayBuffer)
  }

  return extractLegacyDocBinary(arrayBuffer)
}

async function extractPlainText(file: File): Promise<string> {
  const full = await file.text()
  return normalizeWhitespace(full)
}

export async function extractTextFromDocument(file: File): Promise<string> {
  const ext = extension(file)
  const mime = file.type.toLowerCase()

  try {
    if (ext === 'pdf' || mime === 'application/pdf') {
      return truncate(await extractPdfText(file))
    }
    if (ext === 'docx' || mime.includes('wordprocessingml')) {
      return truncate(await extractDocxText(file))
    }
    if (ext === 'doc' || mime === 'application/msword') {
      return truncate(await extractDocText(file))
    }

    const isText =
      mime.startsWith('text/') ||
      /\.(txt|md|csv|json|xml|html|htm|rtf)$/i.test(file.name) ||
      mime === 'application/json'

    if (isText) {
      const text = await extractPlainText(file)
      if (!text) throw new Error('File is empty')
      return truncate(text)
    }

    return extractionFailedMessage(
      file,
      'Unsupported format — use PDF, Word (.doc/.docx), or plain text.',
    )
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'Unknown error'
    return extractionFailedMessage(file, detail)
  }
}
