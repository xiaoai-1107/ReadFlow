export type ReaderMode = 'original' | 'translation'

export type UiLanguage = 'zh-CN' | 'en'

export type TranslationStatus = 'idle' | 'translating' | 'translated' | 'failed' | 'unavailable'

export type TranslationSource = 'provider' | 'fallback' | 'mock' | 'none'

export type ParagraphLayoutRole = 'body' | 'title' | 'heading' | 'toc' | 'list' | 'copyright'

export type TranslationErrorCode =
  | 'provider_not_configured'
  | 'offline'
  | 'request_failed'
  | 'empty_result'
  | 'unknown'
  | null

export interface SentenceUnit {
  id: string
  index: number
  anchorKey: string
  textHash: string
  text: string
  startIndex: number
  endIndex: number
}

export interface ParagraphUnit {
  id: string
  anchorKey: string
  order: number
  pageIndex: number
  layoutRole?: ParagraphLayoutRole
  text: string
  textHash: string
  sentences: SentenceUnit[]
  preview: string
}

export interface ParsedDocumentCache {
  documentId: string
  title: string
  pageCount: number
  paragraphs: ParagraphUnit[]
  cachedAt: number
  parserVersion: string
}

export interface AppDocumentMeta {
  id: string
  title: string
  createdAt: number
  lastOpenedAt: number
  lastReadAt: number | null
  pageCount: number
  paragraphCount: number
  coverSnippet: string
  parseCachedAt: number | null
  status: 'imported' | 'parsed' | 'error'
  lastError: string | null
}

export interface TranslationRecord {
  id: string
  documentId: string
  paragraphId: string
  anchorKey: string
  sourceText: string
  sourceTextHash: string
  targetLanguage: string
  providerKey: string
  modelVersion: string
  pipelineVersion: string
  source: TranslationSource
  translatedText: string
  status: TranslationStatus
  updatedAt: number
  errorCode: TranslationErrorCode
  errorMessage: string | null
}

export interface SentenceTranslationRecord {
  id: string
  documentId: string
  paragraphId: string
  paragraphAnchorKey: string
  sentenceId: string
  sentenceAnchorKey: string
  sourceText: string
  sourceTextHash: string
  targetLanguage: string
  providerKey: string
  modelVersion: string
  pipelineVersion: string
  source: TranslationSource
  translatedText: string
  status: TranslationStatus
  updatedAt: number
  errorCode: TranslationErrorCode
  errorMessage: string | null
}

export interface HighlightRecord {
  id: string
  documentId: string
  paragraphId: string
  targetId: string
  targetType: 'paragraph' | 'sentence'
  color: string
  textSnapshot: string
  createdAt: number
}

export interface TagRecord {
  id: string
  documentId: string
  name: string
  color: string
  highlightIds: string[]
  createdAt: number
}

export interface AnnotationBundle {
  documentId: string
  highlights: HighlightRecord[]
  tags: TagRecord[]
  updatedAt: number
}

export interface ReaderSession {
  documentId: string
  lastReadParagraphId: string | null
  mode: ReaderMode
  lastUpdatedAt: number
}

export interface UiSettings {
  readerUiLanguage: UiLanguage
  updatedAt: number
}

export interface TranslationRequestInput {
  text: string
  requestId: string
  targetLanguage: string
}

export interface TranslationProviderResult {
  translated: string
  provider: string
  source: 'provider'
}

export type WordLookupStatus = 'idle' | 'loading' | 'loaded' | 'failed'

export interface WordLookupRecord {
  id: string
  word: string
  contextSentenceId: string
  contextSentenceText: string
  definition: string
  status: WordLookupStatus
  errorCode: TranslationErrorCode
  errorMessage: string | null
  updatedAt: number
}

export interface VocabRecord {
  id: string
  word: string
  definition: string
  exampleSentence: string
  documentId: string
  documentTitle: string
  paragraphId: string
  sentenceId: string
  createdAt: number
}

export interface VocabBundle {
  entries: VocabRecord[]
  updatedAt: number
}
