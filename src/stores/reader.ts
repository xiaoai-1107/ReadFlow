import { defineStore } from 'pinia'
import type {
  AppDocumentMeta,
  ParagraphUnit,
  ParsedDocumentCache,
  ReaderMode,
  SentenceTranslationRecord,
  SentenceUnit,
  TranslationErrorCode,
  TranslationRecord,
  TranslationSource
} from '../domain/types'
import { parsePdfToDocument, PARSER_VERSION } from '../services/pdf/parse'
import {
  getDocumentFile,
  getDocumentMeta,
  getParsedDocument,
  getSentenceTranslationBundle,
  getTranslationBundle,
  markDocumentOpened,
  saveDocumentError,
  saveParsedDocument,
  saveSentenceTranslationRecord,
  saveTranslationRecord
} from '../services/storage'
import {
  getTranslationModelVersion,
  getTranslationProviderKey,
  isTranslationProviderConfigured,
  PARAGRAPH_TRANSLATION_PIPELINE_VERSION,
  SENTENCE_TRANSLATION_PIPELINE_VERSION,
  translateText,
  TranslationServiceError
} from '../services/translation'
import { useSessionStore } from './session'
import { appendReaderDebugSample, incrementReaderDebugCounter, pushReaderDebugEvent } from '../utils/debug'
import { standardizeText } from '../utils/textNormalizer'

const DEFAULT_TARGET_LANGUAGE = 'zh-CN'
const SESSION_PERSIST_DELAY_MS = 180

let persistSessionTimer: ReturnType<typeof window.setTimeout> | null = null

function clearPersistSessionTimer() {
  if (persistSessionTimer === null) {
    return
  }

  window.clearTimeout(persistSessionTimer)
  persistSessionTimer = null
}

interface SentenceContext {
  paragraph: ParagraphUnit
  sentence: SentenceUnit
}

function createParagraphTranslationId(documentId: string, paragraphId: string, targetLanguage = DEFAULT_TARGET_LANGUAGE): string {
  return `${documentId}:${paragraphId}:${targetLanguage}:paragraph`
}

function createSentenceTranslationId(
  documentId: string,
  sentenceId: string,
  targetLanguage: string,
  sourceTextHash: string
): string {
  return `${documentId}:${sentenceId}:${targetLanguage}:${sourceTextHash}:${SENTENCE_TRANSLATION_PIPELINE_VERSION}`
}

function inferTranslationSource(record: Partial<TranslationRecord | SentenceTranslationRecord>): TranslationSource {
  if (record.source) {
    return record.source
  }

  if (record.providerKey === 'glossary-fallback') {
    return 'fallback'
  }

  if (record.providerKey === 'pending' || record.providerKey === 'unconfigured') {
    return 'none'
  }

  return record.status === 'translated' ? 'provider' : 'none'
}

function normalizeParagraphTranslationRecord(record: TranslationRecord, paragraph?: ParagraphUnit): TranslationRecord {
  const nextRecord: TranslationRecord = {
    ...record,
    source: inferTranslationSource(record),
    sourceText: standardizeText(record.sourceText ?? paragraph?.text ?? ''),
    sourceTextHash: record.sourceTextHash ?? paragraph?.textHash ?? '',
    targetLanguage: record.targetLanguage ?? DEFAULT_TARGET_LANGUAGE,
    providerKey: record.providerKey ?? getTranslationProviderKey(),
    modelVersion: record.modelVersion ?? getTranslationModelVersion(),
    pipelineVersion: record.pipelineVersion ?? PARAGRAPH_TRANSLATION_PIPELINE_VERSION,
    errorCode: record.errorCode ?? null,
    errorMessage: record.errorMessage ?? null
  }

  if (nextRecord.status === 'translated' && nextRecord.source !== 'provider') {
    nextRecord.status = 'unavailable'
    nextRecord.errorCode = 'provider_not_configured'
    nextRecord.errorMessage = 'No live translation provider is configured.'
    nextRecord.translatedText = ''
  }

  return nextRecord
}

function normalizeSentenceTranslationRecord(record: SentenceTranslationRecord, context?: SentenceContext): SentenceTranslationRecord {
  const nextRecord: SentenceTranslationRecord = {
    ...record,
    source: inferTranslationSource(record),
    paragraphAnchorKey: record.paragraphAnchorKey ?? context?.paragraph.anchorKey ?? '',
    sentenceAnchorKey: record.sentenceAnchorKey ?? context?.sentence.anchorKey ?? '',
    sourceText: standardizeText(record.sourceText ?? context?.sentence.text ?? ''),
    sourceTextHash: record.sourceTextHash ?? context?.sentence.textHash ?? '',
    targetLanguage: record.targetLanguage ?? DEFAULT_TARGET_LANGUAGE,
    providerKey: record.providerKey ?? getTranslationProviderKey(),
    modelVersion: record.modelVersion ?? getTranslationModelVersion(),
    pipelineVersion: record.pipelineVersion ?? SENTENCE_TRANSLATION_PIPELINE_VERSION,
    errorCode: record.errorCode ?? null,
    errorMessage: record.errorMessage ?? null
  }

  if (nextRecord.status === 'translated' && nextRecord.source !== 'provider') {
    nextRecord.status = 'unavailable'
    nextRecord.errorCode = 'provider_not_configured'
    nextRecord.errorMessage = 'No live translation provider is configured.'
    nextRecord.translatedText = ''
  }

  return nextRecord
}

function isParagraphTranslationRecordCurrent(record: TranslationRecord, paragraph: ParagraphUnit): boolean {
  const normalizedSourceText = standardizeText(record.sourceText ?? '')

  return (
    normalizedSourceText.length > 0 &&
    normalizedSourceText === paragraph.text &&
    record.sourceTextHash === paragraph.textHash &&
    record.targetLanguage === DEFAULT_TARGET_LANGUAGE &&
    record.pipelineVersion === PARAGRAPH_TRANSLATION_PIPELINE_VERSION
  )
}

function isSentenceTranslationRecordCurrent(record: SentenceTranslationRecord, context: SentenceContext): boolean {
  const normalizedSourceText = standardizeText(record.sourceText ?? '')

  return (
    record.sentenceId === context.sentence.id &&
    normalizedSourceText.length > 0 &&
    normalizedSourceText === context.sentence.text &&
    record.sourceTextHash === context.sentence.textHash &&
    record.targetLanguage === DEFAULT_TARGET_LANGUAGE &&
    record.pipelineVersion === SENTENCE_TRANSLATION_PIPELINE_VERSION
  )
}

function createFailedParagraphRecord(baseRecord: TranslationRecord, errorCode: TranslationErrorCode, errorMessage: string): TranslationRecord {
  return {
    ...baseRecord,
    providerKey: baseRecord.providerKey === 'pending' ? getTranslationProviderKey() : baseRecord.providerKey,
    source: 'none',
    translatedText: '',
    status: 'failed',
    updatedAt: Date.now(),
    errorCode,
    errorMessage
  }
}

function createFailedSentenceRecord(
  baseRecord: SentenceTranslationRecord,
  errorCode: TranslationErrorCode,
  errorMessage: string
): SentenceTranslationRecord {
  return {
    ...baseRecord,
    providerKey: baseRecord.providerKey === 'pending' ? getTranslationProviderKey() : baseRecord.providerKey,
    source: 'none',
    translatedText: '',
    status: 'failed',
    updatedAt: Date.now(),
    errorCode,
    errorMessage
  }
}

function isParsedCacheCurrent(parsed: ParsedDocumentCache): boolean {
  if (parsed.parserVersion !== PARSER_VERSION) {
    return false
  }

  return parsed.paragraphs.every(paragraph =>
    paragraph.sentences.every(sentence =>
      typeof sentence.index === 'number' &&
      typeof sentence.anchorKey === 'string' &&
      sentence.anchorKey.length > 0 &&
      typeof sentence.textHash === 'string' &&
      sentence.textHash.length > 0
    )
  )
}

export const useReaderStore = defineStore('reader', {
  state: () => ({
    document: null as AppDocumentMeta | null,
    paragraphs: [] as ParagraphUnit[],
    translations: {} as Record<string, TranslationRecord>,
    sentenceTranslations: {} as Record<string, SentenceTranslationRecord>,
    loading: false,
    error: '',
    mode: 'original' as ReaderMode,
    currentParagraphId: null as string | null,
    restoreTargetParagraphNumber: null as number | null,
    translationProviderConfigured: isTranslationProviderConfigured()
  }),
  getters: {
    paragraphsById(state): Map<string, ParagraphUnit> {
      const map = new Map<string, ParagraphUnit>()
      for (const p of state.paragraphs) {
        map.set(p.id, p)
      }
      return map
    },
    currentParagraph(state): ParagraphUnit | null {
      if (!state.currentParagraphId) {
        return state.paragraphs[0] ?? null
      }
      return state.paragraphs.find(p => p.id === state.currentParagraphId) ?? state.paragraphs[0] ?? null
    },
    translatedCount(state): number {
      return Object.values(state.translations).filter(record => record.status === 'translated' && record.source === 'provider').length
    },
    translationCoverage(state): number {
      if (state.paragraphs.length === 0) {
        return 0
      }
      return Math.round((Object.values(state.translations).filter(record => record.status === 'translated' && record.source === 'provider').length / state.paragraphs.length) * 100)
    },
    isReadyForOffline(state): boolean {
      return Boolean(state.document?.parseCachedAt)
    }
  },
  actions: {
    reset() {
      clearPersistSessionTimer()
      this.document = null
      this.paragraphs = []
      this.translations = {}
      this.sentenceTranslations = {}
      this.loading = false
      this.error = ''
      this.mode = 'original'
      this.currentParagraphId = null
      this.restoreTargetParagraphNumber = null
      this.translationProviderConfigured = isTranslationProviderConfigured()
    },
    findSentenceContext(sentenceId: string): SentenceContext | null {
      for (const paragraph of this.paragraphs) {
        const sentence = paragraph.sentences.find(item => item.id === sentenceId)
        if (sentence) {
          return { paragraph, sentence }
        }
      }

      return null
    },
    sentenceTranslationFor(sentenceId: string): SentenceTranslationRecord | null {
      const context = this.findSentenceContext(sentenceId)
      if (!context) {
        return null
      }

      const record = this.sentenceTranslations[sentenceId] ?? null
      if (!record) {
        return null
      }

      const normalizedRecord = normalizeSentenceTranslationRecord(record, context)
      return isSentenceTranslationRecordCurrent(normalizedRecord, context) ? normalizedRecord : null
    },
    async loadDocument(documentId: string) {
      this.reset()
      this.loading = true

      try {
        await markDocumentOpened(documentId)
        const meta = await getDocumentMeta(documentId)
        if (!meta) {
          throw new Error('This document was not found locally.')
        }

        this.document = meta
        const parsed = await this.ensureParsedDocument(documentId, meta.title)
        this.paragraphs = parsed.paragraphs

        const translationBundle = await getTranslationBundle(documentId)
        this.translations = Object.fromEntries(
          parsed.paragraphs
            .map(paragraph => {
              const record = translationBundle[paragraph.id]
              if (!record) {
                return null
              }

              const normalizedRecord = normalizeParagraphTranslationRecord(record, paragraph)
              return isParagraphTranslationRecordCurrent(normalizedRecord, paragraph)
                ? [paragraph.id, normalizedRecord]
                : null
            })
            .filter((entry): entry is [string, TranslationRecord] => Boolean(entry))
        )

        const sentenceTranslationBundle = await getSentenceTranslationBundle(documentId)
        this.sentenceTranslations = Object.fromEntries(
          Object.values(sentenceTranslationBundle)
            .map(record => {
              const context = this.findSentenceContext(record.sentenceId)
              if (!context) {
                return null
              }

              const normalizedRecord = normalizeSentenceTranslationRecord(record, context)
              return isSentenceTranslationRecordCurrent(normalizedRecord, context)
                ? [record.sentenceId, normalizedRecord]
                : null
            })
            .filter((entry): entry is [string, SentenceTranslationRecord] => Boolean(entry))
        )

        const sessionStore = useSessionStore()
        const session = await sessionStore.loadSession(documentId)
        if (session) {
          this.mode = session.mode
          this.currentParagraphId = session.lastReadParagraphId ?? parsed.paragraphs[0]?.id ?? null
          if (session.lastReadParagraphId) {
            const paragraphIndex = parsed.paragraphs.findIndex(paragraph => paragraph.id === session.lastReadParagraphId)
            if (paragraphIndex >= 0) {
              this.restoreTargetParagraphNumber = paragraphIndex + 1
            }
          }
        } else {
          this.currentParagraphId = parsed.paragraphs[0]?.id ?? null
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load this document.'
        this.error = message
        if (documentId) {
          await saveDocumentError(documentId, message)
        }
      } finally {
        this.loading = false
      }
    },
    async ensureParsedDocument(documentId: string, title: string): Promise<ParsedDocumentCache> {
      const cached = await getParsedDocument(documentId)
      if (cached && isParsedCacheCurrent(cached)) {
        return cached
      }

      const file = await getDocumentFile(documentId)
      if (!file) {
        throw new Error('The local PDF file is missing, so the document cannot be parsed.')
      }

      const parsed = await parsePdfToDocument(documentId, title, file)
      await saveParsedDocument(parsed)
      this.document = await getDocumentMeta(documentId)
      return parsed
    },
    setMode(mode: ReaderMode) {
      if (this.mode === mode) {
        return
      }

      this.mode = mode
      pushReaderDebugEvent('reader-store:set-mode', { mode })
      this.scheduleSessionPersist()
    },
    async setCurrentParagraph(paragraphId: string) {
      if (this.currentParagraphId === paragraphId) {
        return
      }

      this.currentParagraphId = paragraphId
      incrementReaderDebugCounter('setCurrentParagraphCalls')
      this.scheduleSessionPersist()
    },
    scheduleSessionPersist() {
      if (!this.document) {
        return
      }

      clearPersistSessionTimer()
      incrementReaderDebugCounter('scheduleSessionPersistCalls')
      persistSessionTimer = window.setTimeout(() => {
        persistSessionTimer = null
        void this.persistSession()
      }, SESSION_PERSIST_DELAY_MS)
    },
    async persistSession() {
      if (!this.document) {
        return
      }

      const sessionStore = useSessionStore()
      incrementReaderDebugCounter('persistSessionCalls')
      await sessionStore.saveSession(this.document.id, this.currentParagraphId, this.mode)
    },
    translationForParagraph(paragraphId: string): TranslationRecord | null {
      const paragraph = this.paragraphsById.get(paragraphId)
      if (!paragraph) {
        return null
      }

      const record = this.translations[paragraphId] ?? null
      if (!record) {
        return null
      }

      const normalizedRecord = normalizeParagraphTranslationRecord(record, paragraph)
      return isParagraphTranslationRecordCurrent(normalizedRecord, paragraph) ? normalizedRecord : null
    },
    async ensureTranslation(paragraphId: string, force = false) {
      if (!this.document) {
        return null
      }

      const paragraph = this.paragraphsById.get(paragraphId)
      if (!paragraph) {
        return null
      }

      this.translationProviderConfigured = isTranslationProviderConfigured()
      incrementReaderDebugCounter('ensureTranslationCalls')
      appendReaderDebugSample('ensureTranslation', {
        paragraphId,
        force,
        providerConfigured: this.translationProviderConfigured
      })

      const existing = this.translationForParagraph(paragraphId)
      if (!force && existing?.status === 'translated' && existing.source === 'provider') {
        return existing
      }
      if (!force && existing?.status === 'translating') {
        return existing
      }
      if (!this.translationProviderConfigured) {
        pushReaderDebugEvent('translation:skip-unconfigured', { paragraphId })
        return existing
      }

      const pendingRecord: TranslationRecord = {
        id: createParagraphTranslationId(this.document.id, paragraph.id),
        documentId: this.document.id,
        paragraphId: paragraph.id,
        anchorKey: paragraph.anchorKey,
        sourceText: paragraph.text,
        sourceTextHash: paragraph.textHash,
        targetLanguage: DEFAULT_TARGET_LANGUAGE,
        providerKey: 'pending',
        modelVersion: getTranslationModelVersion(),
        pipelineVersion: PARAGRAPH_TRANSLATION_PIPELINE_VERSION,
        source: 'none',
        translatedText: '',
        status: 'translating',
        updatedAt: Date.now(),
        errorCode: null,
        errorMessage: null
      }

      this.translations[paragraphId] = pendingRecord

      try {
        const result = await translateText({
          text: paragraph.text,
          requestId: paragraph.anchorKey,
          targetLanguage: DEFAULT_TARGET_LANGUAGE
        })

        const nextRecord: TranslationRecord = {
          ...pendingRecord,
          translatedText: result.translated,
          providerKey: result.provider,
          source: result.source,
          status: 'translated',
          updatedAt: Date.now(),
          errorCode: null,
          errorMessage: null
        }

        this.translations[paragraphId] = nextRecord
        await saveTranslationRecord(nextRecord)
        return nextRecord
      } catch (error) {
        if (error instanceof TranslationServiceError && error.code === 'provider_not_configured') {
          this.translationProviderConfigured = false
          pushReaderDebugEvent('translation:provider-not-configured', { paragraphId })
          return null
        }

        const errorCode = error instanceof TranslationServiceError ? error.code : 'unknown'
        const errorMessage = error instanceof Error ? error.message : 'Live translation failed.'
        const failedRecord = createFailedParagraphRecord(pendingRecord, errorCode, errorMessage)

        this.translations[paragraphId] = failedRecord
        await saveTranslationRecord(failedRecord)
        return failedRecord
      }
    },
    async ensureSentenceTranslation(sentenceId: string, force = false) {
      if (!this.document) {
        return null
      }

      const context = this.findSentenceContext(sentenceId)
      if (!context) {
        return null
      }

      this.translationProviderConfigured = isTranslationProviderConfigured()
      incrementReaderDebugCounter('ensureSentenceTranslationCalls')
      appendReaderDebugSample('ensureSentenceTranslation', {
        sentenceId,
        force,
        providerConfigured: this.translationProviderConfigured
      })

      const existing = this.sentenceTranslationFor(sentenceId)
      if (!force && existing?.status === 'translated' && existing.source === 'provider') {
        return existing
      }
      if (!force && existing?.status === 'translating') {
        return existing
      }
      if (!this.translationProviderConfigured) {
        pushReaderDebugEvent('sentence-translation:skip-unconfigured', { sentenceId })
        return existing
      }

      const pendingRecord: SentenceTranslationRecord = {
        id: createSentenceTranslationId(this.document.id, context.sentence.id, DEFAULT_TARGET_LANGUAGE, context.sentence.textHash),
        documentId: this.document.id,
        paragraphId: context.paragraph.id,
        paragraphAnchorKey: context.paragraph.anchorKey,
        sentenceId: context.sentence.id,
        sentenceAnchorKey: context.sentence.anchorKey,
        sourceText: context.sentence.text,
        sourceTextHash: context.sentence.textHash,
        targetLanguage: DEFAULT_TARGET_LANGUAGE,
        providerKey: 'pending',
        modelVersion: getTranslationModelVersion(),
        pipelineVersion: SENTENCE_TRANSLATION_PIPELINE_VERSION,
        source: 'none',
        translatedText: '',
        status: 'translating',
        updatedAt: Date.now(),
        errorCode: null,
        errorMessage: null
      }

      this.sentenceTranslations[sentenceId] = pendingRecord

      try {
        const result = await translateText({
          text: context.sentence.text,
          requestId: context.sentence.anchorKey,
          targetLanguage: DEFAULT_TARGET_LANGUAGE
        })

        const nextRecord: SentenceTranslationRecord = {
          ...pendingRecord,
          translatedText: result.translated,
          providerKey: result.provider,
          source: result.source,
          status: 'translated',
          updatedAt: Date.now(),
          errorCode: null,
          errorMessage: null
        }

        this.sentenceTranslations[sentenceId] = nextRecord
        await saveSentenceTranslationRecord(nextRecord)
        return nextRecord
      } catch (error) {
        if (error instanceof TranslationServiceError && error.code === 'provider_not_configured') {
          this.translationProviderConfigured = false
          pushReaderDebugEvent('sentence-translation:provider-not-configured', { sentenceId })
          return null
        }

        const errorCode = error instanceof TranslationServiceError ? error.code : 'unknown'
        const errorMessage = error instanceof Error ? error.message : 'Live translation failed.'
        const failedRecord = createFailedSentenceRecord(pendingRecord, errorCode, errorMessage)

        this.sentenceTranslations[sentenceId] = failedRecord
        await saveSentenceTranslationRecord(failedRecord)
        return failedRecord
      }
    },
    async ensureTranslationsAround(paragraphId: string) {
      if (this.mode !== 'translation') {
        pushReaderDebugEvent('translation-around:skip-non-translation-mode', { paragraphId, mode: this.mode })
        return
      }

      if (!this.translationProviderConfigured) {
        pushReaderDebugEvent('translation-around:skip-unconfigured', { paragraphId })
        return
      }

      incrementReaderDebugCounter('ensureTranslationsAroundCalls')
      const index = this.paragraphs.findIndex(paragraph => paragraph.id === paragraphId)
      if (index < 0) {
        return
      }

      const targets = [index - 1, index, index + 1]
        .map(position => this.paragraphs[position])
        .filter((paragraph): paragraph is ParagraphUnit => Boolean(paragraph))

      for (const paragraph of targets) {
        await this.ensureTranslation(paragraph.id)
      }
    }
  }
})
