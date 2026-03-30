import type { SentenceUnit } from '../domain/types'

const ABBREVIATIONS = new Set([
  'mr.',
  'mrs.',
  'ms.',
  'dr.',
  'prof.',
  'sr.',
  'jr.',
  'vs.',
  'etc.',
  'e.g.',
  'i.e.',
  'u.s.',
  'u.k.'
])

export function standardizeText(raw: string): string {
  return raw
    .replace(/\u00ad/g, '')
    .replace(/-\s*\n\s*/g, '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/[\u201c\u201d\u201e]/g, '"')
    .replace(/[\u2018\u2019\u201b]/g, "'")
    .trim()
}

export function fingerprintText(input: string): string {
  const text = standardizeText(input)
  let hash = 2166136261
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return Math.abs(hash >>> 0).toString(16).padStart(8, '0')
}

export function createPreview(text: string, maxLength = 88): string {
  const cleanText = standardizeText(text)
  if (cleanText.length <= maxLength) {
    return cleanText
  }
  return `${cleanText.slice(0, maxLength - 3).trimEnd()}...`
}

function shouldSplitAt(text: string, boundaryIndex: number): boolean {
  const candidate = text.slice(Math.max(0, boundaryIndex - 6), boundaryIndex + 1).toLowerCase()
  if (ABBREVIATIONS.has(candidate.trim())) {
    return false
  }

  const previousChar = text[boundaryIndex - 1]
  const nextChar = text[boundaryIndex + 1]

  if (previousChar && /\d/.test(previousChar) && nextChar && /\d/.test(nextChar)) {
    return false
  }

  return true
}

export function splitSentences(paragraphId: string, paragraphText: string): SentenceUnit[] {
  const text = standardizeText(paragraphText)
  if (!text) {
    return []
  }

  const boundaries: Array<{ start: number; end: number }> = []
  let sentenceStart = 0

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    if (!'.!?'.includes(char)) {
      continue
    }

    if (!shouldSplitAt(text, index)) {
      continue
    }

    const nextChar = text[index + 1]
    if (!nextChar || /\s|["')\]]/.test(nextChar)) {
      boundaries.push({ start: sentenceStart, end: index + 1 })
      sentenceStart = index + 1
    }
  }

  if (sentenceStart < text.length) {
    boundaries.push({ start: sentenceStart, end: text.length })
  }

  return boundaries
    .map(({ start, end }, position) => {
      const sentenceText = text.slice(start, end).trim()
      if (!sentenceText) {
        return null
      }

      const normalizedStart = text.indexOf(sentenceText, start)
      const textHash = fingerprintText(sentenceText)
      return {
        id: `${paragraphId}-s${position}`,
        index: position,
        anchorKey: `${paragraphId}-s${position + 1}-${textHash.slice(0, 6)}`,
        textHash,
        text: sentenceText,
        startIndex: normalizedStart,
        endIndex: normalizedStart + sentenceText.length
      }
    })
    .filter((sentence): sentence is SentenceUnit => sentence !== null)
}
