import { describe, it, expect } from 'vitest'
import { getReaderCopy } from '../../src/utils/readerUi'

describe('readerUi copy — Phase 2 strings', () => {
  it('should have sentence retry copy in zh-CN', () => {
    expect(getReaderCopy('zh-CN', 'retrySentenceTranslation')).toBe('重试句子翻译')
    expect(getReaderCopy('zh-CN', 'sentenceTranslationRetried')).toBe('已重新请求句子翻译。')
  })

  it('should have sentence retry copy in en', () => {
    expect(getReaderCopy('en', 'retrySentenceTranslation')).toBe('Retry sentence translation')
    expect(getReaderCopy('en', 'sentenceTranslationRetried')).toBe('Retried the sentence translation.')
  })

  it('should have word lookup copy in zh-CN', () => {
    expect(getReaderCopy('zh-CN', 'wordLookupLoading')).toBe('正在查询词义...')
    expect(getReaderCopy('zh-CN', 'wordLookupFailed')).toContain('查词失败')
    expect(getReaderCopy('zh-CN', 'retryWordLookup')).toBe('重试查词')
    expect(getReaderCopy('zh-CN', 'wordDefinition')).toBe('词义')
  })

  it('should have word lookup copy in en', () => {
    expect(getReaderCopy('en', 'wordLookupLoading')).toContain('Looking up')
    expect(getReaderCopy('en', 'retryWordLookup')).toBe('Retry lookup')
    expect(getReaderCopy('en', 'wordDefinition')).toBe('Definition')
  })

  it('should have vocab copy in both languages', () => {
    expect(getReaderCopy('zh-CN', 'saveToVocab')).toBe('收藏单词')
    expect(getReaderCopy('zh-CN', 'wordSavedToVocab')).toBe('已收藏到单词本。')
    expect(getReaderCopy('zh-CN', 'vocab')).toBe('单词本')
    expect(getReaderCopy('zh-CN', 'vocabEmpty')).toBe('还没有收藏的单词。')
    expect(getReaderCopy('zh-CN', 'vocabDeleteEntry')).toBe('删除')
    expect(getReaderCopy('zh-CN', 'vocabEntryFrom', { title: 'My Book' })).toBe('来源：My Book')

    expect(getReaderCopy('en', 'saveToVocab')).toBe('Save word')
    expect(getReaderCopy('en', 'vocab')).toBe('Vocabulary')
    expect(getReaderCopy('en', 'vocabEntryFrom', { title: 'My Book' })).toBe('From: My Book')
  })

  it('should have export copy in both languages', () => {
    expect(getReaderCopy('zh-CN', 'exportAsMarkdown')).toBe('导出为 Markdown')
    expect(getReaderCopy('zh-CN', 'exportAsTxt')).toBe('导出为 TXT')
    expect(getReaderCopy('zh-CN', 'exportDone')).toBe('已导出摘录文件。')
    expect(getReaderCopy('zh-CN', 'noHighlightsToExport')).toBeTruthy()
    expect(getReaderCopy('zh-CN', 'exportByTag', { name: '重要' })).toBe('按标签"重要"导出')

    expect(getReaderCopy('en', 'exportAsMarkdown')).toBe('Export as Markdown')
    expect(getReaderCopy('en', 'exportAsTxt')).toBe('Export as TXT')
    expect(getReaderCopy('en', 'exportDone')).toBe('Excerpt file exported.')
    expect(getReaderCopy('en', 'exportByTag', { name: 'important' })).toBe('Export by tag "important"')
  })
})
