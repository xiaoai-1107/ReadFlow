import { defineStore } from 'pinia'
import type { NoteRecord, ParagraphUnit, SentenceTranslationRecord, SentenceUnit } from '../domain/types'
import { deleteNoteRecord, getNoteBundle, saveNoteRecord } from '../services/storage'

interface CreateNoteInput {
  documentId: string
  documentTitle: string
  paragraph: ParagraphUnit
  sentence: SentenceUnit
  highlightId: string | null
  translation: SentenceTranslationRecord | null
}

interface UpdateNoteInput {
  translationText: string
  userNote: string
}

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`
}

function noteSortKey(note: NoteRecord): string {
  return [
    String(note.pageIndex).padStart(6, '0'),
    String(note.paragraphOrder).padStart(6, '0'),
    String(note.sentenceIndex).padStart(6, '0'),
    note.id
  ].join(':')
}

export const useNoteStore = defineStore('notes', {
  state: () => ({
    documentId: null as string | null,
    notes: [] as NoteRecord[]
  }),
  getters: {
    sortedNotes(state): NoteRecord[] {
      return [...state.notes].sort((left, right) => noteSortKey(left).localeCompare(noteSortKey(right)))
    }
  },
  actions: {
    async loadForDocument(documentId: string) {
      const bundle = await getNoteBundle(documentId)
      this.documentId = documentId
      this.notes = bundle.notes
    },
    noteForSentence(sentenceId: string): NoteRecord | null {
      return this.notes.find(note => note.sentenceId === sentenceId) ?? null
    },
    async createForSentence(input: CreateNoteInput): Promise<NoteRecord> {
      const existing = this.noteForSentence(input.sentence.id)
      if (existing) {
        return existing
      }

      const now = Date.now()
      const translationText =
        input.translation?.status === 'translated' && input.translation.source === 'provider'
          ? input.translation.translatedText
          : ''
      const note: NoteRecord = {
        id: createId('note'),
        documentId: input.documentId,
        documentTitle: input.documentTitle,
        paragraphId: input.paragraph.id,
        paragraphAnchorKey: input.paragraph.anchorKey,
        paragraphOrder: input.paragraph.order,
        sentenceId: input.sentence.id,
        sentenceAnchorKey: input.sentence.anchorKey,
        sentenceIndex: input.sentence.index,
        pageIndex: input.paragraph.pageIndex,
        highlightId: input.highlightId,
        originalText: input.sentence.text,
        originalTextHash: input.sentence.textHash,
        translationText,
        translationUpdatedAt: translationText ? now : null,
        userNote: '',
        createdAt: now,
        updatedAt: now
      }

      this.documentId = input.documentId
      this.notes.push(note)
      await saveNoteRecord(note)
      return note
    },
    async updateNote(noteId: string, input: UpdateNoteInput): Promise<NoteRecord | null> {
      const note = this.notes.find(item => item.id === noteId) ?? null
      if (!note) {
        return null
      }

      const now = Date.now()
      const nextNote: NoteRecord = {
        ...note,
        translationText: input.translationText,
        translationUpdatedAt: input.translationText !== note.translationText ? now : note.translationUpdatedAt,
        userNote: input.userNote,
        updatedAt: now
      }

      this.notes = this.notes.map(item => (item.id === noteId ? nextNote : item))
      await saveNoteRecord(nextNote)
      return nextNote
    },
    async deleteNote(noteId: string): Promise<NoteRecord | null> {
      const note = this.notes.find(item => item.id === noteId) ?? null
      if (!note) {
        return null
      }

      this.notes = this.notes.filter(item => item.id !== noteId)
      await deleteNoteRecord(note.documentId, noteId)
      return note
    }
  }
})
