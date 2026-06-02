import type { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

export const PDF_COLORS = {
  navy: [15, 23, 42] as [number, number, number],
  navyLight: [30, 41, 59] as [number, number, number],
  gold: [180, 140, 50] as [number, number, number],
  goldLight: [212, 175, 55] as [number, number, number],
  slate: [71, 85, 105] as [number, number, number],
  slateLight: [148, 163, 184] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  panel: [248, 250, 252] as [number, number, number],
  panelBorder: [226, 232, 240] as [number, number, number],
  accent: [14, 116, 144] as [number, number, number],
}

const PAGE_MARGIN = 14
const PAGE_WIDTH = 210
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN * 2
const PAGE_BOTTOM = 282

export function slugifyFilename(name: string): string {
  return name.replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').slice(0, 48) || 'candidate'
}

export function triggerPdfDownload(doc: jsPDF, filename: string): void {
  doc.save(filename)
}

export function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > PAGE_BOTTOM) {
    doc.addPage()
    return PAGE_MARGIN + 8
  }
  return y
}

export function getContentWidth(): number {
  return CONTENT_WIDTH
}

export function getPageMargin(): number {
  return PAGE_MARGIN
}

export function getPageWidth(): number {
  return PAGE_WIDTH
}

export function addPageHeader(doc: jsPDF, brand: string, subtitle: string): number {
  doc.setFillColor(...PDF_COLORS.navy)
  doc.rect(0, 0, PAGE_WIDTH, 22, 'F')
  doc.setTextColor(...PDF_COLORS.goldLight)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text(brand.toUpperCase(), PAGE_MARGIN, 10)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(220, 220, 220)
  doc.text(subtitle, PAGE_MARGIN, 16)
  doc.setTextColor(0, 0, 0)
  return 28
}

export function writeSectionTitle(doc: jsPDF, y: number, text: string): number {
  y = ensureSpace(doc, y, 16)
  doc.setFillColor(...PDF_COLORS.goldLight)
  doc.rect(PAGE_MARGIN, y - 5, 3, 10, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(...PDF_COLORS.navy)
  doc.text(text, PAGE_MARGIN + 6, y + 2)
  doc.setDrawColor(...PDF_COLORS.panelBorder)
  doc.setLineWidth(0.2)
  doc.line(PAGE_MARGIN, y + 6, PAGE_WIDTH - PAGE_MARGIN, y + 6)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(0, 0, 0)
  return y + 10
}

export function writeSubsectionTitle(doc: jsPDF, y: number, text: string): number {
  y = ensureSpace(doc, y, 12)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...PDF_COLORS.navyLight)
  doc.text(text, PAGE_MARGIN, y)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(0, 0, 0)
  return y + 6
}

export function writeLegalLead(doc: jsPDF, y: number, text: string): number {
  y = ensureSpace(doc, y, 14)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...PDF_COLORS.navy)
  const lines = doc.splitTextToSize(text, CONTENT_WIDTH) as string[]
  for (const line of lines) {
    y = ensureSpace(doc, y, 6)
    doc.text(line, PAGE_MARGIN, y)
    y += 5.2
  }
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(0, 0, 0)
  return y + 3
}

export function writeParagraphs(doc: jsPDF, y: number, paragraphs: string[]): number {
  doc.setFontSize(9)
  doc.setTextColor(...PDF_COLORS.slate)
  for (const p of paragraphs) {
    if (!p.trim()) continue
    const lines = doc.splitTextToSize(p, CONTENT_WIDTH) as string[]
    for (const line of lines) {
      y = ensureSpace(doc, y, 6)
      doc.text(line, PAGE_MARGIN, y)
      y += 4.8
    }
    y += 2
  }
  doc.setTextColor(0, 0, 0)
  return y + 3
}

export function writeBullets(doc: jsPDF, y: number, items: string[], indent = 0): number {
  doc.setFontSize(9)
  doc.setTextColor(...PDF_COLORS.slate)
  const x = PAGE_MARGIN + indent
  const width = CONTENT_WIDTH - indent
  for (const item of items) {
    if (!item.trim()) continue
    const lines = doc.splitTextToSize(`• ${item}`, width) as string[]
    for (const line of lines) {
      y = ensureSpace(doc, y, 6)
      doc.text(line, x, y)
      y += 4.8
    }
  }
  doc.setTextColor(0, 0, 0)
  return y + 4
}

export function writeHighlightBox(
  doc: jsPDF,
  y: number,
  title: string,
  body: string[],
): number {
  const padding = 4
  const textWidth = CONTENT_WIDTH - padding * 2 - 4
  doc.setFontSize(9)
  const bodyLines: string[][] = []
  for (const p of body) {
    if (!p.trim()) continue
    bodyLines.push(doc.splitTextToSize(p, textWidth) as string[])
  }
  const contentH = 10 + bodyLines.reduce((h, lines) => h + lines.length * 4.8 + 2, 0) + 4

  if (y + contentH > PAGE_BOTTOM) {
    y = writeSubsectionTitle(doc, y, title)
    return writeParagraphs(doc, y, body)
  }

  y = ensureSpace(doc, y, contentH + 4)
  doc.setFillColor(...PDF_COLORS.panel)
  doc.setDrawColor(...PDF_COLORS.panelBorder)
  doc.setLineWidth(0.3)
  doc.roundedRect(PAGE_MARGIN, y - 2, CONTENT_WIDTH, contentH, 2, 2, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...PDF_COLORS.navy)
  doc.text(title, PAGE_MARGIN + padding, y + 4)
  let cy = y + 10
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...PDF_COLORS.slate)
  for (const lines of bodyLines) {
    for (const line of lines) {
      doc.text(line, PAGE_MARGIN + padding, cy)
      cy += 4.8
    }
    cy += 1
  }
  doc.setTextColor(0, 0, 0)
  return y + contentH + 4
}

export interface ParsingStageRow {
  stage: string
  engine: string
  status: 'complete' | 'partial' | 'pending'
  metrics: { label: string; value: string }[]
  notes: string[]
}

export function writeParsingPhaseBlock(doc: jsPDF, y: number, stages: ParsingStageRow[]): number {
  y = writeSubsectionTitle(
    doc,
    y,
    'Deep profile parsing pipeline — structured extraction telemetry',
  )
  y = writeParagraphs(doc, y, [
    'The following stages mirror the in-application parsing engine: deterministic segmentation, entity resolution, and domain inference prior to LLM assessment. Status reflects uploaded materials only — not petition approval.',
  ])

  for (const stage of stages) {
    y = ensureSpace(doc, y, 28)
    doc.setFillColor(...PDF_COLORS.navy)
    doc.rect(PAGE_MARGIN, y - 1, CONTENT_WIDTH, 7, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...PDF_COLORS.goldLight)
    doc.text(stage.stage.toUpperCase(), PAGE_MARGIN + 2, y + 4)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(220, 220, 220)
    doc.text(stage.engine, PAGE_WIDTH - PAGE_MARGIN - 2, y + 4, { align: 'right' })
    y += 9

    const statusLabel =
      stage.status === 'complete' ? 'COMPLETE' : stage.status === 'partial' ? 'PARTIAL' : 'PENDING'
    doc.setFontSize(8)
    doc.setTextColor(...PDF_COLORS.accent)
    doc.text(`Status: ${statusLabel}`, PAGE_MARGIN + 2, y)
    y += 5

    if (stage.metrics.length > 0) {
      const body = stage.metrics.map((m) => [m.label, m.value])
      autoTable(doc, {
        startY: y,
        margin: { left: PAGE_MARGIN + 2, right: PAGE_MARGIN },
        tableWidth: CONTENT_WIDTH - 4,
        head: [['Metric', 'Value']],
        body,
        styles: { fontSize: 7, cellPadding: 1.8 },
        headStyles: { fillColor: PDF_COLORS.navyLight, textColor: PDF_COLORS.white, fontStyle: 'bold' },
        theme: 'plain',
      })
      y = getFinalTableY(doc, y + 20)
    }

    if (stage.notes.length > 0) {
      doc.setFontSize(7)
      doc.setTextColor(...PDF_COLORS.slateLight)
      for (const note of stage.notes.slice(0, 4)) {
        y = ensureSpace(doc, y, 5)
        const lines = doc.splitTextToSize(`› ${note}`, CONTENT_WIDTH - 6) as string[]
        for (const line of lines) {
          doc.text(line, PAGE_MARGIN + 4, y)
          y += 4.2
        }
      }
      y += 2
    }
    y += 3
  }
  doc.setTextColor(0, 0, 0)
  return y
}

export interface CoverPageOptions {
  title: string
  subtitle: string
  candidateName: string
  pathways: string
  readinessScore: number
  documentId: string
  generatedAt: string
}

export function addCoverPage(doc: jsPDF, opts: CoverPageOptions): void {
  doc.setFillColor(...PDF_COLORS.navy)
  doc.rect(0, 0, PAGE_WIDTH, 297, 'F')

  doc.setDrawColor(...PDF_COLORS.gold)
  doc.setLineWidth(1)
  doc.line(PAGE_MARGIN, 38, PAGE_WIDTH - PAGE_MARGIN, 38)

  doc.setTextColor(...PDF_COLORS.gold)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('CONFIDENTIAL — ATTORNEY–CLIENT WORK PRODUCT STYLE', PAGE_MARGIN, 48)

  doc.setTextColor(...PDF_COLORS.white)
  doc.setFontSize(20)
  doc.text(opts.title, PAGE_MARGIN, 68)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  const subLines = doc.splitTextToSize(opts.subtitle, CONTENT_WIDTH) as string[]
  doc.text(subLines, PAGE_MARGIN, 78)

  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text(opts.candidateName, PAGE_MARGIN, 96)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  let y = 108
  for (const line of [
    `Visa pathway(s): ${opts.pathways}`,
    `Petition readiness index: ${opts.readinessScore}% (pre-build rubric)`,
    `Generated: ${new Date(opts.generatedAt).toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' })}`,
    'Prepared for qualified immigration counsel and consulting review',
  ]) {
    doc.text(line, PAGE_MARGIN, y)
    y += 6.5
  }

  doc.setFontSize(8)
  doc.setTextColor(200, 200, 200)
  const disclaimer =
    'This dossier is generated for professional immigration consulting and legal review. It does not constitute legal advice, a guarantee of visa approval, or USCIS representation. All factual claims require independent verification under applicable INA and 8 CFR standards.'
  doc.text(doc.splitTextToSize(disclaimer, CONTENT_WIDTH) as string[], PAGE_MARGIN, 248)

  doc.addPage()
}

export function addPartDivider(doc: jsPDF, part: string, title: string): number {
  doc.setFillColor(...PDF_COLORS.navy)
  doc.rect(0, 0, PAGE_WIDTH, 48, 'F')
  doc.setTextColor(...PDF_COLORS.gold)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text(part.toUpperCase(), PAGE_MARGIN, 18)
  doc.setTextColor(...PDF_COLORS.white)
  doc.setFontSize(15)
  doc.text(title, PAGE_MARGIN, 32)
  doc.setDrawColor(...PDF_COLORS.gold)
  doc.setLineWidth(0.5)
  doc.line(PAGE_MARGIN, 42, PAGE_WIDTH - PAGE_MARGIN, 42)
  doc.setTextColor(0, 0, 0)
  return 56
}

export function addTableOfContents(doc: jsPDF, entries: { label: string; page: number }[]): number {
  let y = PAGE_MARGIN + 4
  y = writeSectionTitle(doc, y, 'Table of Contents')
  doc.setFontSize(9)
  for (const entry of entries) {
    y = ensureSpace(doc, y, 6)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...PDF_COLORS.slate)
    doc.text(entry.label, PAGE_MARGIN, y)
    doc.setFont('helvetica', 'bold')
    doc.text(entry.page > 0 ? String(entry.page) : '—', PAGE_WIDTH - PAGE_MARGIN - 4, y, {
      align: 'right',
    })
    y += 5.5
  }
  doc.setTextColor(0, 0, 0)
  doc.addPage()
  return PAGE_MARGIN + 8
}

export function applyDocumentFooters(doc: jsPDF, footerLine: string): void {
  const total = doc.getNumberOfPages()
  for (let i = 1; i <= total; i++) {
    doc.setPage(i)
    if (i === 1) continue
    doc.setDrawColor(...PDF_COLORS.panelBorder)
    doc.setLineWidth(0.2)
    doc.line(PAGE_MARGIN, 286, PAGE_WIDTH - PAGE_MARGIN, 286)
    doc.setFontSize(7)
    doc.setTextColor(...PDF_COLORS.slateLight)
    doc.setFont('helvetica', 'normal')
    const fl = doc.splitTextToSize(footerLine, CONTENT_WIDTH - 40) as string[]
    doc.text(fl[0] ?? footerLine, PAGE_MARGIN, 290)
    doc.setFont('helvetica', 'bold')
    doc.text(`Page ${i} of ${total}`, PAGE_WIDTH - PAGE_MARGIN, 290, { align: 'right' })
    doc.setTextColor(0, 0, 0)
  }
}

export function getFinalTableY(doc: jsPDF, fallback: number): number {
  const t = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
  return t?.finalY != null ? t.finalY + 8 : fallback
}

export function tableStartY(doc: jsPDF, y: number): number {
  if (y > 232) {
    doc.addPage()
    return PAGE_MARGIN + 8
  }
  return y
}

export const PDF_TABLE_HEAD: {
  fillColor: [number, number, number]
  textColor: [number, number, number]
  fontStyle: 'bold' | 'normal' | 'italic' | 'bolditalic'
} = {
  fillColor: PDF_COLORS.navy,
  textColor: PDF_COLORS.white,
  fontStyle: 'bold',
}

export const PDF_TABLE_HEAD_GOLD: typeof PDF_TABLE_HEAD = {
  fillColor: PDF_COLORS.navyLight,
  textColor: PDF_COLORS.white,
  fontStyle: 'bold',
}
