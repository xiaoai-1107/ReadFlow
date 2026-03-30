import { defineStore } from 'pinia'
import type { ReaderMode, ReaderSession } from '../domain/types'
import { getReaderSession, saveReaderSession } from '../services/storage'

export const useSessionStore = defineStore('session', {
  state: () => ({
    sessions: {} as Record<string, ReaderSession>
  }),
  actions: {
    async loadSession(docId: string): Promise<ReaderSession | null> {
      const session = await getReaderSession(docId)
      if (session) {
        this.sessions[docId] = session
      }
      return session
    },
    async saveSession(docId: string, paragraphId: string | null, mode: ReaderMode) {
      const session: ReaderSession = {
        documentId: docId,
        lastReadParagraphId: paragraphId,
        mode,
        lastUpdatedAt: Date.now()
      }
      this.sessions[docId] = session
      await saveReaderSession(session)
    }
  }
})
