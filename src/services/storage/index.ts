import localforage from 'localforage'
import type {
  AnnotationBundle,
  AppDocumentMeta,
  NoteBundle,
  NoteRecord,
  ParsedDocumentCache,
  ReaderSession,
  SentenceTranslationRecord,
  TranslationRecord,
  UiSettings,
  VocabBundle,
  WordLookupRecord
} from '../../domain/types'

const DB_NAME = 'readflow'
const SETTINGS_KEY = 'ui-settings'

export const stores = {
  documents: localforage.createInstance({ name: DB_NAME, storeName: 'documents' }),
  files: localforage.createInstance({ name: DB_NAME, storeName: 'files' }),
  parsed: localforage.createInstance({ name: DB_NAME, storeName: 'parsed' }),
  translations: localforage.createInstance({ name: DB_NAME, storeName: 'translations' }),
  sentenceTranslations: localforage.createInstance({ name: DB_NAME, storeName: 'sentence-translations' }),
  annotations: localforage.createInstance({ name: DB_NAME, storeName: 'annotations' }),
  notes: localforage.createInstance({ name: DB_NAME, storeName: 'notes' }),
  sessions: localforage.createInstance({ name: DB_NAME, storeName: 'sessions' }),
  settings: localforage.createInstance({ name: DB_NAME, storeName: 'settings' }),
  wordLookups: localforage.createInstance({ name: DB_NAME, storeName: 'word-lookups' }),
  vocab: localforage.createInstance({ name: DB_NAME, storeName: 'vocab' })
}

function createEmptyMeta(id: string, title: string): AppDocumentMeta {
  const now = Date.now()
  return {
    id,
    title,
    createdAt: now,
    lastOpenedAt: now,
    lastReadAt: null,
    pageCount: 0,
    paragraphCount: 0,
    coverSnippet: '',
    parseCachedAt: null,
    status: 'imported',
    lastError: null
  }
}

export async function saveDocumentFile(id: string, title: string, file: File): Promise<AppDocumentMeta> {
  const meta = createEmptyMeta(id, title)
  await stores.documents.setItem(id, meta)
  await stores.files.setItem(id, file)
  return meta
}

export async function getDocumentMeta(id: string): Promise<AppDocumentMeta | null> {
  return stores.documents.getItem<AppDocumentMeta>(id)
}

export async function updateDocumentMeta(id: string, patch: Partial<AppDocumentMeta>): Promise<AppDocumentMeta | null> {
  const current = (await getDocumentMeta(id)) ?? null
  if (!current) {
    return null
  }

  const nextMeta: AppDocumentMeta = {
    ...current,
    ...patch
  }
  await stores.documents.setItem(id, nextMeta)
  return nextMeta
}

export async function markDocumentOpened(id: string): Promise<void> {
  await updateDocumentMeta(id, {
    lastOpenedAt: Date.now()
  })
}

export async function markDocumentRead(id: string): Promise<void> {
  await updateDocumentMeta(id, {
    lastReadAt: Date.now()
  })
}

export async function listDocuments(): Promise<AppDocumentMeta[]> {
  const keys = await stores.documents.keys()
  const documents = await Promise.all(keys.map(async key => stores.documents.getItem<AppDocumentMeta>(key)))

  return documents
    .filter((item): item is AppDocumentMeta => item !== null)
    .sort((left, right) => {
      const leftWeight = left.lastReadAt ?? left.lastOpenedAt ?? left.createdAt
      const rightWeight = right.lastReadAt ?? right.lastOpenedAt ?? right.createdAt
      return rightWeight - leftWeight
    })
}

export async function getDocumentFile(id: string): Promise<File | null> {
  return stores.files.getItem<File>(id)
}

export async function saveParsedDocument(parsed: ParsedDocumentCache): Promise<void> {
  await stores.parsed.setItem(parsed.documentId, parsed)
  await updateDocumentMeta(parsed.documentId, {
    pageCount: parsed.pageCount,
    paragraphCount: parsed.paragraphs.length,
    coverSnippet: parsed.paragraphs[0]?.preview ?? '',
    parseCachedAt: parsed.cachedAt,
    status: 'parsed',
    lastError: null
  })
}

export async function getParsedDocument(id: string): Promise<ParsedDocumentCache | null> {
  return stores.parsed.getItem<ParsedDocumentCache>(id)
}

export async function saveDocumentError(id: string, errorMessage: string): Promise<void> {
  await updateDocumentMeta(id, {
    status: 'error',
    lastError: errorMessage
  })
}

export async function getTranslationBundle(documentId: string): Promise<Record<string, TranslationRecord>> {
  return (await stores.translations.getItem<Record<string, TranslationRecord>>(documentId)) ?? {}
}

export async function saveTranslationRecord(record: TranslationRecord): Promise<void> {
  const bundle = await getTranslationBundle(record.documentId)
  bundle[record.paragraphId] = record
  await stores.translations.setItem(record.documentId, bundle)
}

export async function getSentenceTranslationBundle(documentId: string): Promise<Record<string, SentenceTranslationRecord>> {
  return (await stores.sentenceTranslations.getItem<Record<string, SentenceTranslationRecord>>(documentId)) ?? {}
}

export async function saveSentenceTranslationRecord(record: SentenceTranslationRecord): Promise<void> {
  const bundle = await getSentenceTranslationBundle(record.documentId)
  bundle[record.id] = record
  await stores.sentenceTranslations.setItem(record.documentId, bundle)
}

export async function getAnnotationBundle(documentId: string): Promise<AnnotationBundle> {
  return (
    (await stores.annotations.getItem<AnnotationBundle>(documentId)) ?? {
      documentId,
      highlights: [],
      tags: [],
      updatedAt: Date.now()
    }
  )
}

export async function saveAnnotationBundle(bundle: AnnotationBundle): Promise<void> {
  await stores.annotations.setItem(bundle.documentId, {
    documentId: bundle.documentId,
    highlights: bundle.highlights.map(highlight => ({ ...highlight })),
    tags: bundle.tags.map(tag => ({
      ...tag,
      highlightIds: [...tag.highlightIds]
    })),
    updatedAt: Date.now()
  })
}

export async function getNoteBundle(documentId: string): Promise<NoteBundle> {
  return (
    (await stores.notes.getItem<NoteBundle>(documentId)) ?? {
      documentId,
      notes: [],
      updatedAt: Date.now()
    }
  )
}

export async function saveNoteBundle(bundle: NoteBundle): Promise<void> {
  await stores.notes.setItem(bundle.documentId, {
    documentId: bundle.documentId,
    notes: bundle.notes.map(note => ({ ...note })),
    updatedAt: Date.now()
  })
}

export async function saveNoteRecord(record: NoteRecord): Promise<void> {
  const bundle = await getNoteBundle(record.documentId)
  const noteIndex = bundle.notes.findIndex(note => note.id === record.id)
  const nextRecord = {
    ...record,
    updatedAt: Date.now()
  }

  if (noteIndex >= 0) {
    bundle.notes[noteIndex] = nextRecord
  } else {
    bundle.notes.push(nextRecord)
  }

  await saveNoteBundle(bundle)
}

export async function deleteNoteRecord(documentId: string, noteId: string): Promise<void> {
  const bundle = await getNoteBundle(documentId)
  await saveNoteBundle({
    ...bundle,
    notes: bundle.notes.filter(note => note.id !== noteId)
  })
}

export async function getReaderSession(documentId: string): Promise<ReaderSession | null> {
  return stores.sessions.getItem<ReaderSession>(documentId)
}

export async function saveReaderSession(session: ReaderSession): Promise<void> {
  await stores.sessions.setItem(session.documentId, session)
  await markDocumentRead(session.documentId)
}

export async function getUiSettings(): Promise<UiSettings | null> {
  return stores.settings.getItem<UiSettings>(SETTINGS_KEY)
}

export async function saveUiSettings(settings: UiSettings): Promise<void> {
  await stores.settings.setItem(SETTINGS_KEY, settings)
}

export async function deleteDocument(id: string): Promise<void> {
  await Promise.all([
    stores.documents.removeItem(id),
    stores.files.removeItem(id),
    stores.parsed.removeItem(id),
    stores.translations.removeItem(id),
    stores.sentenceTranslations.removeItem(id),
    stores.annotations.removeItem(id),
    stores.notes.removeItem(id),
    stores.sessions.removeItem(id),
    stores.wordLookups.removeItem(id)
  ])
}

const VOCAB_KEY = 'global-vocab'

export async function getWordLookupBundle(documentId: string): Promise<Record<string, WordLookupRecord>> {
  return (await stores.wordLookups.getItem<Record<string, WordLookupRecord>>(documentId)) ?? {}
}

export async function saveWordLookupRecord(documentId: string, record: WordLookupRecord): Promise<void> {
  const bundle = await getWordLookupBundle(documentId)
  bundle[record.id] = record
  await stores.wordLookups.setItem(documentId, bundle)
}

export async function getVocabBundle(): Promise<VocabBundle> {
  return (
    (await stores.vocab.getItem<VocabBundle>(VOCAB_KEY)) ??
    { entries: [], updatedAt: Date.now() }
  )
}

export async function saveVocabBundle(bundle: Omit<VocabBundle, 'updatedAt'>): Promise<void> {
  await stores.vocab.setItem(VOCAB_KEY, {
    entries: bundle.entries.map(entry => ({ ...entry })),
    updatedAt: Date.now()
  })
}

export async function removeVocabEntry(id: string): Promise<void> {
  const bundle = await getVocabBundle()
  const next = { ...bundle, entries: bundle.entries.filter(e => e.id !== id) }
  await saveVocabBundle(next)
}
