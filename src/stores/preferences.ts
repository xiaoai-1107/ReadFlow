import { defineStore } from 'pinia'
import type { UiLanguage, UiSettings } from '../domain/types'
import { getUiSettings, saveUiSettings } from '../services/storage'

const DEFAULT_LANGUAGE: UiLanguage = 'zh-CN'

function createDefaultSettings(): UiSettings {
  return {
    readerUiLanguage: DEFAULT_LANGUAGE,
    updatedAt: Date.now()
  }
}

export const usePreferencesStore = defineStore('preferences', {
  state: () => ({
    uiLanguage: DEFAULT_LANGUAGE as UiLanguage,
    loaded: false
  }),
  actions: {
    async loadSettings() {
      if (this.loaded) {
        return
      }

      const settings = (await getUiSettings()) ?? createDefaultSettings()
      this.uiLanguage = settings.readerUiLanguage
      this.loaded = true
    },
    async setUiLanguage(language: UiLanguage) {
      this.uiLanguage = language
      this.loaded = true
      await saveUiSettings({
        readerUiLanguage: language,
        updatedAt: Date.now()
      })
    }
  }
})
