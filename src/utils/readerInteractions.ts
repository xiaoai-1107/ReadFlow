import { standardizeText } from './textNormalizer'

export interface InteractionFragment {
  id: string
  displayText: string
  text: string
  index: number
  count: number
  isWholeSentence: boolean
}

export interface InlineWordToken {
  id: string
  kind: 'word' | 'text'
  text: string
  normalized: string | null
}

const HARD_FRAGMENT_BREAKS = new Set([
  ',',
  ';',
  ':',
  '\uFF0C',
  '\uFF1B',
  '\uFF1A',
  '\u2014'
])

function shouldSplitForInteraction(text: string): boolean {
  const normalized = standardizeText(text)
  const wordCount = normalized.split(/\s+/).filter(Boolean).length
  const punctuationCount = Array.from(normalized).filter(char => HARD_FRAGMENT_BREAKS.has(char)).length

  return normalized.length > 120 || wordCount > 24 || punctuationCount >= 2
}

function normalizeFragmentText(fragmentText: string): string {
  return standardizeText(fragmentText).trim()
}

export function buildInteractionFragments(baseId: string, sentenceText: string): InteractionFragment[] {
  const rawText = sentenceText || ''
  if (!rawText.trim()) {
    return []
  }

  if (!shouldSplitForInteraction(rawText)) {
    return [
      {
        id: `${baseId}-f0`,
        displayText: rawText,
        text: normalizeFragmentText(rawText),
        index: 0,
        count: 1,
        isWholeSentence: true
      }
    ]
  }

  const fragments: Array<{ displayText: string; text: string }> = []
  let fragmentStart = 0

  for (let index = 0; index < rawText.length; index += 1) {
    const char = rawText[index]
    const currentLength = index - fragmentStart + 1
    const nextChar = rawText[index + 1] ?? ''

    const splitAtHardBreak =
      HARD_FRAGMENT_BREAKS.has(char) &&
      currentLength >= 18 &&
      (/\s/.test(nextChar) || nextChar === '' || nextChar === '"')

    const splitAtLongSoftBreak = char === ' ' && currentLength >= 72

    if (!splitAtHardBreak && !splitAtLongSoftBreak) {
      continue
    }

    const displayText = rawText.slice(fragmentStart, index + 1)
    const text = normalizeFragmentText(displayText)
    if (text) {
      fragments.push({ displayText, text })
    }
    fragmentStart = index + 1
  }

  const tailDisplayText = rawText.slice(fragmentStart)
  const tailText = normalizeFragmentText(tailDisplayText)
  if (tailText) {
    fragments.push({ displayText: tailDisplayText, text: tailText })
  }

  if (fragments.length <= 1) {
    return [
      {
        id: `${baseId}-f0`,
        displayText: rawText,
        text: normalizeFragmentText(rawText),
        index: 0,
        count: 1,
        isWholeSentence: true
      }
    ]
  }

  return fragments.map((fragment, index) => ({
    id: `${baseId}-f${index}`,
    displayText: fragment.displayText,
    text: fragment.text,
    index,
    count: fragments.length,
    isWholeSentence: false
  }))
}

export function buildSentenceTranslationSlices(sentenceText: string, translatedText: string): string[] {
  const translatedFragments = buildInteractionFragments('translation', translatedText)
  if (translatedFragments.length === 1) {
    return [standardizeText(translatedText)]
  }

  const sourceFragments = buildInteractionFragments('source', sentenceText)
  if (sourceFragments.length === translatedFragments.length) {
    return translatedFragments.map(fragment => fragment.text)
  }

  return [standardizeText(translatedText)]
}

export function splitTranslatedSentences(text: string): string[] {
  const normalized = standardizeText(text)
  if (!normalized) {
    return []
  }

  const parts: string[] = []
  let start = 0

  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index]
    if (!'.!?\u3002\uFF01\uFF1F'.includes(char)) {
      continue
    }

    const slice = normalized.slice(start, index + 1).trim()
    if (slice) {
      parts.push(slice)
    }
    start = index + 1
  }

  const tail = normalized.slice(start).trim()
  if (tail) {
    parts.push(tail)
  }

  return parts.length > 0 ? parts : [normalized]
}

export function tokenizeInlineWords(text: string): InlineWordToken[] {
  const tokens: InlineWordToken[] = []
  const regex = /([A-Za-z]+(?:['-][A-Za-z]+)*)/g
  let match: RegExpExecArray | null = null
  let lastIndex = 0

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({
        id: `text-${lastIndex}`,
        kind: 'text',
        text: text.slice(lastIndex, match.index),
        normalized: null
      })
    }

    tokens.push({
      id: `word-${match.index}`,
      kind: 'word',
      text: match[0],
      normalized: match[0].toLowerCase()
    })
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) {
    tokens.push({
      id: `text-${lastIndex}`,
      kind: 'text',
      text: text.slice(lastIndex),
      normalized: null
    })
  }

  return tokens
}
