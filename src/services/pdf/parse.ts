import * as pdfjsLib from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.js?url'
import type { ParagraphUnit, ParsedDocumentCache } from '../../domain/types'
import { createPreview, fingerprintText, splitSentences, standardizeText } from '../../utils/textNormalizer'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

export const PARSER_VERSION = '2026-03-20-v3'

interface TextItemLike {
  str: string
  hasEOL?: boolean
  transform: number[]
}

function isTextItem(item: unknown): boolean {
  return Boolean(item && typeof item === 'object' && 'str' in item && 'transform' in item)
}

function groupPageItemsIntoLines(items: TextItemLike[]): string[] {
  const normalizedItems = [...items]
    .filter(item => item.str.trim().length > 0)
    .sort((left, right) => {
      const yDelta = right.transform[5] - left.transform[5]
      if (Math.abs(yDelta) > 2) {
        return yDelta
      }
      return left.transform[4] - right.transform[4]
    })

  const lines: Array<{ y: number; text: string[] }> = []

  for (const item of normalizedItems) {
    const y = item.transform[5]
    const previousLine = lines[lines.length - 1]
    if (!previousLine || Math.abs(previousLine.y - y) > 3) {
      lines.push({
        y,
        text: [item.str]
      })
      continue
    }

    previousLine.text.push(item.str)
  }

  return lines
    .map(line => line.text.join(' ').replace(/\s{2,}/g, ' ').trim())
    .filter(line => line.length > 0)
}

function groupLinesIntoParagraphs(lines: string[]): string[] {
  const paragraphs: string[] = []
  let buffer: string[] = []

  const flush = () => {
    const paragraphText = standardizeText(buffer.join(' '))
    if (paragraphText) {
      paragraphs.push(paragraphText)
    }
    buffer = []
  }

  for (const line of lines) {
    const isNoise = /^\d+$/.test(line.trim())
    if (isNoise) {
      flush()
      continue
    }

    buffer.push(line)
    if (/[.!?:"\u201d\u2019]$/.test(line)) {
      flush()
    }
  }

  flush()
  return paragraphs
}

function createParagraphUnits(pageIndex: number, startingOrder: number, paragraphTexts: string[]): ParagraphUnit[] {
  return paragraphTexts.map((text, index) => {
    const order = startingOrder + index
    const id = `p-${String(order + 1).padStart(4, '0')}`
    const textHash = fingerprintText(text)
    return {
      id,
      anchorKey: `pg${pageIndex + 1}-p${index + 1}-${textHash.slice(0, 6)}`,
      order,
      pageIndex,
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
    const pageParagraphs = groupLinesIntoParagraphs(lines)
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
