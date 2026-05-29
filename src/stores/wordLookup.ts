import { defineStore } from 'pinia'
import type { TranslationErrorCode, WordLookupRecord } from '../domain/types'
import { getWordLookupBundle, saveWordLookupRecord } from '../services/storage'
import {
  isTranslationProviderConfigured,
  lookupWordInContext,
  TranslationServiceError
} from '../services/translation'

const WORD_LOOKUP_TARGET_LANGUAGE = 'zh-CN'

function createLookupId(word: string, sentenceId: string): string {
  return `${word.toLowerCase()}:${sentenceId}`
}

export const useWordLookupStore = defineStore('wordLookup', {
  state: () => ({
    documentId: null as string | null,
    lookups: {} as Record<string, WordLookupRecord>
  }),
  actions: {
    async loadForDocument(documentId: string) {
      this.documentId = documentId
      this.lookups = await getWordLookupBundle(documentId)
    },

    getLookup(word: string, sentenceId: string): WordLookupRecord | null {
      return this.lookups[createLookupId(word, sentenceId)] ?? null
    },

    async lookup(word: string, sentenceId: string, contextSentence: string, force = false): Promise<WordLookupRecord | null> {
      if (!this.documentId) {
        return null
      }

      const id = createLookupId(word, sentenceId)
      const existing = this.lookups[id]

      if (!force && existing?.status === 'loaded') {
        return existing
      }
      if (!force && existing?.status === 'loading') {
        return existing
      }

      if (!isTranslationProviderConfigured()) {
        return null
      }

      const pendingRecord: WordLookupRecord = {
        id,
        word,
        contextSentenceId: sentenceId,
        contextSentenceText: contextSentence,
        definition: '',
        status: 'loading',
        errorCode: null,
        errorMessage: null,
        updatedAt: Date.now()
      }
      this.lookups[id] = pendingRecord

      try {
        const result = await lookupWordInContext({
          word,
          contextSentence,
          requestId: `word-lookup:${id}`,
          targetLanguage: WORD_LOOKUP_TARGET_LANGUAGE
        })

        const loadedRecord: WordLookupRecord = {
          ...pendingRecord,
          definition: result.translated,
          status: 'loaded',
          updatedAt: Date.now()
        }
        this.lookups[id] = loadedRecord
        await saveWordLookupRecord(this.documentId, loadedRecord)
        return loadedRecord
      } catch (error) {
        const errorCode: TranslationErrorCode =
          error instanceof TranslationServiceError ? error.code : 'unknown'
        const errorMessage = error instanceof Error ? error.message : 'Word lookup failed.'

        const failedRecord: WordLookupRecord = {
          ...pendingRecord,
          status: 'failed',
          errorCode,
          errorMessage,
          updatedAt: Date.now()
        }
        this.lookups[id] = failedRecord
        await saveWordLookupRecord(this.documentId, failedRecord)
        return failedRecord
      }
    }
  }
})
