import { defineStore } from 'pinia'
import type { HighlightRecord, TagRecord } from '../domain/types'
import { getAnnotationBundle, saveAnnotationBundle } from '../services/storage'

export const HIGHLIGHT_COLOR_OPTIONS = ['#f3e7a0', '#cfe5ff', '#d9f4d7', '#f8d6df'] as const

const DEFAULT_HIGHLIGHT_COLOR = HIGHLIGHT_COLOR_OPTIONS[0]
const DEFAULT_TAG_COLOR = '#dbeafe'

function normalizeHighlightColor(color?: string | null): string {
  if (!color) {
    return DEFAULT_HIGHLIGHT_COLOR
  }

  return HIGHLIGHT_COLOR_OPTIONS.includes(color as (typeof HIGHLIGHT_COLOR_OPTIONS)[number])
    ? color
    : DEFAULT_HIGHLIGHT_COLOR
}

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`
}

export const useHighlightStore = defineStore('highlight', {
  state: () => ({
    documentId: null as string | null,
    highlights: [] as HighlightRecord[],
    tags: [] as TagRecord[]
  }),
  getters: {
    paragraphHighlightCount: state =>
      state.highlights.filter(highlight => highlight.targetType === 'paragraph').length,
    sentenceHighlightCount: state =>
      state.highlights.filter(highlight => highlight.targetType === 'sentence').length
  },
  actions: {
    async loadForDocument(docId: string) {
      const bundle = await getAnnotationBundle(docId)
      this.documentId = docId
      this.highlights = bundle.highlights.map(highlight => ({
        ...highlight,
        color: normalizeHighlightColor(highlight.color)
      }))
      this.tags = bundle.tags
    },
    async persist() {
      if (!this.documentId) {
        return
      }
      await saveAnnotationBundle({
        documentId: this.documentId,
        highlights: this.highlights,
        tags: this.tags,
        updatedAt: Date.now()
      })
    },
    findHighlight(targetId: string) {
      return this.highlights.find(highlight => highlight.targetId === targetId) ?? null
    },
    toggleParagraphHighlight(documentId: string, paragraphId: string, textSnapshot: string, color: string = DEFAULT_HIGHLIGHT_COLOR) {
      const existing = this.findHighlight(paragraphId)
      if (existing) {
        this.removeHighlight(documentId, existing.id)
        return null
      }

      const highlight: HighlightRecord = {
        id: createId('hl'),
        documentId,
        paragraphId,
        targetId: paragraphId,
        targetType: 'paragraph',
        color: normalizeHighlightColor(color),
        textSnapshot,
        createdAt: Date.now()
      }
      this.highlights.push(highlight)
      void this.persist()
      return highlight
    },
    toggleSentenceHighlight(
      documentId: string,
      paragraphId: string,
      sentenceId: string,
      textSnapshot: string,
      color: string = DEFAULT_HIGHLIGHT_COLOR
    ) {
      const existing = this.findHighlight(sentenceId)
      if (existing) {
        this.removeHighlight(documentId, existing.id)
        return null
      }

      const highlight: HighlightRecord = {
        id: createId('hl'),
        documentId,
        paragraphId,
        targetId: sentenceId,
        targetType: 'sentence',
        color: normalizeHighlightColor(color),
        textSnapshot,
        createdAt: Date.now()
      }
      this.highlights.push(highlight)
      void this.persist()
      return highlight
    },
    ensureParagraphHighlight(documentId: string, paragraphId: string, textSnapshot: string, color: string = DEFAULT_HIGHLIGHT_COLOR) {
      const existing = this.findHighlight(paragraphId)
      if (existing) {
        return existing
      }

      return this.toggleParagraphHighlight(documentId, paragraphId, textSnapshot, color)
    },
    ensureSentenceHighlight(
      documentId: string,
      paragraphId: string,
      sentenceId: string,
      textSnapshot: string,
      color: string = DEFAULT_HIGHLIGHT_COLOR
    ) {
      const existing = this.findHighlight(sentenceId)
      if (existing) {
        return existing
      }
      return this.toggleSentenceHighlight(documentId, paragraphId, sentenceId, textSnapshot, color)
    },
    setHighlightColor(documentId: string, highlightId: string, color: string) {
      const normalizedColor = normalizeHighlightColor(color)
      this.highlights = this.highlights.map(highlight =>
        highlight.id === highlightId
          ? {
              ...highlight,
              color: normalizedColor
            }
          : highlight
      )
      this.documentId = documentId
      void this.persist()
    },
    removeHighlight(documentId: string, highlightId: string) {
      this.highlights = this.highlights.filter(highlight => highlight.id !== highlightId)
      this.tags = this.tags.map(tag => ({
        ...tag,
        highlightIds: tag.highlightIds.filter(id => id !== highlightId)
      }))
      this.documentId = documentId
      void this.persist()
    },
    ensureTag(documentId: string, tagName: string) {
      const normalizedName = tagName.trim()
      if (!normalizedName) {
        return null
      }

      let tag = this.tags.find(existing => existing.name.toLowerCase() === normalizedName.toLowerCase()) ?? null
      if (!tag) {
        tag = {
          id: createId('tag'),
          documentId,
          name: normalizedName,
          color: DEFAULT_TAG_COLOR,
          highlightIds: [],
          createdAt: Date.now()
        }
        this.tags.push(tag)
      }

      this.documentId = documentId
      return tag
    },
    addTag(documentId: string, tagName: string, highlightId: string) {
      const tag = this.ensureTag(documentId, tagName)
      if (!tag) {
        return null
      }

      if (!tag.highlightIds.includes(highlightId)) {
        tag.highlightIds.push(highlightId)
      }
      void this.persist()
      return tag
    },
    attachTagToHighlight(documentId: string, highlightId: string, tagId: string) {
      const tag = this.tags.find(item => item.id === tagId)
      if (!tag) {
        return
      }

      if (!tag.highlightIds.includes(highlightId)) {
        tag.highlightIds.push(highlightId)
        this.documentId = documentId
        void this.persist()
      }
    },
    detachTagFromHighlight(documentId: string, highlightId: string, tagId: string) {
      const tag = this.tags.find(item => item.id === tagId)
      if (!tag) {
        return
      }

      if (tag.highlightIds.includes(highlightId)) {
        tag.highlightIds = tag.highlightIds.filter(id => id !== highlightId)
        this.documentId = documentId
        void this.persist()
      }
    },
    toggleTagForHighlight(documentId: string, highlightId: string, tagId: string) {
      const tag = this.tags.find(item => item.id === tagId)
      if (!tag) {
        return
      }

      if (tag.highlightIds.includes(highlightId)) {
        this.detachTagFromHighlight(documentId, highlightId, tagId)
        return
      }

      this.attachTagToHighlight(documentId, highlightId, tagId)
    },
    tagsForHighlight(highlightId: string) {
      return this.tags.filter(tag => tag.highlightIds.includes(highlightId))
    },
    tagsForParagraph(paragraphId: string) {
      const paragraphHighlightIds = this.highlights
        .filter(highlight => highlight.paragraphId === paragraphId)
        .map(highlight => highlight.id)

      return this.tags.filter(tag =>
        tag.highlightIds.some(highlightId => paragraphHighlightIds.includes(highlightId))
      )
    },
    highlightsForParagraph(paragraphId: string) {
      return this.highlights.filter(highlight => highlight.paragraphId === paragraphId)
    }
  }
})
