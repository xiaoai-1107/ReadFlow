import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useVocabStore } from '../../src/stores/vocab'

// Mock storage
vi.mock('../../src/services/storage', () => ({
  getVocabBundle: vi.fn().mockResolvedValue({ entries: [], updatedAt: Date.now() }),
  saveVocabBundle: vi.fn().mockResolvedValue(undefined)
}))

describe('vocab store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should start with empty entries', async () => {
    const store = useVocabStore()
    await store.load()
    expect(store.entries).toHaveLength(0)
  })

  it('should add a vocab entry', async () => {
    const store = useVocabStore()
    await store.load()

    const entry = await store.addEntry({
      word: 'ephemeral',
      definition: '短暂的；转瞬即逝的',
      exampleSentence: 'The joy was ephemeral.',
      documentId: 'doc-1',
      documentTitle: 'Test Doc',
      paragraphId: 'para-1',
      sentenceId: 'sent-1'
    })

    expect(entry.word).toBe('ephemeral')
    expect(store.entries).toHaveLength(1)
    expect(store.entries[0].id).toMatch(/^vocab-/)
    expect(store.entries[0].createdAt).toBeGreaterThan(0)
  })

  it('should deduplicate entries with same word and sentenceId', async () => {
    const store = useVocabStore()
    await store.load()

    await store.addEntry({
      word: 'ephemeral',
      definition: '短暂的',
      exampleSentence: 'The joy was ephemeral.',
      documentId: 'doc-1',
      documentTitle: 'Test Doc',
      paragraphId: 'para-1',
      sentenceId: 'sent-1'
    })

    await store.addEntry({
      word: 'ephemeral',
      definition: '另一个定义',
      exampleSentence: 'The joy was ephemeral.',
      documentId: 'doc-1',
      documentTitle: 'Test Doc',
      paragraphId: 'para-1',
      sentenceId: 'sent-1'
    })

    expect(store.entries).toHaveLength(1)
  })

  it('should allow same word in different sentences', async () => {
    const store = useVocabStore()
    await store.load()

    await store.addEntry({
      word: 'ephemeral',
      definition: '短暂的',
      exampleSentence: 'Sentence 1',
      documentId: 'doc-1',
      documentTitle: 'Test Doc',
      paragraphId: 'para-1',
      sentenceId: 'sent-1'
    })

    await store.addEntry({
      word: 'ephemeral',
      definition: '短暂的',
      exampleSentence: 'Sentence 2',
      documentId: 'doc-1',
      documentTitle: 'Test Doc',
      paragraphId: 'para-1',
      sentenceId: 'sent-2'
    })

    expect(store.entries).toHaveLength(2)
  })

  it('should remove an entry', async () => {
    const store = useVocabStore()
    await store.load()

    const entry = await store.addEntry({
      word: 'ephemeral',
      definition: '短暂的',
      exampleSentence: 'The joy was ephemeral.',
      documentId: 'doc-1',
      documentTitle: 'Test Doc',
      paragraphId: 'para-1',
      sentenceId: 'sent-1'
    })

    await store.removeEntry(entry.id)
    expect(store.entries).toHaveLength(0)
  })

  it('should detect if word is saved', async () => {
    const store = useVocabStore()
    await store.load()

    expect(store.isWordSaved('ephemeral', 'sent-1')).toBe(false)

    await store.addEntry({
      word: 'ephemeral',
      definition: '短暂的',
      exampleSentence: 'The joy was ephemeral.',
      documentId: 'doc-1',
      documentTitle: 'Test Doc',
      paragraphId: 'para-1',
      sentenceId: 'sent-1'
    })

    expect(store.isWordSaved('ephemeral', 'sent-1')).toBe(true)
    expect(store.isWordSaved('Ephemeral', 'sent-1')).toBe(true) // case-insensitive
    expect(store.isWordSaved('ephemeral', 'sent-2')).toBe(false)
  })

  it('should return sorted entries by most recent', async () => {
    const store = useVocabStore()
    await store.load()

    await store.addEntry({
      word: 'first',
      definition: 'First def',
      exampleSentence: 'First.',
      documentId: 'doc-1',
      documentTitle: 'Test Doc',
      paragraphId: 'para-1',
      sentenceId: 'sent-1'
    })

    // Ensure different timestamp
    await new Promise(resolve => setTimeout(resolve, 2))

    await store.addEntry({
      word: 'second',
      definition: 'Second def',
      exampleSentence: 'Second.',
      documentId: 'doc-1',
      documentTitle: 'Test Doc',
      paragraphId: 'para-1',
      sentenceId: 'sent-2'
    })

    expect(store.sortedEntries[0].word).toBe('second')
    expect(store.sortedEntries[1].word).toBe('first')
  })
})
