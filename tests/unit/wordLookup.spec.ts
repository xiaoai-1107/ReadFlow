import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useWordLookupStore } from '../../src/stores/wordLookup'

// Mock storage
vi.mock('../../src/services/storage', () => ({
  getWordLookupBundle: vi.fn().mockResolvedValue({}),
  saveWordLookupRecord: vi.fn().mockResolvedValue(undefined)
}))

// Mock translation service
const mockLookupWordInContext = vi.fn()

vi.mock('../../src/services/translation', () => ({
  isTranslationProviderConfigured: vi.fn().mockReturnValue(true),
  lookupWordInContext: mockLookupWordInContext,
  TranslationServiceError: class TranslationServiceError extends Error {
    code: string
    constructor(code: string, message: string) {
      super(message)
      this.code = code
      this.name = 'TranslationServiceError'
    }
  }
}))

describe('wordLookup store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockLookupWordInContext.mockReset()
  })

  it('should load existing lookups for document', async () => {
    const { getWordLookupBundle } = await import('../../src/services/storage')
    vi.mocked(getWordLookupBundle).mockResolvedValueOnce({
      'ephemeral:sent-1': {
        id: 'ephemeral:sent-1',
        word: 'ephemeral',
        contextSentenceId: 'sent-1',
        contextSentenceText: 'The joy was ephemeral.',
        definition: '短暂的',
        status: 'loaded',
        errorCode: null,
        errorMessage: null,
        updatedAt: Date.now()
      }
    })

    const store = useWordLookupStore()
    await store.loadForDocument('doc-1')

    const result = store.getLookup('ephemeral', 'sent-1')
    expect(result).not.toBeNull()
    expect(result?.definition).toBe('短暂的')
  })

  it('should return null for unknown word', async () => {
    const store = useWordLookupStore()
    await store.loadForDocument('doc-1')

    expect(store.getLookup('unknown', 'sent-1')).toBeNull()
  })

  it('should look up a word successfully', async () => {
    mockLookupWordInContext.mockResolvedValueOnce({
      translated: '短暂的；转瞬即逝的',
      provider: 'mock',
      source: 'provider'
    })

    const store = useWordLookupStore()
    await store.loadForDocument('doc-1')

    const result = await store.lookup('ephemeral', 'sent-1', 'The joy was ephemeral.')

    expect(result?.status).toBe('loaded')
    expect(result?.definition).toBe('短暂的；转瞬即逝的')
    expect(store.getLookup('ephemeral', 'sent-1')?.status).toBe('loaded')
  })

  it('should not re-fetch a loaded word', async () => {
    mockLookupWordInContext.mockResolvedValueOnce({
      translated: '短暂的',
      provider: 'mock',
      source: 'provider'
    })

    const store = useWordLookupStore()
    await store.loadForDocument('doc-1')

    await store.lookup('ephemeral', 'sent-1', 'The joy was ephemeral.')
    await store.lookup('ephemeral', 'sent-1', 'The joy was ephemeral.')

    expect(mockLookupWordInContext).toHaveBeenCalledTimes(1)
  })

  it('should re-fetch when force=true', async () => {
    mockLookupWordInContext.mockResolvedValue({
      translated: '短暂的',
      provider: 'mock',
      source: 'provider'
    })

    const store = useWordLookupStore()
    await store.loadForDocument('doc-1')

    await store.lookup('ephemeral', 'sent-1', 'The joy was ephemeral.')
    await store.lookup('ephemeral', 'sent-1', 'The joy was ephemeral.', true)

    expect(mockLookupWordInContext).toHaveBeenCalledTimes(2)
  })

  it('should mark lookup as failed on error', async () => {
    const { TranslationServiceError } = await import('../../src/services/translation')
    mockLookupWordInContext.mockRejectedValueOnce(
      new (TranslationServiceError as any)('request_failed', 'Network error')
    )

    const store = useWordLookupStore()
    await store.loadForDocument('doc-1')

    const result = await store.lookup('ephemeral', 'sent-1', 'The joy was ephemeral.')

    expect(result?.status).toBe('failed')
    expect(result?.errorCode).toBe('request_failed')
  })

  it('should use lowercase word as key (case-insensitive dedup)', async () => {
    mockLookupWordInContext.mockResolvedValue({
      translated: '短暂的',
      provider: 'mock',
      source: 'provider'
    })

    const store = useWordLookupStore()
    await store.loadForDocument('doc-1')

    await store.lookup('Ephemeral', 'sent-1', 'The joy was ephemeral.')
    const result = store.getLookup('ephemeral', 'sent-1')
    expect(result?.status).toBe('loaded')
  })
})
