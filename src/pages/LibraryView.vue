<template>
  <div class="rf-page-shell library-page">
    <section class="library-hero">
      <div class="library-copy">
        <p class="eyebrow">ReadFlow</p>
        <h1>Import an English PDF and keep reading where you left off.</h1>
        <p class="hero-text">
          Local-first reading for original text, paragraph translation, highlights, tags and offline review.
        </p>
        <div class="hero-actions">
          <label class="primary-upload">
            <input type="file" accept="application/pdf" @change="handleFileUpload" />
            <span>{{ importing ? 'Importing...' : 'Import PDF' }}</span>
          </label>
          <p v-if="errorMessage" class="error-text">{{ errorMessage }}</p>
        </div>
      </div>

      <div class="hero-panel">
        <h2>Phase 1 ready path</h2>
        <ul>
          <li>Import and parse text-based PDF</li>
          <li>Read in Original or Translation mode</li>
          <li>Highlight sentences and add tags</li>
          <li>Restore position and read cached content offline</li>
        </ul>
      </div>
    </section>

    <section class="library-section">
      <div class="section-header">
        <div>
          <p class="eyebrow">Library</p>
          <h2>Your local documents</h2>
        </div>
        <span class="section-meta">{{ documentList.length }} document{{ documentList.length === 1 ? '' : 's' }}</span>
      </div>

      <div v-if="documentList.length === 0" class="empty-state">
        <h3>No PDF has been imported yet.</h3>
        <p>Start with a text-based English PDF to enter the reading flow.</p>
      </div>

      <div v-else class="document-grid">
        <article v-for="doc in documentList" :key="doc.id" class="document-card">
          <button class="document-open" @click="openDocument(doc.id)">
            <div class="document-cover">
              <span>PDF</span>
            </div>

            <div class="document-body">
              <h3>{{ doc.title }}</h3>
              <p>{{ doc.coverSnippet || 'Ready for paragraph-based reading.' }}</p>
              <div class="document-meta">
                <span>{{ formatStatus(doc.status) }}</span>
                <span v-if="doc.paragraphCount">{{ doc.paragraphCount }} paragraphs</span>
                <span v-if="doc.pageCount">{{ doc.pageCount }} pages</span>
              </div>
              <div class="document-meta muted">
                <span>Last opened {{ formatTime(doc.lastOpenedAt) }}</span>
                <span v-if="doc.lastReadAt">Last read {{ formatTime(doc.lastReadAt) }}</span>
              </div>
            </div>
          </button>

          <div class="document-actions">
            <button class="secondary-button" @click="openDocument(doc.id)">Continue reading</button>
            <button class="ghost-button danger" @click="removeDoc(doc.id)">Delete</button>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { v4 as uuidv4 } from 'uuid'
import type { AppDocumentMeta } from '../domain/types'
import { deleteDocument, listDocuments, saveDocumentFile } from '../services/storage'

const router = useRouter()
const documentList = ref<AppDocumentMeta[]>([])
const importing = ref(false)
const errorMessage = ref('')

async function loadList() {
  documentList.value = await listDocuments()
}

onMounted(() => {
  void loadList()
})

async function handleFileUpload(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]

  if (!file) {
    return
  }

  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    errorMessage.value = 'Only PDF files are supported in Phase 1.'
    input.value = ''
    return
  }

  importing.value = true
  errorMessage.value = ''

  try {
    const id = uuidv4()
    await saveDocumentFile(id, file.name, file)
    await loadList()
    router.push(`/reader/${id}`)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Import failed.'
  } finally {
    importing.value = false
    input.value = ''
  }
}

async function removeDoc(id: string) {
  const confirmed = window.confirm('Delete this local document and all its cached reading data?')
  if (!confirmed) {
    return
  }

  await deleteDocument(id)
  await loadList()
}

function openDocument(id: string) {
  router.push(`/reader/${id}`)
}

function formatTime(value: number | null) {
  if (!value) {
    return 'just now'
  }
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(value)
}

function formatStatus(status: AppDocumentMeta['status']) {
  if (status === 'parsed') {
    return 'Cached'
  }
  if (status === 'error') {
    return 'Needs attention'
  }
  return 'Imported'
}
</script>

<style scoped>
.library-page { padding: 32px; }
.library-hero { display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(280px, 0.8fr); gap: 24px; margin: 0 auto 28px; max-width: 1240px; }
.library-copy, .hero-panel, .library-section { background: rgba(251, 250, 247, 0.9); border: 1px solid rgba(201, 194, 184, 0.72); border-radius: 24px; box-shadow: var(--rf-shadow); }
.library-copy { padding: 40px; }
.eyebrow { margin: 0 0 10px; color: var(--rf-primary); font-size: 12px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; }
.library-copy h1 { margin: 0; max-width: 12ch; font-size: clamp(2rem, 4vw, 3.5rem); line-height: 1.05; }
.hero-text { margin: 18px 0 0; max-width: 42rem; color: var(--rf-text-muted); font-size: 1.04rem; }
.hero-actions { margin-top: 28px; }
.primary-upload { display: inline-flex; align-items: center; justify-content: center; min-width: 160px; padding: 13px 18px; border-radius: 999px; background: var(--rf-primary); color: #fff; font-weight: 600; }
.primary-upload input { display: none; }
.error-text { margin: 12px 0 0; color: var(--rf-danger); }
.hero-panel { padding: 28px; }
.hero-panel h2 { margin: 0 0 16px; font-size: 1.1rem; }
.hero-panel ul { margin: 0; padding-left: 18px; color: var(--rf-text-muted); }
.hero-panel li + li { margin-top: 10px; }
.library-section { margin: 0 auto; max-width: 1240px; padding: 28px; }
.section-header { display: flex; align-items: end; justify-content: space-between; gap: 16px; margin-bottom: 20px; }
.section-header h2 { margin: 0; font-size: 1.8rem; }
.section-meta { color: var(--rf-text-muted); }
.empty-state { padding: 40px 24px; border: 1px dashed var(--rf-border-strong); border-radius: 20px; color: var(--rf-text-muted); text-align: center; }
.empty-state h3 { margin: 0 0 8px; color: var(--rf-text); }
.document-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; }
.document-card { display: flex; flex-direction: column; gap: 14px; padding: 18px; border: 1px solid var(--rf-border); border-radius: 20px; background: var(--rf-surface-strong); }
.document-open { display: grid; grid-template-columns: 84px minmax(0, 1fr); gap: 16px; border: none; background: transparent; padding: 0; text-align: left; }
.document-cover { display: flex; align-items: end; justify-content: center; min-height: 112px; border-radius: 16px; background: linear-gradient(180deg, rgba(45, 92, 146, 0.92), rgba(33, 53, 82, 0.94)), #2d5c92; color: #f8fafc; font-weight: 700; letter-spacing: 0.08em; }
.document-body h3 { margin: 2px 0 8px; font-size: 1.02rem; }
.document-body p { margin: 0; color: var(--rf-text-muted); font-size: 0.94rem; }
.document-meta { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 12px; font-size: 0.82rem; }
.document-meta span { padding: 4px 8px; border-radius: 999px; background: var(--rf-primary-soft); color: var(--rf-primary); }
.document-meta.muted span { background: transparent; color: var(--rf-text-muted); padding: 0; }
.document-actions { display: flex; gap: 10px; }
.secondary-button, .ghost-button { border-radius: 999px; padding: 10px 14px; border: 1px solid var(--rf-border-strong); background: transparent; }
.secondary-button { background: var(--rf-surface); color: var(--rf-primary); border-color: rgba(45, 92, 146, 0.24); }
.ghost-button.danger { color: var(--rf-danger); }
@media (max-width: 900px) {
  .library-page { padding: 16px; }
  .library-hero { grid-template-columns: 1fr; }
  .library-copy, .hero-panel, .library-section { padding: 24px; }
  .document-open { grid-template-columns: 64px minmax(0, 1fr); }
}
</style>
