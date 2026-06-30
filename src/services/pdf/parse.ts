import * as pdfjsLib from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.js?url'
import type { ParagraphLayoutRole, ParagraphUnit, ParsedDocumentCache } from '../../domain/types'
import { createPreview, fingerprintText, splitSentences, standardizeText } from '../../utils/textNormalizer'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

export const PARSER_VERSION = '2026-06-30-book-v4'

interface TextItemLike {
  str: string
  hasEOL?: boolean
  transform: number[]
  width?: number
  height?: number
  fontName?: string
}

interface PageTextLine {
  text: string
  x: number
  y: number
  fontSize: number
  gapBefore: number
}

interface ParsedParagraphText {
  text: string
  layoutRole: ParagraphLayoutRole
}

interface LineStats {
  medianFontSize: number
  medianGap: number
}

function isTextItem(item: unknown): boolean {
  return Boolean(item && typeof item === 'object' && 'str' in item && 'transform' in item)
}

function fontSizeForItem(item: TextItemLike): number {
  const transform = item.transform
  return Math.max(Math.abs(transform[0] ?? 0), Math.abs(transform[3] ?? 0), item.height ?? 0, 8)
}

function median(values: number[], fallback: number): number {
  const sorted = values.filter(value => Number.isFinite(value) && value > 0).sort((left, right) => left - right)
  if (sorted.length === 0) {
    return fallback
  }

  return sorted[Math.floor(sorted.length / 2)]
}

function groupPageItemsIntoLines(items: TextItemLike[]): PageTextLine[] {
  const normalizedItems = [...items]
    .filter(item => item.str.trim().length > 0)
    .sort((left, right) => {
      const yDelta = right.transform[5] - left.transform[5]
      if (Math.abs(yDelta) > 2) {
        return yDelta
      }
      return left.transform[4] - right.transform[4]
    })

  const lines: Array<{ y: number; items: TextItemLike[] }> = []

  for (const item of normalizedItems) {
    const y = item.transform[5]
    const previousLine = lines[lines.length - 1]
    if (!previousLine || Math.abs(previousLine.y - y) > 3) {
      lines.push({
        y,
        items: [item]
      })
      continue
    }

    previousLine.items.push(item)
  }

  const pageLines = lines
    .map(line => {
      const orderedItems = [...line.items].sort((left, right) => left.transform[4] - right.transform[4])
      const text = orderedItems.map(item => item.str).join(' ').replace(/\s{2,}/g, ' ').trim()
      return {
        text,
        x: Math.min(...orderedItems.map(item => item.transform[4])),
        y: line.y,
        fontSize: Math.max(...orderedItems.map(fontSizeForItem)),
        gapBefore: 0
      }
    })
    .filter(line => line.text.length > 0)

  return pageLines.map((line, index) => ({
    ...line,
    gapBefore: index === 0 ? 0 : Math.abs(pageLines[index - 1].y - line.y)
  }))
}

function lineStats(lines: PageTextLine[]): LineStats {
  return {
    medianFontSize: median(lines.map(line => line.fontSize), 11),
    medianGap: median(lines.slice(1).map(line => line.gapBefore), 12)
  }
}

function joinBodyLines(lines: string[]): string {
  return normalizePdfParagraphText(
    lines.reduce((text, line) => {
      if (!text) {
        return line
      }

      if (text.endsWith('-')) {
        return `${text.slice(0, -1)}${line}`
      }

      return `${text} ${line}`
    }, '')
  )
}

function normalizePdfParagraphText(raw: string): string {
  return standardizeText(raw).replace(/([a-z0-9][.!?])(?=[A-Z])/g, '$1 ')
}

function isPageNumberLine(text: string, pageIndex: number): boolean {
  const value = text.trim()
  return /^\d+$/.test(value) || new RegExp(`^page\\s+${pageIndex + 1}$`, 'i').test(value)
}

function isListLine(text: string): boolean {
  return /^(\(?\d{1,3}[\).]|[A-Za-z][\).]|[•*–-])\s+/.test(text.trim())
}

function isTocLine(text: string): boolean {
  const value = text.trim()
  return /^(table of contents|contents)$/i.test(value) || /\.{3,}\s*\d+\s*$/.test(value)
}

function isCopyrightLine(text: string): boolean {
  return /(copyright|all rights reserved|isbn|publisher|published by|©)/i.test(text)
}

function isSentenceEnding(text: string): boolean {
  return /[.!?:"')\]\u201d\u2019]$/.test(text.trim())
}

function isTitleCaseLike(text: string): boolean {
  const words = text
    .replace(/[^\p{L}\p{N}\s'-]/gu, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (words.length === 0 || words.length > 14) {
    return false
  }

  const significantWords = words.filter(word => word.length > 2)
  if (significantWords.length === 0) {
    return false
  }

  const titleCaseWords = significantWords.filter(word => /^[A-Z0-9]/.test(word))
  return titleCaseWords.length / significantWords.length >= 0.68
}

function classifyLine(line: PageTextLine, lines: PageTextLine[], pageIndex: number, lineIndex: number, stats: LineStats): ParagraphLayoutRole {
  const text = line.text.trim()
  const wordCount = text.split(/\s+/).filter(Boolean).length

  if (isTocLine(text)) {
    return 'toc'
  }

  if (isCopyrightLine(text)) {
    return 'copyright'
  }

  if (isListLine(text)) {
    return 'list'
  }

  const fontRatio = line.fontSize / Math.max(stats.medianFontSize, 1)
  const topOfEarlyPage = pageIndex <= 1 && lineIndex <= 4
  const shortDisplayLine = text.length <= 96 && wordCount <= 14
  const hasHeadingShape = shortDisplayLine && !isSentenceEnding(text) && (fontRatio >= 1.14 || isTitleCaseLike(text))

  if (topOfEarlyPage && shortDisplayLine && (fontRatio >= 1.2 || (lineIndex <= 2 && !isSentenceEnding(text)))) {
    return 'title'
  }

  if (/^(chapter|part|section|appendix)\b/i.test(text) || hasHeadingShape) {
    return 'heading'
  }

  const previousLine = lines[lineIndex - 1]
  if (
    previousLine &&
    line.gapBefore > Math.max(stats.medianGap * 1.7, stats.medianFontSize * 1.45) &&
    shortDisplayLine &&
    !isSentenceEnding(text)
  ) {
    return 'heading'
  }

  return 'body'
}

function shouldStartNewBodyParagraph(line: PageTextLine, previousLine: PageTextLine | null, stats: LineStats): boolean {
  if (!previousLine) {
    return false
  }

  const largeGap = line.gapBefore > Math.max(stats.medianGap * 1.55, stats.medianFontSize * 1.35)
  const indentedStart = line.x - previousLine.x > 12 && isSentenceEnding(previousLine.text)
  const outdentedStart = previousLine.x - line.x > 18 && isSentenceEnding(previousLine.text)
  return largeGap || indentedStart || outdentedStart
}

function groupLinesIntoParagraphs(lines: PageTextLine[], pageIndex: number): ParsedParagraphText[] {
  const paragraphs: ParsedParagraphText[] = []
  const stats = lineStats(lines)
  let buffer: PageTextLine[] = []

  const flush = () => {
    const paragraphText = joinBodyLines(buffer.map(line => line.text))
    if (paragraphText) {
      paragraphs.push({
        text: paragraphText,
        layoutRole: 'body'
      })
    }
    buffer = []
  }

  lines.forEach((line, index) => {
    if (isPageNumberLine(line.text, pageIndex)) {
      flush()
      return
    }

    const layoutRole = classifyLine(line, lines, pageIndex, index, stats)
    if (layoutRole !== 'body') {
      flush()
      paragraphs.push({
        text: normalizePdfParagraphText(line.text),
        layoutRole
      })
      return
    }

    if (shouldStartNewBodyParagraph(line, buffer[buffer.length - 1] ?? null, stats)) {
      flush()
    }

    buffer.push(line)
  })

  flush()
  return paragraphs
}

function createParagraphUnits(pageIndex: number, startingOrder: number, paragraphTexts: ParsedParagraphText[]): ParagraphUnit[] {
  return paragraphTexts.map((paragraph, index) => {
    const order = startingOrder + index
    const id = `p-${String(order + 1).padStart(4, '0')}`
    const text = paragraph.text
    const textHash = fingerprintText(text)
    return {
      id,
      anchorKey: `pg${pageIndex + 1}-p${index + 1}-${textHash.slice(0, 6)}`,
      order,
      pageIndex,
      layoutRole: paragraph.layoutRole,
      text,
      textHash,
      sentences: splitSentences(id, text),
      preview: createPreview(text)
    }
  })
}

export async function parsePdfToDocument(documentId: string, title: string, file: File): Promise<ParsedDocumentCache> {
  const arrayBuffer = await file.arrayBuffer()
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer })
  const pdf = await loadingTask.promise
  const paragraphs: ParagraphUnit[] = []

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber)
    const textContent = await page.getTextContent()
    const items = textContent.items.filter(item => isTextItem(item)) as TextItemLike[]
    const lines = groupPageItemsIntoLines(items)
    const pageParagraphs = groupLinesIntoParagraphs(lines, pageNumber - 1)
    paragraphs.push(...createParagraphUnits(pageNumber - 1, paragraphs.length, pageParagraphs))
  }

  return {
    documentId,
    title,
    pageCount: pdf.numPages,
    paragraphs,
    cachedAt: Date.now(),
    parserVersion: PARSER_VERSION
  }
}
