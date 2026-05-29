import { defineStore } from 'pinia'
import type { VocabBundle, VocabRecord } from '../domain/types'
import { getVocabBundle, saveVocabBundle } from '../services/storage'

function createId(): string {
  return `vocab-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`
}

export const useVocabStore = defineStore('vocab', {
  state: () => ({
    entries: [] as VocabRecord[]
  }),
  getters: {
    sortedEntries(state): VocabRecord[] {
      return [...state.entries].sort((a, b) => b.createdAt - a.createdAt)
    }
  },
  actions: {
    async load() {
      const bundle = await getVocabBundle()
      this.entries = bundle.entries
    },

    async persist() {
      const bundle: VocabBundle = { entries: this.entries, updatedAt: Date.now() }
      await saveVocabBundle(bundle)
    },

    isWordSaved(word: string, sentenceId: string): boolean {
      const normalizedWord = word.toLowerCase()
      return this.entries.some(
        e => e.word.toLowerCase() === normalizedWord && e.sentenceId === sentenceId
      )
    },

    async addEntry(entry: Omit<VocabRecord, 'id' | 'createdAt'>): Promise<VocabRecord> {
      const normalizedWord = entry.word.toLowerCase()
      const existing = this.entries.find(
        e => e.word.toLowerCase() === normalizedWord && e.sentenceId === entry.sentenceId
      )
      if (existing) {
        return existing
      }

      const record: VocabRecord = {
        ...entry,
        id: createId(),
        createdAt: Date.now()
      }
      this.entries.push(record)
      await this.persist()
      return record
    },

    async removeEntry(id: string) {
      this.entries = this.entries.filter(e => e.id !== id)
      await this.persist()
    }
  }
})
