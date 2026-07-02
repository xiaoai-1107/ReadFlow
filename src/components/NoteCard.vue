<template>
  <article class="note-card" data-testid="note-card">
    <p class="note-original">{{ note.originalText }}</p>
    <p class="note-translation">{{ note.translationText || '暂无翻译' }}</p>
    <p v-if="note.userNote && !editing" class="note-user-text">{{ note.userNote }}</p>

    <template v-if="editing">
      <textarea
        v-model="userNoteDraft"
        class="note-input"
        rows="3"
        placeholder="添加笔记"
      />
      <div class="note-actions">
        <button class="note-button primary" type="button" @click="save">保存</button>
        <button class="note-button" type="button" @click="cancel">取消</button>
        <button class="note-button" type="button" @click="emit('delete')">删除</button>
      </div>
    </template>

    <div v-else class="note-collapsed-actions">
      <button class="note-add-button" type="button" aria-label="添加笔记" @click="openEditor">+</button>
    </div>
  </article>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { NoteRecord, TagRecord } from '../domain/types'

const props = defineProps<{
  note: NoteRecord
  tags: TagRecord[]
}>()

const emit = defineEmits<{
  save: [payload: { translationText: string; userNote: string }]
  addTag: [name: string]
  removeTag: [tagId: string]
  delete: []
}>()

const userNoteDraft = ref(props.note.userNote)
const editing = ref(false)

watch(
  () => props.note.userNote,
  userNote => {
    userNoteDraft.value = userNote
    if (!userNote) {
      editing.value = false
    }
  }
)

function openEditor() {
  userNoteDraft.value = props.note.userNote
  editing.value = true
}

function cancel() {
  userNoteDraft.value = props.note.userNote
  editing.value = false
}

function save() {
  emit('save', {
    translationText: props.note.translationText,
    userNote: userNoteDraft.value.trim()
  })
  editing.value = false
}
</script>

<style scoped>
.note-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
  padding: 9px;
  border: 1px solid var(--rf-border-strong);
  border-radius: 10px;
  background: rgba(38, 38, 38, .92);
  color: var(--rf-text);
}

.note-original {
  margin: 0;
  color: var(--rf-text);
  font-family: Georgia, "Times New Roman", Times, serif;
  font-size: .92rem;
  line-height: 1.48;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.note-translation {
  margin: 0;
  color: var(--rf-text-muted);
  font-size: .8rem;
  line-height: 1.45;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.note-user-text {
  margin: 0;
  color: var(--rf-text);
  font-size: .84rem;
  line-height: 1.45;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.note-input {
  width: 100%;
  min-width: 0;
  border: 1px solid var(--rf-border-strong);
  border-radius: 8px;
  background: var(--rf-surface);
  color: var(--rf-text);
  padding: 8px 9px;
  font: inherit;
  font-size: .86rem;
  line-height: 1.45;
  resize: vertical;
}

.note-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.note-collapsed-actions {
  display: flex;
  justify-content: flex-end;
}

.note-add-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: 1px solid var(--rf-primary-border);
  border-radius: 999px;
  background: var(--rf-primary);
  color: #fff;
  font-size: 1rem;
  line-height: 1;
}

.note-button {
  border: 1px solid var(--rf-border-strong);
  border-radius: 999px;
  background: var(--rf-button-bg);
  color: var(--rf-text);
  padding: 5px 10px;
  font-size: .78rem;
}

.note-button.primary {
  border-color: var(--rf-primary-border);
  background: var(--rf-primary);
  color: #fff;
}
</style>
