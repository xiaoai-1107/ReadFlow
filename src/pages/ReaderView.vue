<template>
  <div
    ref="readerPageRef"
    class="rf-page-shell reader-page"
    data-testid="reader-page"
    :data-mobile-layer="activeMobileLayer"
  >
    <div v-if="loading" class="state-card">
      <p class="kicker">{{ t('appName') }}</p>
      <h1>{{ t('preparingTitle') }}</h1>
      <p>{{ t('preparingBody') }}</p>
    </div>

    <div v-else-if="error" class="state-card">
      <p class="kicker">{{ t('appName') }}</p>
      <h1>{{ t('openErrorTitle') }}</h1>
      <p>{{ localizedPageError }}</p>
      <button class="chip-button" @click="goBack">{{ t('backToLibrary') }}</button>
    </div>

    <template v-else>
      <header ref="toolbarRef" :class="['toolbar', { mobile: isMobile }]" data-testid="reader-toolbar">
        <template v-if="isMobile">
          <div class="mobile-topbar">
            <button class="ghost-button mobile-nav-button" data-testid="toolbar-back-button" @click.stop="goBack">{{ t('back') }}</button>
            <div class="title-block mobile-title-block">
              <span class="brand">{{ t('appName') }}</span>
              <span class="title mobile">{{ documentTitle }}</span>
            </div>
            <div class="mobile-trailing-controls">
              <div class="lang-switch" :aria-label="t('languageSwitchLabel')">
                <button :class="['lang-button', { active: uiLanguage === 'zh-CN' }]" @click.stop="setUiLanguage('zh-CN')">{{ t('uiChinese') }}</button>
                <button :class="['lang-button', { active: uiLanguage === 'en' }]" @click.stop="setUiLanguage('en')">{{ t('uiEnglish') }}</button>
              </div>
              <div class="mobile-menu-anchor">
                <button class="ghost-button mobile-nav-button" data-testid="toolbar-more-button" @click.stop="toggleMoreMenu">{{ t('more') }}</button>
                <div v-if="showMoreMenu" class="menu" data-testid="toolbar-more-menu" @click.stop>
                  <button data-testid="toolbar-more-close-target" @click="goBack">{{ t('openLibrary') }}</button>
                  <button @click="deleteCurrentDocument">{{ t('deleteDocument') }}</button>
                </div>
              </div>
            </div>
          </div>

          <div class="mobile-mode-strip">
            <div class="mode-switch mobile-mode-switch">
              <button :class="['mode-button', { active: mode === 'original' }]" data-testid="mode-original" @click="setMode('original')">{{ t('original') }}</button>
              <button :class="['mode-button', { active: mode === 'translation' }]" data-testid="mode-translation" @click="setMode('translation')">{{ t('translation') }}</button>
            </div>
          </div>
        </template>

        <template v-else>
          <div class="toolbar-group">
            <button class="ghost-button" data-testid="toolbar-back-button" @click.stop="goBack">{{ t('library') }}</button>
            <div class="title-block">
              <span class="brand">{{ t('appName') }}</span>
              <span class="title">{{ documentTitle }}</span>
            </div>
          </div>

          <div class="toolbar-group center">
            <div class="mode-switch">
              <button :class="['mode-button', { active: mode === 'original' }]" data-testid="mode-original" @click="setMode('original')">{{ t('original') }}</button>
              <button :class="['mode-button', { active: mode === 'translation' }]" data-testid="mode-translation" @click="setMode('translation')">{{ t('translation') }}</button>
            </div>
            <form class="search-box" @submit.prevent="handleSearch">
              <input v-model="searchQuery" type="search" :placeholder="t('searchParagraphs')" />
            </form>
          </div>

          <div class="toolbar-group end">
            <button class="ghost-button" type="button" @click="notePanelVisible = !notePanelVisible">
              {{ notePanelVisible ? '隐藏笔记' : '显示笔记' }}
            </button>
            <div class="lang-switch" :aria-label="t('languageSwitchLabel')">
              <button :class="['lang-button', { active: uiLanguage === 'zh-CN' }]" @click.stop="setUiLanguage('zh-CN')">{{ t('uiChinese') }}</button>
              <button :class="['lang-button', { active: uiLanguage === 'en' }]" @click.stop="setUiLanguage('en')">{{ t('uiEnglish') }}</button>
            </div>
            <button class="ghost-button" data-testid="toolbar-more-button" @click.stop="toggleMoreMenu">{{ t('more') }}</button>
            <div v-if="showMoreMenu" class="menu" data-testid="toolbar-more-menu" @click.stop>
              <button data-testid="toolbar-more-close-target" @click="goBack">{{ t('openLibrary') }}</button>
              <button @click="deleteCurrentDocument">{{ t('deleteDocument') }}</button>
            </div>
          </div>
        </template>
      </header>

      <div v-if="showRestoreBanner" :class="['banner', { floating: isMobile }]" data-testid="restore-banner" role="status">
        <span>{{ restoreBanner }}</span>
        <button @click="showRestoreBanner = false">{{ t('close') }}</button>
      </div>

      <div :class="['layout', { mobile: isMobile }]">
        <aside v-if="!isMobile" class="sidebar">
          <section class="panel">
            <div class="panel-label">{{ t('currentDocument') }}</div>
            <h2>{{ documentTitle }}</h2>
            <p class="muted">{{ t('paragraphCountMeta', { paragraphCount: documentMeta?.paragraphCount || paragraphs.length, pageCount: documentMeta?.pageCount || 0 }) }}</p>
            <div class="chip-row">
              <span :class="['status-chip', { active: cacheReady }]">{{ t('cached') }}</span>
              <span :class="['status-chip', { active: cacheReady }]">{{ t('availableOffline') }}</span>
            </div>
          </section>

          <div class="study-tabs" style="display: flex; gap: 8px; margin-bottom: 12px; border-bottom: 1px solid var(--border-color);">
            <button :class="['study-tab', { active: sidebarTab === 'structure' }]" @click="sidebarTab = 'structure'" style="flex: 1; padding: 8px 0; background: none; border: none; cursor: pointer;" :style="sidebarTab === 'structure' ? 'border-bottom: 2px solid var(--primary-color); color: var(--primary-color); font-weight: 500;' : 'border-bottom: 2px solid transparent; color: var(--text-secondary);'">{{ t('structure') }}</button>
            <button :class="['study-tab', { active: sidebarTab === 'mystudy' }]" @click="sidebarTab = 'mystudy'" style="flex: 1; padding: 8px 0; background: none; border: none; cursor: pointer;" :style="sidebarTab === 'mystudy' ? 'border-bottom: 2px solid var(--primary-color); color: var(--primary-color); font-weight: 500;' : 'border-bottom: 2px solid transparent; color: var(--text-secondary);'">{{ t('myStudy') }}</button>
          </div>

          <section class="panel" v-if="sidebarTab === 'structure'" style="padding-top: 0;">
            <nav class="structure-list">
              <button
                v-for="item in structureItems"
                :key="item.id"
                :class="['structure-item', { active: isStructureItemActive(item) }]"
                @click="selectStructureItem(item.targetParagraphId)"
              >
                <span class="structure-index">{{ item.label }}</span>
                <span class="structure-meta">{{ item.meta }}</span>
              </button>
            </nav>
          </section>

          <section class="panel" v-if="sidebarTab === 'mystudy'" style="padding-top: 0;">
            <div class="study-links">
              <button class="study-link-button" @click="openStudyPanel('highlights')">
                <span class="study-link-title">
                  <span>{{ t('highlights') }}</span>
                  <span class="study-link-count">{{ highlightStore.highlights.length }}</span>
                </span>
                <span class="study-link-meta">
                  {{ highlightStore.highlights.length === 0 ? t('highlightsEmpty') : t('highlightsReviewMeta') }}
                </span>
              </button>
              <button class="study-link-button" @click="openTagReview()">
                <span class="study-link-title">
                  <span>{{ t('tags') }}</span>
                  <span class="study-link-count">{{ highlightStore.tags.length }}</span>
                </span>
                <span class="study-link-meta">
                  {{ highlightStore.tags.length === 0 ? t('tagsEmpty') : t('tagsReviewMeta') }}
                </span>
              </button>
              <button class="study-link-button" @click="jumpToRecentlyRead">
                <span class="study-link-title">
                  <span>{{ t('recentlyRead') }}</span>
                  <span class="study-link-count">{{ recentlyReadParagraph ? `P${recentlyReadParagraph.pageIndex + 1}` : '--' }}</span>
                </span>
                <span class="study-link-meta">{{ recentlyReadSummary }}</span>
              </button>
            </div>
          </section>
        </aside>

        <main ref="contentRef" :class="['content', { mobile: isMobile }]" data-testid="reader-content">
          <div :class="['book-page', { 'notes-hidden': !notePanelVisible }]">
            <template v-for="(paragraph, paragraphIndex) in paragraphs" :key="paragraph.id">
              <article
                :id="paragraph.id"
                data-testid="paragraph"
                :data-paragraph-id="paragraph.id"
                :data-layout-role="paragraph.layoutRole || 'body'"
                :class="[
                  'paragraph',
                  paragraphLayoutClass(paragraph),
                  {
                    current: paragraph.id === currentParagraphId,
                    highlighted: isParagraphHighlighted(paragraph.id)
                  }
                ]"
                :style="paragraphHighlightStyle(paragraph.id)"
              >
                <div class="paragraph-index">{{ paragraph.order + 1 }}</div>
                <div class="paragraph-body">
                  <p class="paragraph-text">
                    <span
                      v-for="(sentence, sentenceIndex) in paragraph.sentences"
                      :key="sentence.id"
                      class="sentence-shell"
                    >
                      <span
                        v-for="fragment in getSentenceFragments(sentence)"
                        :key="fragment.id"
                        :ref="element => registerFragmentElement(sentence.id, fragment.id, element)"
                        role="button"
                        tabindex="0"
                        :data-fragment-id="fragment.id"
                        data-testid="sentence-fragment"
                        :data-selected="fragment.id === sentenceSelection?.fragment.id ? 'true' : 'false'"
                        :class="[
                          'sentence-fragment',
                          {
                            selected: fragment.id === sentenceSelection?.fragment.id,
                            marked: isSentenceHighlighted(sentence.id)
                          }
                        ]"
                        :style="sentenceHighlightStyle(sentence.id)"
                        @click.stop="selectSentenceFragment(paragraph, sentence, sentenceIndex, fragment, $event)"
                      >
                        {{ fragment.displayText }}
                      </span>
                    </span>
                  </p>

                  <div v-if="mode === 'translation'" class="translation-block">
                    <p v-if="hasLiveTranslation(translationFor(paragraph.id))" class="translation-text">
                      {{ translationFor(paragraph.id)?.translatedText }}
                    </p>
                    <div v-else-if="isTranslationUnavailable(translationFor(paragraph.id)) || !translationProviderConfigured" class="inline-status error">
                      <span>{{ t('translationServiceUnavailable') }}</span>
                    </div>
                    <div v-else-if="translationFor(paragraph.id)?.status === 'failed'" class="inline-status error">
                      <span>{{ translationErrorText(translationFor(paragraph.id)) }}</span>
                      <button v-if="canRetryTranslation(translationFor(paragraph.id))" @click="retryTranslation(paragraph.id)">{{ t('retryTranslation') }}</button>
                    </div>
                    <div v-else class="inline-status">
                      <span>{{ translationFor(paragraph.id)?.status === 'translating' ? t('translationLoadingCurrent') : t('translationLoadingAround') }}</span>
                    </div>
                  </div>
                </div>
                <div v-if="notePanelVisible" class="paragraph-notes" aria-label="学习笔记">
                  <NoteCard
                    v-for="note in notesForParagraph(paragraph.id)"
                    :key="note.id"
                    :note="note"
                    :tags="tagsForNote(note)"
                    @save="payload => saveNote(note, payload)"
                    @add-tag="name => addTagToNote(note, name)"
                    @remove-tag="tagId => removeTagFromNote(note, tagId)"
                    @delete="deleteNote(note)"
                  />
                </div>
              </article>

              <div v-if="isLastParagraphOnPage(paragraphIndex)" class="page-marker">
                — Page {{ paragraph.pageIndex + 1 }} —
              </div>
            </template>
          </div>
        </main>

        <aside v-if="!isMobile" class="details">
          <section class="panel">
            <div class="panel-label">{{ t('currentParagraph') }}</div>
            <h2>{{ currentParagraphTitle }}</h2>
            <p class="muted">{{ currentParagraphPreview }}</p>
            <div class="chip-row top-gap">
              <button class="chip-button" @click="toggleParagraphHighlight">
                {{ currentParagraphHighlighted ? t('removeParagraphHighlight') : t('highlightParagraph') }}
              </button>
              
            </div>
          </section>

          <section class="panel">
            <div class="panel-label">{{ t('translationStatus') }}</div>
            <template v-if="hasLiveTranslation(currentTranslation)">
              <p class="success-text">{{ t('translationCachedVia', { provider: currentTranslation?.providerKey ?? 'provider' }) }}</p>
              <p class="translation-summary">{{ currentTranslation?.translatedText }}</p>
            </template>
            <template v-else-if="currentTranslation?.status === 'failed'">
              <p class="error-text">{{ translationErrorText(currentTranslation) }}</p>
              <button v-if="canRetryTranslation(currentTranslation)" class="chip-button" @click="retryTranslation(currentParagraphId)">{{ t('retryTranslation') }}</button>
            </template>
            <p v-else class="muted">{{ isTranslationUnavailable(currentTranslation) || !translationProviderConfigured ? t('translationServiceUnavailable') : (currentTranslation?.status === 'translating' ? t('translationLoadingCurrent') : t('translationLoadingAround')) }}</p>
          </section>

          <section class="panel">
            <div class="panel-label">{{ t('highlightsAndTags') }}</div>
            <p class="muted">{{ currentParagraphHighlightSummary }}</p>
            <div class="chip-row top-gap">
              <button
                v-for="tag in currentParagraphTags"
                :key="tag.id"
                class="tag-chip tag-chip-button"
                @click="openTagReview(tag.id)"
              >
                {{ tag.name }}
              </button>
              <span v-if="currentParagraphTags.length === 0" class="muted small">{{ t('noTagsYet') }}</span>
            </div>
            <div v-if="currentParagraphReviewItems.length > 0" class="tag-review-list top-gap">
              <button
                v-for="item in currentParagraphReviewItems"
                :key="item.highlight.id"
                class="tag-review-item"
                @click="jumpToHighlightItem(item)"
              >
                <span class="tag-review-meta">{{ item.targetLabel }}</span>
                <span class="tag-review-snippet">{{ item.snippet }}</span>
              </button>
            </div>
            <div v-if="!sentenceSelection" class="tag-editor-panel top-gap">
              <div class="sentence-card-label">{{ t('existingTags') }}</div>
              <div class="chip-row top-gap">
                <button
                  v-for="tag in highlightStore.tags"
                  :key="tag.id"
                  :class="['tag-chip', 'tag-chip-button', { active: currentParagraphHighlightRecord ? isTagAttached(currentParagraphHighlightRecord.id, tag.id) : false }]"
                  @click="toggleExistingTag(tag.id)"
                >
                  {{ tag.name }}
                </button>
                <span v-if="highlightStore.tags.length === 0" class="muted small">{{ t('tagsEmpty') }}</span>
              </div>
              <div class="tag-editor compact-editor">
                <input v-model="tagInput" type="text" :placeholder="t('newTagOptional')" @keyup.enter="submitTagForCurrentTarget" />
                <button class="chip-button subtle-chip" @click="submitTagForCurrentTarget">{{ t('saveTag') }}</button>
              </div>
            </div>
            <p v-if="currentParagraphReviewItems.length === 0" class="muted small top-gap">{{ t('noHighlightsInParagraph') }}</p>
          </section>
        </aside>
      </div>

      <div v-if="selectionHighlightRects.length > 0" class="sentence-selection-layer" aria-hidden="true">
        <div
          v-for="rect in selectionHighlightRects"
          :key="rect.id"
          class="sentence-selection-rect"
          :style="{
            left: `${rect.left}px`,
            top: `${rect.top}px`,
            width: `${rect.width}px`,
            height: `${rect.height}px`
          }"
        />
      </div>

      <div v-if="sentenceSelection" class="sentence-card" data-testid="sentence-card" :style="sentenceSelectionStyle" @click.stop>
        <div class="sentence-card-head">
          <p class="sentence-card-meta">{{ selectedParagraphLabel }}</p>
          <button class="sentence-card-close" @click="resetSelection">{{ t('close') }}</button>
        </div>

        <div v-if="!sentenceSelection.fragment.isWholeSentence" class="sentence-card-toggle">
          <button class="chip-button subtle-chip" @click="toggleSentenceCardMode">
            {{ sentenceCardMode === 'sentence' ? t('showFragment') : t('showFullSentence') }}
          </button>
        </div>

        <p class="sentence-card-text">{{ selectedSentenceSourceText }}</p>

        <div class="sentence-card-translation">
          <p v-if="selectedSentenceMeaning" class="sentence-card-meaning">{{ selectedSentenceMeaning }}</p>
          <template v-else-if="selectedSentenceTranslation?.status === 'failed' && canRetryTranslation(selectedSentenceTranslation)">
            <p class="muted small">{{ translationErrorText(selectedSentenceTranslation) }}</p>
            <button class="chip-button subtle-chip" style="margin-top: 8px;" @click="retrySentenceTranslation">{{ t('retrySentenceTranslation') }}</button>
          </template>
          <p v-else class="muted small">{{ selectedSentenceTranslationMessage }}</p>
        </div>

        <div class="sentence-card-actions">
          <button class="chip-button subtle-chip" @click="createNoteFromSelection">
            加入笔记
          </button>
          <button class="chip-button subtle-chip" @click="toggleSelectedSentenceHighlight">
            {{ t('highlightAction') }}
          </button>
          <button class="chip-button subtle-chip" @click="copySelectedSentence">{{ t('copy') }}</button>
          <button class="chip-button subtle-chip" @click="openTagEditorFromSelection">
            标签
          </button>
        </div>

        <div v-if="showHighlightColorPanel" class="sentence-card-section">
          <div class="color-swatches">
            <button
              v-for="color in highlightColorOptions"
              :key="color"
              :class="['color-swatch', { active: selectedSentenceHighlightRecord?.color === color }]"
              :style="{ '--swatch-color': color }"
              @click="applySentenceHighlightColor(color)"
            />
          </div>
        </div>

        <div v-if="showTagEditor" class="sentence-card-section tag-editor-panel">
          <div class="chip-row">
            <button
              v-for="tag in highlightStore.tags"
              :key="tag.id"
              :class="['tag-chip', 'tag-chip-button', { active: selectedSentenceHighlightRecord ? isTagAttached(selectedSentenceHighlightRecord.id, tag.id) : false }]"
              @click="toggleExistingTag(tag.id)"
            >
              {{ tag.name }}
            </button>
            <span v-if="highlightStore.tags.length === 0" class="muted small">{{ t('tagsEmpty') }}</span>
          </div>
          <div class="tag-editor compact-editor">
            <input v-model="tagInput" type="text" :placeholder="t('newTagOptional')" @keyup.enter="submitTagForCurrentTarget" />
            <button class="chip-button subtle-chip" @click="submitTagForCurrentTarget">{{ t('saveTag') }}</button>
          </div>
        </div>
      </div>

      <button
        v-if="showMobilePrimaryAction"
        class="mobile-fab"
        data-testid="mobile-primary-action"
        @click.stop="openMobileActionSheet"
      >
        {{ t('readerTools') }}
      </button>

      <div v-if="isMobile && showMobileActionSheet" class="overlay" data-testid="action-sheet-backdrop" @click="closeMobileActionSheet">
        <section class="sheet action-sheet" data-testid="action-sheet" @click.stop>
          <div class="sheet-head">
            <h3>{{ t('readerTools') }}</h3>
            <button @click="closeMobileActionSheet">{{ t('close') }}</button>
          </div>
          <p class="muted action-sheet-copy">{{ t('readerToolsCopy') }}</p>
          <div class="mobile-action-grid">
            <button class="mobile-action-card" data-testid="open-structure-drawer" @click="openStructureDrawerFromActions">
              <span class="mobile-action-title">{{ t('structure') }}</span>
              <span class="mobile-action-meta">{{ t('readerToolsStructureMeta') }}</span>
            </button>
            <button class="mobile-action-card" data-testid="open-study-panel" @click="openStudyPanelFromActions">
              <span class="mobile-action-title">{{ t('myStudy') }}</span>
              <span class="mobile-action-meta">{{ t('readerToolsStudyMeta') }}</span>
            </button>
            <button class="mobile-action-card" data-testid="open-details-sheet" @click="openMobileDetailsFromActions">
              <span class="mobile-action-title">{{ t('details') }}</span>
              <span class="mobile-action-meta">{{ t('readerToolsDetailsMeta') }}</span>
            </button>
          </div>
        </section>
      </div>

      <div v-if="isMobile && showStructureDrawer" class="overlay" data-testid="structure-drawer-backdrop" @click="closeStructureDrawer">
        <aside class="drawer" data-testid="structure-drawer" @click.stop>
          <div class="sheet-head">
            <h3>{{ t('structure') }}</h3>
            <button @click="closeStructureDrawer">{{ t('close') }}</button>
          </div>
          <nav class="structure-list mobile-list">
            <button
              v-for="item in structureItems"
              :key="item.id"
              :class="['structure-item', { active: isStructureItemActive(item) }]"
              @click="selectStructureItem(item.targetParagraphId)"
            >
              <span class="structure-index">{{ item.label }}</span>
              <span class="structure-meta">{{ item.meta }}</span>
            </button>
          </nav>
        </aside>
      </div>

      <div v-if="isMobile && showMobileDetails" class="overlay" data-testid="details-sheet-backdrop" @click="closeMobileDetails">
        <section class="sheet" data-testid="details-sheet" @click.stop>
          <div class="sheet-head">
            <h3>{{ currentParagraphTitle }}</h3>
            <button @click="closeMobileDetails">{{ t('close') }}</button>
          </div>
          <section class="panel compact-panel">
            <div class="panel-label">{{ t('currentParagraph') }}</div>
            <h4 class="sheet-title">{{ currentParagraphLabel }}</h4>
            <p class="muted">{{ currentParagraphPreview }}</p>
          </section>
          <section class="panel compact-panel">
            <div class="panel-label">{{ t('translationStatus') }}</div>
            <template v-if="hasLiveTranslation(currentTranslation)">
              <p class="success-text">{{ t('translationCachedVia', { provider: currentTranslation?.providerKey ?? 'provider' }) }}</p>
              <p class="translation-summary">{{ currentTranslation?.translatedText }}</p>
            </template>
            <template v-else-if="currentTranslation?.status === 'failed'">
              <p class="error-text">{{ translationErrorText(currentTranslation) }}</p>
              <button v-if="canRetryTranslation(currentTranslation)" class="chip-button" @click="retryTranslation(currentParagraphId)">{{ t('retryTranslation') }}</button>
            </template>
            <p v-else class="muted">{{ isTranslationUnavailable(currentTranslation) || !translationProviderConfigured ? t('translationServiceUnavailable') : (currentTranslation?.status === 'translating' ? t('translationLoadingCurrent') : t('translationLoadingAround')) }}</p>
            <p class="muted small top-gap">{{ translationAvailabilityMessage }}</p>
          </section>
          <section class="panel compact-panel">
            <div class="panel-label">{{ t('highlightsAndTags') }}</div>
            <p class="muted">{{ currentParagraphHighlightSummary }}</p>
            <div class="chip-row top-gap">
              <button
                v-for="tag in currentParagraphTags"
                :key="tag.id"
                class="tag-chip tag-chip-button"
                @click="openTagReview(tag.id)"
              >
                {{ tag.name }}
              </button>
              <span v-if="currentParagraphTags.length === 0" class="muted small">{{ t('noTagsYet') }}</span>
            </div>
            <div v-if="currentParagraphReviewItems.length > 0" class="tag-review-list top-gap">
              <button
                v-for="item in currentParagraphReviewItems"
                :key="item.highlight.id"
                class="tag-review-item"
                @click="jumpToHighlightItem(item)"
              >
                <span class="tag-review-meta">{{ item.targetLabel }}</span>
                <span class="tag-review-snippet">{{ item.snippet }}</span>
              </button>
            </div>
            <div class="chip-row top-gap">
              <button class="chip-button" @click="toggleParagraphHighlight">
                {{ currentParagraphHighlighted ? t('removeParagraphHighlight') : t('highlightParagraph') }}
              </button>
              
              <button class="chip-button" @click="openStudyPanel('highlights')">{{ t('openMyStudy') }}</button>
            </div>
            <div class="sentence-card-section top-gap">
              <div class="sentence-card-label">{{ t('highlightColors') }}</div>
              <div class="color-swatches">
                <button
                  v-for="color in highlightColorOptions"
                  :key="`paragraph-${color}`"
                  :class="['color-swatch', { active: currentParagraphHighlightRecord?.color === color }]"
                  :style="{ '--swatch-color': color }"
                  @click="applyParagraphHighlightColor(color)"
                />
              </div>
            </div>
            <div v-if="!sentenceSelection" class="tag-editor-panel top-gap">
              <div class="sentence-card-label">{{ t('existingTags') }}</div>
              <div class="chip-row top-gap">
                <button
                  v-for="tag in highlightStore.tags"
                  :key="`mobile-tag-${tag.id}`"
                  :class="['tag-chip', 'tag-chip-button', { active: currentParagraphHighlightRecord ? isTagAttached(currentParagraphHighlightRecord.id, tag.id) : false }]"
                  @click="toggleExistingTag(tag.id)"
                >
                  {{ tag.name }}
                </button>
                <span v-if="highlightStore.tags.length === 0" class="muted small">{{ t('tagsEmpty') }}</span>
              </div>
              <div class="tag-editor compact-editor">
                <input v-model="tagInput" type="text" :placeholder="t('newTagOptional')" @keyup.enter="submitTagForCurrentTarget" />
                <button class="chip-button subtle-chip" @click="submitTagForCurrentTarget">{{ t('saveTag') }}</button>
              </div>
            </div>
            <p v-if="currentParagraphReviewItems.length === 0" class="muted small top-gap">{{ t('noHighlightsInParagraph') }}</p>
          </section>
        </section>
      </div>

      <div v-if="showStudyPanel" class="overlay" data-testid="study-panel-backdrop" @click="closeStudyPanel">
        <section :class="[isMobile ? 'sheet' : 'study-modal']" data-testid="study-panel" @click.stop>
          <div class="sheet-head">
            <h3>{{ t('myStudy') }}</h3>
            <button @click="closeStudyPanel">{{ t('close') }}</button>
          </div>
          <div class="study-tabs">
            <button :class="['study-tab', { active: studyView === 'highlights' }]" @click="openStudyPanel('highlights')">{{ t('highlights') }}</button>
            <button :class="['study-tab', { active: studyView === 'tags' }]" @click="openTagReview()">{{ t('tags') }}</button>
            <button :class="['study-tab', { active: studyView === 'recent' }]" @click="openStudyPanel('recent')">{{ t('recentlyRead') }}</button>
            <button :class="['study-tab', { active: studyView === 'vocab' }]" @click="openStudyPanel('vocab')">{{ t('vocab') }}</button>
          </div>
          <section v-if="studyView === 'highlights'" class="panel compact-panel">
            <div class="panel-label">{{ t('highlights') }}</div>
            <p class="muted">{{ t('highlightsReviewBody') }}</p>
            <div class="chip-row top-gap">
              <button class="chip-button subtle-chip" @click="exportHighlights('markdown')">{{ t('exportAsMarkdown') }}</button>
              <button class="chip-button subtle-chip" @click="exportHighlights('txt')">{{ t('exportAsTxt') }}</button>
            </div>
            <div class="tag-review-list top-gap">
              <button
                v-for="item in highlightReviewItems"
                :key="item.highlight.id"
                class="tag-review-item"
                @click="jumpToHighlightItem(item)"
              >
                <span class="tag-review-meta">{{ item.paragraphLabel }} / {{ item.targetLabel }}</span>
                <span class="tag-review-snippet">{{ item.snippet }}</span>
                <span v-if="item.tags.length > 0" class="chip-row top-gap">
                  <span v-for="tag in item.tags" :key="tag.id" class="tag-chip">{{ tag.name }}</span>
                </span>
              </button>
              <p v-if="highlightReviewItems.length === 0" class="muted small">{{ t('noHighlightsForDocument') }}</p>
            </div>
          </section>
          <section v-else-if="studyView === 'tags'" class="panel compact-panel">
            <div class="panel-label">{{ t('tags') }}</div>
            <p class="muted">{{ t('tagsReviewBody') }}</p>
            <div class="tag-review-groups top-gap">
              <button
                v-for="tag in tagReviewGroups"
                :key="tag.id"
                :class="['tag-review-button', { active: tag.id === activeReviewTag?.id }]"
                @click="selectReviewTag(tag.id)"
              >
                <span>{{ tag.name }}</span>
                <span>{{ tag.highlightCount }}</span>
              </button>
              <p v-if="tagReviewGroups.length === 0" class="muted small">{{ t('noTagsForDocument') }}</p>
            </div>
            <div v-if="tagReviewGroups.length > 0" class="tag-review-list top-gap">
              <button
                v-for="item in studyActiveReviewItems"
                :key="item.highlight.id"
                class="tag-review-item"
                @click="jumpToHighlightItem(item)"
              >
                <span class="tag-review-meta">{{ item.paragraphLabel }} / {{ item.targetLabel }}</span>
                <span class="tag-review-snippet">{{ item.snippet }}</span>
              </button>
              <p v-if="studyActiveReviewItems.length === 0" class="muted small">{{ t('noHighlightsLinkedToTag') }}</p>
            </div>
            <div v-if="activeReviewTag" class="chip-row top-gap">
              <button class="chip-button subtle-chip" @click="exportHighlights('markdown', activeReviewTag.id)">{{ t('exportAsMarkdown') }}</button>
              <button class="chip-button subtle-chip" @click="exportHighlights('txt', activeReviewTag.id)">{{ t('exportAsTxt') }}</button>
            </div>
          </section>
          <section v-else-if="studyView === 'vocab'" class="panel compact-panel">
            <div class="panel-label">{{ t('vocab') }}</div>
            <p class="muted">{{ t('vocabEmpty') }}</p>
            <div class="tag-review-list top-gap">
              <div
                v-for="entry in vocabStore.sortedEntries"
                :key="entry.id"
                class="vocab-entry"
              >
                <div class="vocab-entry-head">
                  <strong>{{ entry.word }}</strong>
                  <button class="chip-button subtle-chip" style="padding: 4px 8px; font-size: .8rem;" @click="removeVocabEntry(entry.id)">{{ t('vocabDeleteEntry') }}</button>
                </div>
                <p class="vocab-definition">{{ entry.definition }}</p>
                <p class="vocab-example muted small">"{{ entry.exampleSentence }}"</p>
                <p class="vocab-source muted small">{{ t('vocabEntryFrom', { title: entry.documentTitle }) }}</p>
              </div>
              <p v-if="vocabStore.sortedEntries.length === 0" class="muted small">{{ t('vocabEmpty') }}</p>
            </div>
          </section>
          <section v-else class="panel compact-panel">
            <div class="panel-label">{{ t('recentReviewTitle') }}</div>
            <p class="muted">{{ t('recentReviewBody') }}</p>
            <div class="tag-review-list top-gap">
              <button class="tag-review-item" @click="jumpToRecentlyRead">
                <span class="tag-review-meta">{{ t('savedAnchor') }}</span>
                <span class="tag-review-snippet">{{ recentlyReadSummary }}</span>
              </button>
            </div>
          </section>
        </section>
      </div>

      <footer ref="statusBarRef" :class="['status-bar', { mobile: isMobile }]" data-testid="status-bar">
        <span class="status-summary">{{ statusSummaryText }}</span>
        <span :class="['status-chip', primaryStatusTone]">{{ primaryStatusChip }}</span>
        <span v-if="secondaryStatusChip" :class="['status-chip', secondaryStatusTone]">{{ secondaryStatusChip }}</span>
      </footer>

      <div class="toast-stack">
        <div v-for="toast in toasts" :key="toast.id" :class="['toast', toast.tone]">{{ toast.message }}</div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch, type ComponentPublicInstance } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useWindowScroll, useWindowSize } from '@vueuse/core'
import NoteCard from '../components/NoteCard.vue'
import type { HighlightRecord, NoteRecord, ParagraphUnit, ReaderMode, SentenceTranslationRecord, SentenceUnit, TagRecord, TranslationRecord, UiLanguage } from '../domain/types'
import { deleteDocument } from '../services/storage'
import { usePreferencesStore } from '../stores/preferences'
import { getReaderCopy, getTranslationErrorCopy, localizeReaderLoadError } from '../utils/readerUi'
import { HIGHLIGHT_COLOR_OPTIONS, useHighlightStore } from '../stores/highlight'
import { useNoteStore } from '../stores/notes'
import { useReaderStore } from '../stores/reader'
import { useVocabStore } from '../stores/vocab'
import {
  appendReaderDebugSample,
  incrementReaderDebugCounter,
  isReaderDebugEnabled,
  mergeReaderDebugState,
  pushReaderDebugEvent
} from '../utils/debug'
import {
  buildInteractionFragments,
  type InteractionFragment
} from '../utils/readerInteractions'

interface ToastItem {
  id: number
  message: string
  tone: 'info' | 'success' | 'error'
}

interface StructureItem {
  id: string
  label: string
  meta: string
  targetParagraphId: string
  pageIndex: number
}

interface TagReviewGroup {
  id: string
  name: string
  highlightCount: number
}

interface ReviewHighlightItem {
  highlight: HighlightRecord
  paragraphLabel: string
  snippet: string
  tags: TagRecord[]
  targetLabel: string
}

interface SentenceCardSelection {
  paragraphId: string
  sentence: SentenceUnit
  fragment: InteractionFragment
  x: number
  y: number
}

interface SelectionRect {
  id: string
  left: number
  top: number
  width: number
  height: number
}

type StudyView = 'highlights' | 'tags' | 'recent' | 'vocab'

const route = useRoute()
const router = useRouter()
const readerStore = useReaderStore()
const highlightStore = useHighlightStore()
const noteStore = useNoteStore()
const preferencesStore = usePreferencesStore()
const vocabStore = useVocabStore()

const readerPageRef = ref<HTMLElement | null>(null)
const toolbarRef = ref<HTMLElement | null>(null)
const contentRef = ref<HTMLElement | null>(null)
const statusBarRef = ref<HTMLElement | null>(null)

const isMobile = ref(window.matchMedia('(max-width: 960px)').matches)
const searchQuery = ref('')
const showMoreMenu = ref(false)
const showTagEditor = ref(false)
const showMobileActionSheet = ref(false)
const showStructureDrawer = ref(false)
const showMobileDetails = ref(false)
const showRestoreBanner = ref(false)
const notePanelVisible = ref(true)
const restoreBannerParagraph = ref<number | null>(null)
const online = ref(window.navigator.onLine)
const { x: windowScrollX, y: windowScrollY } = useWindowScroll()
const { width: windowWidth, height: windowHeight } = useWindowSize()
const tagInput = ref('')
const sidebarTab = ref<'structure' | 'mystudy'>('structure')
const showStudyPanel = ref(false)
const studyView = ref<StudyView>('highlights')
const activeReviewTagId = ref<string | null>(null)
const sentenceSelection = ref<SentenceCardSelection | null>(null)
const selectionHighlightRects = ref<SelectionRect[]>([])
const sentenceCardMode = ref<'fragment' | 'sentence'>('fragment')
const showHighlightColorPanel = ref(false)
const toasts = ref<ToastItem[]>([])
const paragraphTrackingSuspendedUntil = ref(0)
const mediaQuery = window.matchMedia('(max-width: 960px)')
const fragmentElementMap = new Map<string, HTMLElement>()
const sentenceFragmentElementMap = new Map<string, Map<string, HTMLElement>>()

const uiLanguage = computed(() => preferencesStore.uiLanguage)
const debugEnabled = isReaderDebugEnabled()

function t(key: string, params: Record<string, number | string> = {}) {
  return getReaderCopy(uiLanguage.value, key, params)
}

function setUiLanguage(nextLanguage: UiLanguage) {
  void preferencesStore.setUiLanguage(nextLanguage)
}

function snapshotNodeState(name: string, element: HTMLElement | null) {
  if (!element) {
    return null
  }

  const styles = window.getComputedStyle(element)
  const rect = element.getBoundingClientRect()

  return {
    name,
    className: element.className,
    pointerEvents: styles.pointerEvents,
    position: styles.position,
    visibility: styles.visibility,
    opacity: styles.opacity,
    zIndex: styles.zIndex,
    overflow: styles.overflow,
    clientHeight: Math.round(element.clientHeight),
    scrollHeight: Math.round(element.scrollHeight),
    rect: {
      left: Math.round(rect.left),
      top: Math.round(rect.top),
      width: Math.round(rect.width),
      height: Math.round(rect.height)
    }
  }
}

function syncDebugState(reason: string) {
  if (!debugEnabled) {
    return
  }

  mergeReaderDebugState({
    reason,
    activeMobileLayer: activeMobileLayer.value,
    currentParagraphId: currentParagraphId.value,
    showMoreMenu: showMoreMenu.value,
    showMobileActionSheet: showMobileActionSheet.value,
    showStructureDrawer: showStructureDrawer.value,
    showMobileDetails: showMobileDetails.value,
    showStudyPanel: showStudyPanel.value,
    showTagEditor: showTagEditor.value,
    hasSentenceSelection: Boolean(sentenceSelection.value),
    toolbar: snapshotNodeState('toolbar', toolbarRef.value),
    content: snapshotNodeState('content', contentRef.value),
    statusBar: snapshotNodeState('statusBar', statusBarRef.value),
    page: snapshotNodeState('page', readerPageRef.value)
  })
}

function logMobileDebug(event: string, details: Record<string, unknown> = {}) {
  if (!isMobile.value) {
    return
  }

  if (debugEnabled) {
    pushReaderDebugEvent(event, details)
  }

  if (!import.meta.env.DEV) {
    return
  }

  console.debug('[ReaderMobile]', event, {
    layer: activeMobileLayer.value,
    paragraphId: currentParagraphId.value,
    mode: mode.value,
    hasSelection: Boolean(sentenceSelection.value),
    showTagEditor: showTagEditor.value,
    ...details
  })
}

function describePointerPath(event: Event) {
  return event
    .composedPath()
    .filter((node): node is HTMLElement => node instanceof HTMLElement)
    .slice(0, 6)
    .map(node => {
      const className =
        typeof node.className === 'string'
          ? node.className
              .trim()
              .split(/\s+/)
              .filter(Boolean)
              .slice(0, 2)
              .join('.')
          : ''

      return `${node.tagName.toLowerCase()}${node.id ? `#${node.id}` : ''}${className ? `.${className}` : ''}`
    })
    .join(' -> ')
}

function isParagraphTrackingSuspended() {
  return paragraphTrackingSuspendedUntil.value > Date.now()
}

let observer: IntersectionObserver | null = null
let longTaskObserver: PerformanceObserver | null = null
let selectionRefreshFrame: number | null = null
let paragraphTrackingReleaseTimer: number | null = null
let initialRestoreApplied = false

const documentId = computed(() => String(route.params.id))
const loading = computed(() => readerStore.loading)
const error = computed(() => readerStore.error)
const mode = computed(() => readerStore.mode)
const documentMeta = computed(() => readerStore.document)
const documentTitle = computed(() => readerStore.document?.title ?? t('untitledDocument'))
const paragraphs = computed(() => readerStore.paragraphs)
const currentParagraphId = computed(() => readerStore.currentParagraphId)
const currentParagraph = computed(() => readerStore.currentParagraph)
const cacheReady = computed(() => readerStore.isReadyForOffline)
const translationProviderConfigured = computed(() => readerStore.translationProviderConfigured)
const localizedPageError = computed(() => localizeReaderLoadError(uiLanguage.value, error.value))
const restoreBanner = computed(() =>
  restoreBannerParagraph.value ? t('restoredToParagraph', { paragraph: restoreBannerParagraph.value }) : ''
)
const currentTranslation = computed<TranslationRecord | null>(() =>
  currentParagraphId.value ? readerStore.translationForParagraph(currentParagraphId.value) : null
)
const currentTranslationReady = computed(
  () => currentTranslation.value?.status === 'translated' && currentTranslation.value?.source === 'provider'
)
const currentParagraphHighlights = computed<HighlightRecord[]>(() =>
  currentParagraph.value ? highlightStore.highlightsForParagraph(currentParagraph.value.id) : []
)
const currentParagraphTags = computed<TagRecord[]>(() =>
  currentParagraph.value ? highlightStore.tagsForParagraph(currentParagraph.value.id) : []
)
const recentlyReadParagraph = computed<ParagraphUnit | null>(() =>
  currentParagraphId.value
    ? paragraphs.value.find(paragraph => paragraph.id === currentParagraphId.value) ?? null
    : null
)
const currentParagraphHighlighted = computed(() =>
  currentParagraph.value ? Boolean(highlightStore.findHighlight(currentParagraph.value.id)) : false
)
const currentParagraphHighlightRecord = computed<HighlightRecord | null>(() =>
  currentParagraph.value ? highlightStore.findHighlight(currentParagraph.value.id) : null
)
const notesByParagraphId = computed(() => {
  const map = new Map<string, NoteRecord[]>()
  for (const note of noteStore.sortedNotes) {
    const notes = map.get(note.paragraphId) ?? []
    notes.push(note)
    map.set(note.paragraphId, notes)
  }
  return map
})
const selectedSentenceId = computed(() => sentenceSelection.value?.sentence.id ?? null)
const selectedParagraphId = computed(() => sentenceSelection.value?.paragraphId ?? null)
const selectedSentenceHighlightRecord = computed<HighlightRecord | null>(() =>
  selectedSentenceId.value ? highlightStore.findHighlight(selectedSentenceId.value) : null
)
const currentParagraphTitle = computed(() => {
  if (!currentParagraph.value) {
    return t('noParagraphSelected')
  }

  return t('paragraphTitle', {
    order: currentParagraph.value.order + 1,
    page: currentParagraph.value.pageIndex + 1
  })
})
const currentParagraphPreview = computed(() => currentParagraph.value?.preview ?? t('scrollForParagraphDetails'))
const currentParagraphLabel = computed(() => {
  if (!currentParagraph.value) {
    return t('noParagraphInView')
  }

  return t('paragraphLabel', {
    page: currentParagraph.value.pageIndex + 1,
    order: currentParagraph.value.order + 1,
    total: paragraphs.value.length
  })
})
const translationAvailabilityMessage = computed(() => {
  if (!cacheReady.value) {
    return t('documentNotCachedYet')
  }

  if (hasLiveTranslation(currentTranslation.value)) {
    return t('translationSavedOffline')
  }

  if (isTranslationUnavailable(currentTranslation.value) || !translationProviderConfigured.value) {
    return t('translationServiceUnavailable')
  }

  if (currentTranslation.value?.status === 'failed') {
    return online.value ? t('translationRetryWhenReady') : t('translationReconnectToRetry')
  }

  if (!online.value) {
    return t('translationNotCachedReconnect')
  }

  return t('translationWillBeCached')
})
const recentlyReadSummary = computed(() => {
  if (!recentlyReadParagraph.value) {
    return t('noSavedReadingPosition')
  }

  return t('paragraphLabelCompact', {
    page: recentlyReadParagraph.value.pageIndex + 1,
    order: recentlyReadParagraph.value.order + 1
  })
})
const highlightColorOptions = HIGHLIGHT_COLOR_OPTIONS as readonly string[]
const selectedParagraph = computed<ParagraphUnit | null>(() =>
  sentenceSelection.value
    ? paragraphs.value.find(paragraph => paragraph.id === sentenceSelection.value?.paragraphId) ?? null
    : null
)
const selectedParagraphLabel = computed(() => {
  if (!selectedParagraph.value) {
    return t('noParagraphInView')
  }

  return t('paragraphLabel', {
    page: selectedParagraph.value.pageIndex + 1,
    order: selectedParagraph.value.order + 1,
    total: paragraphs.value.length
  })
})
const sentenceSelectionStyle = computed(() => {
  if (!sentenceSelection.value) {
    return {}
  }

  // Bind to reactive scroll and resize to auto-update
  windowScrollX.value
  windowScrollY.value
  windowWidth.value
  windowHeight.value

  const element = fragmentElementMap.get(sentenceSelection.value.fragment.id)
  let targetLeft = sentenceSelection.value.x
  let targetTop = sentenceSelection.value.y

  if (element && element.isConnected) {
    const rect = element.getBoundingClientRect()
    // Default location: slightly below the clicked sentence
    targetLeft = rect.left
    targetTop = rect.bottom + 12
  }

  const innerW = windowWidth.value || window.innerWidth
  const innerH = windowHeight.value || window.innerHeight
  const isMob = isMobile.value
  const cardWidth = isMob ? (innerW - 20) : 380
  const cardHeightEst = isMob ? 380 : 400 // Estimate max-height for clipping calc

  if (isMob) {
    targetLeft = 10
  } else {
    // Avoid clipping on the right
    if (targetLeft + cardWidth > innerW - 24) {
      targetLeft = innerW - cardWidth - 24
    }
    targetLeft = Math.max(12, targetLeft)
  }

  const bottomSafeOffset = isMob ? 60 : 24
  const topSafeOffset = isMob ? 100 : 80

  // Avoid clipping on the bottom
  if (targetTop + cardHeightEst > innerH - bottomSafeOffset) {
    if (element) {
      const rect = element.getBoundingClientRect()
      targetTop = Math.max(topSafeOffset, rect.top - cardHeightEst - 12)
    } else {
      targetTop = Math.max(topSafeOffset, innerH - cardHeightEst - bottomSafeOffset)
    }
  }

  return {
    left: `${targetLeft}px`,
    top: `${targetTop}px`,
    width: isMob ? `${cardWidth}px` : '380px'
  }
})
const selectedSentenceSourceText = computed(() => {
  if (!sentenceSelection.value) {
    return ''
  }

  if (sentenceCardMode.value === 'sentence' || sentenceSelection.value.fragment.isWholeSentence) {
    return sentenceSelection.value.sentence.text
  }

  return sentenceSelection.value.fragment.text
})
const selectedSentenceTranslation = computed<SentenceTranslationRecord | null>(() =>
  selectedSentenceId.value ? readerStore.sentenceTranslationFor(selectedSentenceId.value) : null
)
const selectedSentenceMeaning = computed(() =>
  hasLiveTranslation(selectedSentenceTranslation.value) ? selectedSentenceTranslation.value?.translatedText ?? '' : ''
)
const selectedSentenceTranslationMessage = computed(() => {
  const record = selectedSentenceTranslation.value

  if (!cacheReady.value) {
    return t('documentNotCachedYet')
  }

  if (hasLiveTranslation(record)) {
    return t('translationSavedOffline')
  }

  if (isTranslationUnavailable(record) || !translationProviderConfigured.value) {
    return t('translationServiceUnavailable')
  }

  if (record?.status === 'failed') {
    return online.value ? t('translationRetryWhenReady') : t('translationReconnectToRetry')
  }

  if (record?.status === 'translating') {
    return t('translationLoadingCurrent')
  }

  if (!online.value) {
    return t('translationNotCachedReconnect')
  }

  return t('translationWillBeCached')
})
const structureItems = computed<StructureItem[]>(() => {
  const groups = new Map<number, ParagraphUnit[]>()

  for (const paragraph of paragraphs.value) {
    const group = groups.get(paragraph.pageIndex)
    if (group) {
      group.push(paragraph)
      continue
    }

    groups.set(paragraph.pageIndex, [paragraph])
  }

  return Array.from(groups.entries()).map(([pageIndex, pageParagraphs]) => {
    const firstParagraph = pageParagraphs[0]
    const lastParagraph = pageParagraphs[pageParagraphs.length - 1]
    const paragraphStart = firstParagraph.order + 1
    const paragraphEnd = lastParagraph.order + 1
    const paragraphRange =
      paragraphStart === paragraphEnd
        ? t('structureParagraphSingle', { start: paragraphStart })
        : t('structureParagraphRange', { start: paragraphStart, end: paragraphEnd })

    return {
      id: `page-${pageIndex + 1}`,
      label: t('structurePageLabel', { page: pageIndex + 1 }),
      meta: `${paragraphRange} / ${t('structureReadingUnits', { count: pageParagraphs.length })}`,
      targetParagraphId: firstParagraph.id,
      pageIndex
    }
  })
})

function paragraphLayoutClass(paragraph: ParagraphUnit) {
  return `paragraph-${paragraph.layoutRole || 'body'}`
}

function isLastParagraphOnPage(paragraphIndex: number) {
  const paragraph = paragraphs.value[paragraphIndex]
  const nextParagraph = paragraphs.value[paragraphIndex + 1]
  return Boolean(paragraph && (!nextParagraph || nextParagraph.pageIndex !== paragraph.pageIndex))
}

const tagReviewGroups = computed<TagReviewGroup[]>(() =>
  [...highlightStore.tags]
    .map(tag => ({
      id: tag.id,
      name: tag.name,
      highlightCount: tag.highlightIds.length
    }))
    .sort((left, right) => left.name.localeCompare(right.name))
)

const activeReviewTag = computed(() => {
  if (!activeReviewTagId.value) {
    return tagReviewGroups.value[0] ?? null
  }

  return tagReviewGroups.value.find(tag => tag.id === activeReviewTagId.value) ?? tagReviewGroups.value[0] ?? null
})

const highlightReviewItems = computed<ReviewHighlightItem[]>(() =>
  [...highlightStore.highlights]
    .map(highlight => buildReviewItem(highlight))
    .sort((left, right) => right.highlight.createdAt - left.highlight.createdAt)
)

const studyActiveReviewItems = computed<ReviewHighlightItem[]>(() => {
  if (!activeReviewTag.value) {
    return []
  }

  const tag = highlightStore.tags.find(item => item.id === activeReviewTag.value?.id)
  if (!tag) {
    return []
  }

  return tag.highlightIds
    .map(highlightId => highlightStore.highlights.find(highlight => highlight.id === highlightId) ?? null)
    .filter((highlight): highlight is HighlightRecord => Boolean(highlight))
    .map(highlight => buildReviewItem(highlight))
    .sort((left, right) => right.highlight.createdAt - left.highlight.createdAt)
})

const currentParagraphReviewItems = computed<ReviewHighlightItem[]>(() =>
  [...currentParagraphHighlights.value]
    .map(highlight => buildReviewItem(highlight))
    .sort((left, right) => right.highlight.createdAt - left.highlight.createdAt)
)
const activeMobileLayer = computed(() => {
  if (!isMobile.value) {
    return 'desktop'
  }

  if (showStudyPanel.value) {
    return 'study-panel'
  }

  if (showStructureDrawer.value) {
    return 'structure-drawer'
  }

  if (showMobileDetails.value) {
    return 'details-sheet'
  }

  if (showMobileActionSheet.value) {
    return 'action-sheet'
  }

  if (sentenceSelection.value) {
    return 'sentence-selection'
  }

  if (showMoreMenu.value) {
    return 'more-menu'
  }

  return 'reading'
})

const currentParagraphHighlightSummary = computed(() => {
  const total = currentParagraphHighlights.value.length
  const sentenceCount = currentParagraphHighlights.value.filter(highlight => highlight.targetType === 'sentence').length

  if (total === 0) {
    return t('noHighlightsInParagraph')
  }

  if (uiLanguage.value === 'zh-CN') {
    if (sentenceCount === 0) {
      return `�����ѱ��� ${total} �����伶������`
    }

    return `�����ѱ��� ${total} �����������а��� ${sentenceCount} �����Ӽ�������`
  }

  if (sentenceCount === 0) {
    return `${total} paragraph-level highlight${total === 1 ? '' : 's'} saved here.`
  }

  return `${total} highlight${total === 1 ? '' : 's'} saved here, including ${sentenceCount} sentence-level mark${sentenceCount === 1 ? '' : 's'}.`
})
const showMobilePrimaryAction = computed(
  () =>
    isMobile.value &&
    !sentenceSelection.value &&
    !showTagEditor.value &&
    !showMoreMenu.value &&
    !showStudyPanel.value &&
    !showStructureDrawer.value &&
    !showMobileDetails.value &&
    !showMobileActionSheet.value
)
const statusSummaryText = computed(() => {
  if (!cacheReady.value) {
    return t('notSavedYet')
  }

  if (mode.value === 'original') {
    return t('originalOfflineReady')
  }

  if (currentTranslationReady.value) {
    return t('translationOfflineReady')
  }

  if (isTranslationUnavailable(currentTranslation.value) || !translationProviderConfigured.value) {
    return t('translationUnavailableStatus')
  }

  if (currentTranslation.value?.status === 'failed') {
    return t('translationFailedStatus')
  }

  if (currentTranslation.value?.status === 'translating') {
    return t('translationLoadingStatus')
  }

  return online.value ? t('translationNotCachedYet') : t('translationOfflineUnavailable')
})
const primaryStatusChip = computed(() => (cacheReady.value ? t('savedToDevice') : t('notSavedYet')))
const primaryStatusTone = computed(() => (cacheReady.value ? 'active' : 'warning'))
const secondaryStatusChip = computed(() => {
  if (mode.value === 'original') {
    return null
  }

  if (currentTranslationReady.value) {
    return t('translationOfflineReady')
  }

  if (isTranslationUnavailable(currentTranslation.value) || !translationProviderConfigured.value) {
    return t('translationUnavailableInline')
  }

  if (currentTranslation.value?.status === 'failed') {
    return t('translationFailedStatus')
  }

  return online.value ? t('translationNotCachedYet') : t('translationOfflineUnavailable')
})
const secondaryStatusTone = computed(() => {
  if (!secondaryStatusChip.value) {
    return 'neutral'
  }

  if (currentTranslationReady.value) {
    return 'active'
  }

  if (isTranslationUnavailable(currentTranslation.value) || !translationProviderConfigured.value) {
    return 'warning'
  }

  if (currentTranslation.value?.status === 'failed') {
    return 'error'
  }

  return 'neutral'
})

function buildReviewItem(highlight: HighlightRecord): ReviewHighlightItem {
  const paragraph = paragraphs.value.find(item => item.id === highlight.paragraphId)
  const normalizedText = highlight.textSnapshot.replace(/\s+/g, ' ').trim()
  const snippet = normalizedText.length > 112 ? `${normalizedText.slice(0, 112).trim()}...` : normalizedText

  return {
    highlight,
    paragraphLabel: paragraph
      ? t('paragraphLabelCompact', {
          page: paragraph.pageIndex + 1,
          order: paragraph.order + 1
        })
      : t('unknownParagraph'),
    snippet,
    tags: highlightStore.tagsForHighlight(highlight.id),
    targetLabel: highlight.targetType === 'sentence' ? t('sentenceHighlightLabel') : t('paragraphHighlightLabel')
  }
}

function hasLiveTranslation(record: TranslationRecord | SentenceTranslationRecord | null | undefined) {
  return Boolean(record && record.status === 'translated' && record.source === 'provider' && record.translatedText.trim())
}

function isTranslationUnavailable(record: TranslationRecord | SentenceTranslationRecord | null | undefined) {
  return Boolean(record && (record.status === 'unavailable' || record.errorCode === 'provider_not_configured'))
}

function canRetryTranslation(record: TranslationRecord | SentenceTranslationRecord | null | undefined) {
  return Boolean(record && record.status === 'failed' && record.errorCode !== 'provider_not_configured')
}

function translationErrorText(record: TranslationRecord | SentenceTranslationRecord | null | undefined) {
  if (!record) {
    return t('translationFailedDefault')
  }

  return getTranslationErrorCopy(uiLanguage.value, record.errorCode ?? 'unknown', record.errorMessage)
}

function pushToast(message: string, tone: ToastItem['tone'] = 'info') {
  const id = Date.now() + Math.floor(Math.random() * 1000)
  toasts.value.push({ id, message, tone })
  window.setTimeout(() => {
    toasts.value = toasts.value.filter(toast => toast.id !== id)
  }, 2200)
}

function closeMobilePanels() {
  showMoreMenu.value = false
  showMobileActionSheet.value = false
  showStructureDrawer.value = false
  showMobileDetails.value = false
  showStudyPanel.value = false
  syncDebugState('close-mobile-panels')
}

function suspendParagraphTracking(reason: string, duration = 340) {
  paragraphTrackingSuspendedUntil.value = Date.now() + duration
  if (paragraphTrackingReleaseTimer !== null) {
    window.clearTimeout(paragraphTrackingReleaseTimer)
  }

  paragraphTrackingReleaseTimer = window.setTimeout(() => {
    paragraphTrackingReleaseTimer = null
    paragraphTrackingSuspendedUntil.value = 0
    logMobileDebug('paragraph-tracking:resume', { reason })
  }, duration)

  logMobileDebug('paragraph-tracking:suspend', { reason, duration })
}

function updateMobileLayoutMetrics(reason = 'layout-sync') {
  if (!readerPageRef.value) {
    return
  }

  const viewportHeight = Math.round(window.visualViewport?.height ?? window.innerHeight)
  const toolbarHeight = Math.round(toolbarRef.value?.offsetHeight ?? 0)
  const statusHeight = Math.round(statusBarRef.value?.offsetHeight ?? 0)
  const bottomOffset = statusHeight + (showMobilePrimaryAction.value ? 104 : 36)

  readerPageRef.value.style.setProperty('--rf-reader-viewport-height', `${viewportHeight}px`)
  readerPageRef.value.style.setProperty('--rf-toolbar-height', `${toolbarHeight}px`)
  readerPageRef.value.style.setProperty('--rf-status-height', `${statusHeight}px`)
  readerPageRef.value.style.setProperty('--rf-mobile-bottom-offset', `${bottomOffset}px`)
  appendReaderDebugSample('layoutMetrics', {
    reason,
    viewportHeight,
    toolbarHeight,
    statusHeight,
    bottomOffset
  })
  syncDebugState(reason)

  if (!import.meta.env.DEV || !isMobile.value) {
    return
  }

  const rootRect = readerPageRef.value.getBoundingClientRect()
  const contentRect = contentRef.value?.getBoundingClientRect() ?? null
  logMobileDebug('layout-metrics', {
    reason,
    viewportHeight,
    toolbarHeight,
    statusHeight,
    bottomOffset,
    rootHeight: Math.round(rootRect.height),
    contentHeight: contentRect ? Math.round(contentRect.height) : null
  })
}

function toggleMoreMenu() {
  const nextValue = !showMoreMenu.value
  if (nextValue && isMobile.value) {
    closeMobilePanels()
  }

  showMoreMenu.value = nextValue
  pushReaderDebugEvent('toolbar:toggle-more-menu', { open: showMoreMenu.value, mobile: isMobile.value })
  syncDebugState('toggle-more-menu')
  logMobileDebug('menu-toggle', { open: showMoreMenu.value })
}

function openMobileActionSheet() {
  showMoreMenu.value = false
  closeMobilePanels()
  showMobileActionSheet.value = true
  pushReaderDebugEvent('mobile:open-action-sheet')
  updateMobileLayoutMetrics('open-action-sheet')
}

function closeMobileActionSheet() {
  showMobileActionSheet.value = false
  pushReaderDebugEvent('mobile:close-action-sheet')
  updateMobileLayoutMetrics('close-action-sheet')
}

function closeStructureDrawer() {
  showStructureDrawer.value = false
  pushReaderDebugEvent('mobile:close-structure-drawer')
  updateMobileLayoutMetrics('close-structure-drawer')
}

function closeMobileDetails() {
  showMobileDetails.value = false
  pushReaderDebugEvent('mobile:close-details-sheet')
  updateMobileLayoutMetrics('close-details-sheet')
}

function registerFragmentElement(sentenceId: string, fragmentId: string, element: Element | ComponentPublicInstance | null) {
  fragmentElementMap.delete(fragmentId)

  const existingGroup = sentenceFragmentElementMap.get(sentenceId)
  if (existingGroup) {
    existingGroup.delete(fragmentId)
    if (existingGroup.size === 0) {
      sentenceFragmentElementMap.delete(sentenceId)
    }
  }

  if (!(element instanceof HTMLElement)) {
    return
  }

  fragmentElementMap.set(fragmentId, element)
  const nextGroup = sentenceFragmentElementMap.get(sentenceId) ?? new Map<string, HTMLElement>()
  nextGroup.set(fragmentId, element)
  sentenceFragmentElementMap.set(sentenceId, nextGroup)
}

function refreshSelectionGeometry() {
  if (!sentenceSelection.value) {
    selectionHighlightRects.value = []
    return
  }
  selectionHighlightRects.value = []
}

function scheduleSelectionRefresh() {
  if (selectionRefreshFrame !== null) {
    window.cancelAnimationFrame(selectionRefreshFrame)
  }

  selectionRefreshFrame = window.requestAnimationFrame(() => {
    selectionRefreshFrame = null
    refreshSelectionGeometry()
  })
}

function resetSelection() {
  sentenceSelection.value = null
  selectionHighlightRects.value = []
  sentenceCardMode.value = 'fragment'
  showTagEditor.value = false
  showHighlightColorPanel.value = false
  pushReaderDebugEvent('selection:reset')
  updateMobileLayoutMetrics('reset-selection')
}

async function loadReader() {
  await readerStore.loadDocument(documentId.value)
  await highlightStore.loadForDocument(documentId.value)
  await noteStore.loadForDocument(documentId.value)
  await vocabStore.load()
  await nextTick()
  updateMobileLayoutMetrics('load-reader-ready')
  setupObserver()

  if (readerStore.restoreTargetParagraphNumber && readerStore.currentParagraphId) {
    restoreBannerParagraph.value = readerStore.restoreTargetParagraphNumber
    if (!isMobile.value) {
      showRestoreBanner.value = true
      window.setTimeout(() => {
        showRestoreBanner.value = false
      }, 2600)
    }

    initialRestoreApplied = true
    scrollToParagraph(readerStore.currentParagraphId, 'auto', 'initial-restore')
    return
  }

  if (readerStore.currentParagraphId) {
    initialRestoreApplied = true
    scrollToParagraph(readerStore.currentParagraphId, 'auto', 'initial-anchor')
  }
}

function setupObserver() {
  observer?.disconnect()
  observer = new IntersectionObserver(
    entries => {
      incrementReaderDebugCounter('intersectionObserverCallbacks')
      appendReaderDebugSample('intersectionObserver', {
        entries: entries.length,
        activeLayer: activeMobileLayer.value
      })
      const current = entries
        .filter(entry => entry.isIntersecting)
        .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0]

      const target = current?.target as HTMLElement | undefined
      if (!target?.id || target.id === readerStore.currentParagraphId || isParagraphTrackingSuspended()) {
        return
      }

      void readerStore.setCurrentParagraph(target.id)
    },
    { root: null, threshold: [0.25, 0.55, 0.85] }
  )

  window.document.querySelectorAll<HTMLElement>('.paragraph').forEach(node => observer?.observe(node))
}

function scrollToParagraph(paragraphId: string, behavior: ScrollBehavior = 'smooth', reason = 'programmatic-scroll') {
  const target = window.document.getElementById(paragraphId)
  if (!target) {
    return
  }

  suspendParagraphTracking(reason)
  pushReaderDebugEvent('scroll-to-paragraph', { paragraphId, behavior, reason })
  target.scrollIntoView({
    block: isMobile.value ? 'start' : 'center',
    inline: 'nearest',
    behavior
  })
  window.requestAnimationFrame(() => {
    updateMobileLayoutMetrics(`${reason}:after-scroll`)
  })
}

function isStructureItemActive(item: StructureItem) {
  return currentParagraph.value?.pageIndex === item.pageIndex
}

function selectStructureItem(paragraphId: string) {
  closeMobilePanels()
  void readerStore.setCurrentParagraph(paragraphId)
  scrollToParagraph(paragraphId, 'smooth', 'structure-select')
}

function jumpToRecentlyRead() {
  if (!recentlyReadParagraph.value) {
    pushToast(t('noSavedReadingPosition'), 'info')
    return
  }

  void readerStore.setCurrentParagraph(recentlyReadParagraph.value.id)
  scrollToParagraph(recentlyReadParagraph.value.id, 'smooth', 'recently-read')
  pushToast(t('returnedToReadingAnchor', { summary: recentlyReadSummary.value }), 'info')
}

function handleSearch() {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) {
    return
  }

  const target = paragraphs.value.find(paragraph => paragraph.text.toLowerCase().includes(query))
  if (!target) {
    pushToast(t('noParagraphMatchedSearch'), 'error')
    return
  }

  void readerStore.setCurrentParagraph(target.id)
  scrollToParagraph(target.id, 'smooth', 'search')
  pushToast(t('jumpedToParagraph', { paragraph: target.order + 1 }), 'info')
}

function selectSentenceFragment(
  paragraph: ParagraphUnit,
  sentence: ParagraphUnit['sentences'][number],
  _sentenceIndex: number,
  fragment: InteractionFragment,
  event: PointerEvent | MouseEvent | KeyboardEvent
) {
  incrementReaderDebugCounter('sentenceFragmentClicks')
  if (sentenceSelection.value?.fragment.id === fragment.id) {
    scheduleSelectionRefresh()
    return
  }

  sentenceSelection.value = {
    paragraphId: paragraph.id,
    sentence,
    fragment,
    x: Math.max(12, Math.round('clientX' in event ? event.clientX || 12 : 12)),
    y: Math.max(80, Math.round('clientY' in event ? event.clientY || 80 : 80))
  }
  sentenceCardMode.value = fragment.isWholeSentence ? 'sentence' : 'fragment'
  showTagEditor.value = false
  showHighlightColorPanel.value = false
  closeMobilePanels()
  pushReaderDebugEvent('sentence:select-fragment', {
    paragraphId: paragraph.id,
    sentenceId: sentence.id,
    fragmentId: fragment.id,
    fragmentText: fragment.text
  })
  void readerStore.ensureSentenceTranslation(sentence.id)
  nextTick(() => {
    scheduleSelectionRefresh()
  })
}


function toggleSentenceCardMode() {
  if (!sentenceSelection.value || sentenceSelection.value.fragment.isWholeSentence) {
    return
  }

  sentenceCardMode.value = sentenceCardMode.value === 'sentence' ? 'fragment' : 'sentence'
}

function isSentenceHighlighted(sentenceId: string) {
  return Boolean(highlightStore.findHighlight(sentenceId))
}

function isParagraphHighlighted(paragraphId: string) {
  return Boolean(highlightStore.findHighlight(paragraphId))
}

function translationFor(paragraphId: string) {
  return readerStore.translationForParagraph(paragraphId)
}

function getSentenceFragments(sentence: ParagraphUnit['sentences'][number]) {
  return buildInteractionFragments(sentence.id, sentence.text)
}

function paragraphHighlightStyle(paragraphId: string) {
  const highlight = highlightStore.findHighlight(paragraphId)
  return highlight ? { '--paragraph-highlight-color': highlight.color } : {}
}

function sentenceHighlightStyle(sentenceId: string) {
  const highlight = highlightStore.findHighlight(sentenceId)
  return highlight ? { '--sentence-highlight-color': highlight.color } : {}
}

function notesForParagraph(paragraphId: string) {
  return notesByParagraphId.value.get(paragraphId) ?? []
}

function tagsForNote(note: NoteRecord) {
  return note.highlightId ? highlightStore.tagsForHighlight(note.highlightId) : []
}

function setMode(nextMode: ReaderMode) {
  pushReaderDebugEvent('toolbar:set-mode', { nextMode, previousMode: mode.value })
  readerStore.setMode(nextMode)
  resetSelection()
  if (readerStore.currentParagraphId) {
    void readerStore.ensureTranslationsAround(readerStore.currentParagraphId)
  }
}

function toggleSelectedSentenceHighlight() {
  if (!selectedSentenceId.value || !selectedParagraphId.value) {
    return
  }

  highlightStore.ensureSentenceHighlight(
    documentId.value,
    selectedParagraphId.value,
    selectedSentenceId.value,
    sentenceSelection.value?.sentence.text ?? selectedSentenceSourceText.value
  )
  showHighlightColorPanel.value = !showHighlightColorPanel.value
  if (showHighlightColorPanel.value) {
    showTagEditor.value = false
  }
}

async function createNoteFromSelection() {
  if (!sentenceSelection.value) {
    return
  }

  const paragraph = paragraphs.value.find(item => item.id === sentenceSelection.value?.paragraphId)
  if (!paragraph) {
    return
  }

  const sentence = sentenceSelection.value.sentence
  const highlight = highlightStore.ensureSentenceHighlight(
    documentId.value,
    paragraph.id,
    sentence.id,
    sentence.text
  )
  const translation = readerStore.sentenceTranslationFor(sentence.id) ?? await readerStore.ensureSentenceTranslation(sentence.id)

  await noteStore.createForSentence({
    documentId: documentId.value,
    documentTitle: documentTitle.value,
    paragraph,
    sentence,
    highlightId: highlight?.id ?? null,
    translation
  })

  pushToast('已加入学习笔记。', 'success')
  if (isMobile.value) {
    resetSelection()
  }
}

async function saveNote(note: NoteRecord, payload: { translationText: string; userNote: string }) {
  if (note.translationText === payload.translationText && note.userNote === payload.userNote) {
    return
  }

  await noteStore.updateNote(note.id, payload)
  pushToast('笔记已保存。', 'success')
}

function addTagToNote(note: NoteRecord, name: string) {
  if (!note.highlightId) {
    return
  }

  highlightStore.addTag(documentId.value, name, note.highlightId)
}

function removeTagFromNote(note: NoteRecord, tagId: string) {
  if (!note.highlightId) {
    return
  }

  highlightStore.detachTagFromHighlight(documentId.value, note.highlightId, tagId)
}

async function deleteNote(note: NoteRecord) {
  const deleted = await noteStore.deleteNote(note.id)
  if (!deleted) {
    return
  }

  if (deleted.highlightId && highlightStore.tagsForHighlight(deleted.highlightId).length === 0) {
    highlightStore.removeHighlight(documentId.value, deleted.highlightId)
  }

  pushToast('笔记已删除。', 'info')
}

function toggleParagraphHighlight() {
  if (!currentParagraph.value) {
    return
  }

  highlightStore.toggleParagraphHighlight(documentId.value, currentParagraph.value.id, currentParagraph.value.text)
  if (!highlightStore.findHighlight(currentParagraph.value.id)) {
    showTagEditor.value = false
  }
}

function applyParagraphHighlightColor(color: string) {
  if (!currentParagraph.value) {
    return
  }

  const highlight = highlightStore.ensureParagraphHighlight(
    documentId.value,
    currentParagraph.value.id,
    currentParagraph.value.text,
    color
  )
  if (highlight) {
    highlightStore.setHighlightColor(documentId.value, highlight.id, color)
  }
}

function openTagEditorFromSelection() {
  closeMobilePanels()
  showTagEditor.value = !showTagEditor.value
  if (showTagEditor.value) {
    showHighlightColorPanel.value = false
  }
  tagInput.value = ''
  updateMobileLayoutMetrics('open-tag-editor-from-selection')
}



function openStructureDrawerFromActions() {
  closeMobilePanels()
  showStructureDrawer.value = true
  pushReaderDebugEvent('mobile:open-structure-drawer')
  updateMobileLayoutMetrics('open-structure-drawer')
}

function openStudyPanelFromActions() {
  openStudyPanel('highlights')
}

function openMobileDetailsFromActions() {
  closeMobilePanels()
  showMobileDetails.value = true
  pushReaderDebugEvent('mobile:open-details-sheet')
  updateMobileLayoutMetrics('open-details-sheet')
}

function openStudyPanel(view: StudyView, tagId: string | null = null) {
  studyView.value = view
  closeMobilePanels()
  showStudyPanel.value = true
  pushReaderDebugEvent('study:open-panel', { view, tagId })

  if (view === 'tags') {
    activeReviewTagId.value = tagId ?? activeReviewTag.value?.id ?? tagReviewGroups.value[0]?.id ?? null
  } else {
    activeReviewTagId.value = null
  }

  updateMobileLayoutMetrics('open-study-panel')
}

function closeStudyPanel() {
  showStudyPanel.value = false
  pushReaderDebugEvent('study:close-panel')
  updateMobileLayoutMetrics('close-study-panel')
}

function openTagReview(tagId: string | null = null) {
  openStudyPanel('tags', tagId)
}

function selectReviewTag(tagId: string) {
  studyView.value = 'tags'
  closeMobilePanels()
  showStudyPanel.value = true
  activeReviewTagId.value = tagId
  updateMobileLayoutMetrics('select-review-tag')
}

function submitTagForCurrentTarget() {
  const name = tagInput.value.trim()
  if (!name) {
    return
  }

  if (selectedSentenceId.value && selectedParagraphId.value) {
    const highlight = highlightStore.ensureSentenceHighlight(
      documentId.value,
      selectedParagraphId.value,
      selectedSentenceId.value,
      sentenceSelection.value?.sentence.text ?? selectedSentenceSourceText.value
    )
    if (highlight) {
      highlightStore.addTag(documentId.value, name, highlight.id)
    }
  } else if (currentParagraph.value) {
    const highlight = highlightStore.ensureParagraphHighlight(
      documentId.value,
      currentParagraph.value.id,
      currentParagraph.value.text
    )
    if (highlight) {
      highlightStore.addTag(documentId.value, name, highlight.id)
    }
  }

  tagInput.value = ''
  if (isMobile.value && selectedSentenceId.value) {
    resetSelection()
  }
}

async function copySelectedSentence() {
  if (!selectedSentenceSourceText.value) {
    return
  }

  try {
    await navigator.clipboard.writeText(selectedSentenceSourceText.value)
    if (isMobile.value) {
      resetSelection()
    }
  } catch {
    pushToast(t('copyUnavailable'), 'error')
  }
}

async function retryTranslation(paragraphId: string | null) {
  if (!paragraphId) {
    return
  }

  await readerStore.ensureTranslation(paragraphId, true)
  pushToast(t('translationRetried'), 'info')
}

async function retrySentenceTranslation() {
  if (!selectedSentenceId.value) {
    return
  }

  await readerStore.ensureSentenceTranslation(selectedSentenceId.value, true)
  pushToast(t('sentenceTranslationRetried'), 'info')
}

async function removeVocabEntry(id: string) {
  await vocabStore.removeEntry(id)
}

function buildExportMarkdown(highlights: HighlightRecord[], tagFilter: string | null): string {
  const title = documentTitle.value
  const date = new Date().toISOString().slice(0, 10)
  const tagName = tagFilter
    ? highlightStore.tags.find(tag => tag.id === tagFilter)?.name ?? tagFilter
    : null

  const header = tagName
    ? `# ${title} — 高亮摘录（标签：${tagName}）\n\n> 导出时间：${date}\n\n---\n\n`
    : `# ${title} — 高亮摘录\n\n> 导出时间：${date}\n\n---\n\n`

  const items = highlights.map(hl => {
    const paragraph = paragraphs.value.find(p => p.id === hl.paragraphId)
    const location = paragraph
      ? `P${paragraph.pageIndex + 1} · 段落 ${paragraph.order + 1}`
      : '未知位置'
    const tags = highlightStore.tagsForHighlight(hl.id)
    const tagLine = tags.length > 0 ? `**标签**: ${tags.map(t => t.name).join(', ')}\n\n` : ''
    return `### ${location}\n\n${hl.textSnapshot}\n\n${tagLine}`
  })

  return header + items.join('---\n\n')
}

function buildExportTxt(highlights: HighlightRecord[], tagFilter: string | null): string {
  const title = documentTitle.value
  const date = new Date().toISOString().slice(0, 10)
  const tagName = tagFilter
    ? highlightStore.tags.find(tag => tag.id === tagFilter)?.name ?? tagFilter
    : null

  const header = tagName
    ? `${title} — 高亮摘录（标签：${tagName}）\n导出时间：${date}\n${'='.repeat(40)}\n\n`
    : `${title} — 高亮摘录\n导出时间：${date}\n${'='.repeat(40)}\n\n`

  const items = highlights.map(hl => {
    const paragraph = paragraphs.value.find(p => p.id === hl.paragraphId)
    const location = paragraph
      ? `[P${paragraph.pageIndex + 1} · 段落 ${paragraph.order + 1}]`
      : '[未知位置]'
    const tags = highlightStore.tagsForHighlight(hl.id)
    const tagLine = tags.length > 0 ? `标签: ${tags.map(t => t.name).join(', ')}\n` : ''
    return `${location}\n${hl.textSnapshot}\n${tagLine}`
  })

  return header + items.join('\n' + '-'.repeat(40) + '\n\n')
}

function triggerDownload(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

function exportHighlights(format: 'markdown' | 'txt', tagFilter: string | null = null) {
  let highlights = [...highlightStore.highlights]

  if (tagFilter) {
    const tag = highlightStore.tags.find(t => t.id === tagFilter)
    if (tag) {
      highlights = highlights.filter(hl => tag.highlightIds.includes(hl.id))
    }
  }

  if (highlights.length === 0) {
    pushToast(t('noHighlightsToExport'), 'error')
    return
  }

  const slug = documentTitle.value.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]+/g, '-').slice(0, 40)
  const date = new Date().toISOString().slice(0, 10)

  if (format === 'markdown') {
    const content = buildExportMarkdown(highlights, tagFilter)
    triggerDownload(content, `${slug}-highlights-${date}.md`, 'text/markdown;charset=utf-8')
  } else {
    const content = buildExportTxt(highlights, tagFilter)
    triggerDownload(content, `${slug}-highlights-${date}.txt`, 'text/plain;charset=utf-8')
  }

  pushToast(t('exportDone'), 'success')
}

function jumpToHighlightItem(item: ReviewHighlightItem) {
  resetSelection()
  closeMobilePanels()

  void readerStore.setCurrentParagraph(item.highlight.paragraphId)
  scrollToParagraph(item.highlight.paragraphId, 'smooth', 'highlight-review')
  pushToast(t('returnedToReadingAnchor', { summary: item.paragraphLabel }), 'info')
}

function applySentenceHighlightColor(color: string) {
  if (!selectedSentenceId.value || !selectedParagraphId.value) {
    return
  }

  const highlight = highlightStore.ensureSentenceHighlight(
    documentId.value,
    selectedParagraphId.value,
    selectedSentenceId.value,
    sentenceSelection.value?.sentence.text ?? selectedSentenceSourceText.value,
    color
  )
  if (highlight) {
    highlightStore.setHighlightColor(documentId.value, highlight.id, color)
  }
}

function isTagAttached(highlightId: string, tagId: string) {
  return highlightStore.tagsForHighlight(highlightId).some(tag => tag.id === tagId)
}

function ensureCurrentTagTarget() {
  if (selectedSentenceId.value && selectedParagraphId.value) {
    return highlightStore.ensureSentenceHighlight(
      documentId.value,
      selectedParagraphId.value,
      selectedSentenceId.value,
      sentenceSelection.value?.sentence.text ?? selectedSentenceSourceText.value
    )
  }

  if (currentParagraph.value) {
    return highlightStore.ensureParagraphHighlight(
      documentId.value,
      currentParagraph.value.id,
      currentParagraph.value.text
    )
  }

  return null
}

function toggleExistingTag(tagId: string) {
  const highlight = ensureCurrentTagTarget()
  if (!highlight) {
    return
  }

  highlightStore.toggleTagForHighlight(documentId.value, highlight.id, tagId)
}

function handleDocumentPointerDown(event: PointerEvent) {
  const target = event.target as HTMLElement | null
  const hitTarget =
    target && typeof event.clientX === 'number' && typeof event.clientY === 'number'
      ? window.document.elementFromPoint(event.clientX, event.clientY)
      : null

  if (debugEnabled) {
    pushReaderDebugEvent('pointerdown', {
      target: target?.tagName.toLowerCase() ?? null,
      hitTarget:
        hitTarget instanceof HTMLElement
          ? `${hitTarget.tagName.toLowerCase()}.${hitTarget.className || ''}`.trim()
          : null,
      x: Math.round(event.clientX),
      y: Math.round(event.clientY),
      path: describePointerPath(event)
    })
  }

  if (
    !target ||
    target.closest('button') ||
    target.closest('input') ||
    target.closest('label') ||
    target.closest('.toolbar') ||
    target.closest('.sidebar') ||
    target.closest('.details') ||
    target.closest('.panel') ||
    target.closest('.status-bar') ||
    target.closest('.sentence-fragment') ||
    target.closest('.sentence-card') ||
    target.closest('.menu') ||
    target.closest('.mobile-fab') ||
    target.closest('.drawer') ||
    target.closest('.sheet') ||
    target.closest('.study-modal')
  ) {
    return
  }

  if (isMobile.value) {
    logMobileDebug('pointerdown-outside-layer', {
      target: target.tagName.toLowerCase(),
      path: describePointerPath(event)
    })
  }

  window.setTimeout(() => {
    closeMobilePanels()
    resetSelection()
  }, 0)
}

function goBack() {
  router.push('/')
}

async function deleteCurrentDocument() {
  const confirmed = window.confirm(t('deleteDocumentConfirm'))
  if (!confirmed) {
    return
  }

  await deleteDocument(documentId.value)
  router.push('/')
}

function handleMediaChange(event: MediaQueryListEvent) {
  isMobile.value = event.matches
  if (!event.matches) {
    closeMobilePanels()
  }

  updateMobileLayoutMetrics('media-change')
  scheduleSelectionRefresh()
}

function handleContentScroll() {
  showMoreMenu.value = false
  if (showMobileActionSheet.value) {
    showMobileActionSheet.value = false
  }
  scheduleSelectionRefresh()
}

function handlePageScroll() {
  handleContentScroll()
}

function handleViewportGeometryChange() {
  updateMobileLayoutMetrics('viewport-change')
  scheduleSelectionRefresh()
}

function handleOnline() {
  online.value = true
}

function handleOffline() {
  online.value = false
}

watch(
  () => currentParagraphId.value,
  paragraphId => {
    if (paragraphId) {
      pushReaderDebugEvent('reader:current-paragraph-change', {
        paragraphId,
        restored: initialRestoreApplied,
        mode: mode.value
      })
      logMobileDebug('current-paragraph-change', {
        paragraphId,
        restored: initialRestoreApplied
      })
      void readerStore.ensureTranslationsAround(paragraphId)
    }
  }
)

watch(
  () => selectedSentenceId.value,
  sentenceId => {
    if (!sentenceId) {
      showTagEditor.value = false
      showHighlightColorPanel.value = false
      selectionHighlightRects.value = []
      return
    }

    pushReaderDebugEvent('selection:sentence-change', { sentenceId })
    void readerStore.ensureSentenceTranslation(sentenceId)
    nextTick(() => {
      refreshSelectionGeometry()
    })
  }
)

watch(
  () => [sentenceSelection.value?.fragment.id, sentenceCardMode.value, showTagEditor.value, showHighlightColorPanel.value, uiLanguage.value],
  () => {
    if (!sentenceSelection.value) {
      return
    }

    nextTick(() => {
      refreshSelectionGeometry()
    })
  }
)

watch(
  () => readerStore.mode,
  nextMode => {
    updateMobileLayoutMetrics('mode-change')
    if (nextMode === 'translation' && readerStore.currentParagraphId) {
      void readerStore.ensureTranslationsAround(readerStore.currentParagraphId)
    }
  }
)

watch(
  () => [activeMobileLayer.value, showMobilePrimaryAction.value, showTagEditor.value],
  () => {
    updateMobileLayoutMetrics('mobile-layer-change')
    logMobileDebug('mobile-layer-change')
  }
)

onMounted(async () => {
  if (debugEnabled && 'PerformanceObserver' in window && PerformanceObserver.supportedEntryTypes?.includes('longtask')) {
    longTaskObserver = new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        appendReaderDebugSample('longTasks', {
          name: entry.name,
          startTime: Math.round(entry.startTime),
          duration: Math.round(entry.duration)
        })
      }
    })
    longTaskObserver.observe({ entryTypes: ['longtask'] })
  }

  mediaQuery.addEventListener('change', handleMediaChange)
  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)
  window.addEventListener('resize', handleViewportGeometryChange, { passive: true })
  window.addEventListener('scroll', handlePageScroll, { passive: true })
  window.addEventListener('pointerdown', handleDocumentPointerDown)
  window.visualViewport?.addEventListener('resize', handleViewportGeometryChange)
  window.visualViewport?.addEventListener('scroll', handleViewportGeometryChange)
  await preferencesStore.loadSettings()
  await loadReader()
  updateMobileLayoutMetrics('mounted')
  syncDebugState('mounted')
})

onBeforeUnmount(() => {
  mediaQuery.removeEventListener('change', handleMediaChange)
  window.removeEventListener('online', handleOnline)
  window.removeEventListener('offline', handleOffline)
  window.removeEventListener('resize', handleViewportGeometryChange)
  window.removeEventListener('scroll', handlePageScroll)
  window.removeEventListener('pointerdown', handleDocumentPointerDown)
  window.visualViewport?.removeEventListener('resize', handleViewportGeometryChange)
  window.visualViewport?.removeEventListener('scroll', handleViewportGeometryChange)
  longTaskObserver?.disconnect()
  if (selectionRefreshFrame !== null) {
    window.cancelAnimationFrame(selectionRefreshFrame)
  }
  if (paragraphTrackingReleaseTimer !== null) {
    window.clearTimeout(paragraphTrackingReleaseTimer)
  }
  window.speechSynthesis?.cancel()
  observer?.disconnect()
})
</script>

<style scoped>
.reader-page { display: flex; flex-direction: column; min-height: var(--rf-reader-viewport-height, 100dvh); padding: 18px; }
.kicker, .panel-label { margin: 0 0 8px; color: var(--rf-primary); font-size: 12px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; }
.state-card, .panel, .toolbar, .content, .banner, .status-bar, .study-modal { border: 1px solid var(--rf-border-strong); background: var(--rf-surface); box-shadow: var(--rf-shadow); }
.state-card { margin: auto; max-width: 520px; padding: 40px; border-radius: 24px; }
.state-card h1 { margin: 0; font-size: 2rem; }
.toolbar { position: sticky; top: 0; z-index: 20; display: grid; grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr); gap: 18px; align-items: center; padding: 14px 18px; border-radius: 22px; background: rgba(26, 26, 26, .94); backdrop-filter: blur(12px); }
.toolbar.mobile { display: flex; flex-direction: column; gap: 10px; padding: calc(10px + env(safe-area-inset-top)) 12px 10px; border-radius: 0 0 18px 18px; border-left: none; border-right: none; border-top: none; background: rgba(26, 26, 26, .96); box-shadow: 0 8px 28px rgba(0, 0, 0, .28); }
.toolbar-group { display: flex; align-items: center; gap: 12px; }
.toolbar-group.center { justify-content: center; }
.toolbar-group.end { justify-content: end; position: relative; }
.mobile-topbar { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 10px; align-items: center; width: 100%; }
.mobile-title-block { min-width: 0; gap: 1px; }
.mobile-trailing-controls { display: flex; align-items: center; justify-self: end; gap: 8px; }
.lang-switch { display: inline-flex; align-items: center; padding: 3px; border: 1px solid var(--rf-border-strong); border-radius: 999px; background: var(--rf-surface-alt); }
.lang-button { border: none; border-radius: 999px; background: transparent; color: var(--rf-text-muted); padding: 7px 10px; font-size: .8rem; }
.lang-button:hover { background: var(--rf-hover); color: var(--rf-text); }
.lang-button.active { background: var(--rf-primary); color: #ffffff; }
.mobile-menu-anchor { position: relative; }
.mobile-nav-button { padding: 7px 11px; font-size: .88rem; }
.mobile-mode-strip { width: 100%; }
.toolbar.mobile .lang-button { padding: 6px 9px; font-size: .78rem; }
.ghost-button, .chip-button, .mode-button, .menu button { border: 1px solid var(--rf-border-strong); border-radius: 999px; background: var(--rf-button-bg); color: var(--rf-text); padding: 9px 14px; }
.ghost-button:hover, .chip-button:hover, .mode-button:hover, .menu button:hover { background: var(--rf-button-hover); }
.ghost-button:active, .chip-button:active, .mode-button:active, .menu button:active { background: var(--rf-button-active); }
.mode-switch { display: inline-flex; padding: 4px; border: 1px solid var(--rf-border-strong); border-radius: 999px; background: var(--rf-surface-alt); }
.mobile-mode-switch { display: flex; width: 100%; padding: 3px; }
.mobile-mode-switch .mode-button { flex: 1; padding: 9px 0; font-size: .9rem; }
.mode-button { border: none; background: transparent; color: var(--rf-text-muted); }
.mode-button.active { background: var(--rf-primary); color: #ffffff; }
.title-block { display: flex; flex-direction: column; gap: 2px; }
.brand { font-size: .8rem; letter-spacing: .14em; text-transform: uppercase; color: var(--rf-primary); }
.title { font-weight: 600; }
.title.mobile { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: .98rem; }
.search-box input, .tag-editor input { padding: 10px 12px; border: 1px solid var(--rf-border-strong); border-radius: 14px; background: var(--rf-input-bg); color: var(--rf-text); }
.search-box input { width: min(320px, 28vw); border-radius: 999px; }
.menu { position: absolute; top: calc(100% + 8px); right: 0; z-index: 24; display: flex; flex-direction: column; gap: 6px; min-width: 180px; padding: 8px; border: 1px solid var(--rf-border-strong); border-radius: 18px; background: var(--rf-surface-raised); box-shadow: var(--rf-shadow); }
.menu button { text-align: left; }
.banner { display: flex; justify-content: space-between; gap: 12px; margin-top: 12px; padding: 10px 14px; border-radius: 16px; background: var(--rf-primary-soft); color: var(--rf-primary); }
.banner.floating { position: fixed; top: calc(var(--rf-toolbar-height, 74px) + env(safe-area-inset-top) + 8px); left: 12px; right: 12px; z-index: 25; margin-top: 0; padding: 9px 12px; border-radius: 14px; background: var(--rf-surface-raised); box-shadow: 0 10px 28px rgba(0, 0, 0, .3); }
.banner button { border: none; background: transparent; color: inherit; }
.layout { display: grid; grid-template-columns: 280px minmax(0, 1fr) 320px; gap: 18px; align-items: start; flex: 1; min-height: 0; margin-top: 16px; }
.layout.mobile { display: block; }
.sidebar, .details { position: sticky; top: 92px; display: flex; flex-direction: column; gap: 14px; max-height: calc(100vh - 176px); min-height: 0; overflow: auto; padding-right: 4px; }
.panel { padding: 18px; border-radius: 22px; background: var(--rf-surface-alt); }
.panel h2, .panel h3 { margin: 8px 0 0; }
.panel-head { margin-bottom: 8px; font-weight: 600; }
.muted { color: var(--rf-text-muted); }
.small { font-size: .9rem; }
.chip-row { display: flex; flex-wrap: wrap; gap: 8px; }
.top-gap { margin-top: 14px; }
.study-links { display: flex; flex-direction: column; gap: 10px; }
.study-links button { border: 1px solid var(--rf-border); background: var(--rf-primary-soft); color: var(--rf-primary); border-radius: 14px; padding: 11px 12px; text-align: left; }
.study-links button:hover { background: var(--rf-selected); }
.study-link-button { display: flex; flex-direction: column; gap: 6px; }
.study-link-title { display: flex; align-items: center; justify-content: space-between; gap: 12px; font-weight: 600; }
.study-link-count { display: inline-flex; align-items: center; justify-content: center; min-width: 28px; padding: 4px 8px; border-radius: 999px; background: var(--rf-surface-strong); font-size: .8rem; }
.study-link-meta { color: var(--rf-text-muted); font-size: .84rem; line-height: 1.5; }
.structure-list { display: flex; flex-direction: column; gap: 6px; }
.structure-item { display: grid; grid-template-columns: minmax(0, 1fr); gap: 4px; padding: 11px 12px; border: 1px solid transparent; border-radius: 14px; background: transparent; text-align: left; }
.structure-item:hover { background: var(--rf-hover); }
.structure-item.active { border-color: var(--rf-primary-border); background: var(--rf-selected); }
.structure-index { color: var(--rf-text); font-size: .86rem; font-weight: 600; }
.structure-meta { color: var(--rf-text-muted); font-size: .82rem; line-height: 1.45; }
.content { display: flex; justify-content: stretch; min-width: 0; min-height: 0; overflow: visible; overscroll-behavior: auto; -webkit-overflow-scrolling: touch; padding: 12px 8px 140px; border: none; border-radius: 28px; background: #151515; box-shadow: none; }
.book-page { width: 100%; min-height: calc(var(--rf-reader-viewport-height, 100dvh) - 220px); padding: clamp(28px, 3vw, 46px) clamp(16px, 2.2vw, 34px); border: 1px solid var(--rf-border-strong); border-radius: 18px; background: #1e1e1e; box-shadow: 0 22px 60px rgba(0, 0, 0, .38); }
.content.mobile { min-height: 0; overflow: visible; overscroll-behavior: auto; padding: 10px 10px calc(var(--rf-mobile-bottom-offset, 156px) + env(safe-area-inset-bottom)); border: none; border-radius: 0; background: transparent; box-shadow: none; }
.content.mobile .book-page { width: 100%; min-height: auto; padding: 34px 22px 44px; border-radius: 16px; }
.paragraph { position: relative; display: grid; grid-template-columns: 28px minmax(0, 1fr) minmax(220px, 280px); gap: 18px 18px; min-width: 0; padding: 0; border-bottom: none; scroll-margin-top: calc(var(--rf-toolbar-height, 88px) + 22px); scroll-margin-bottom: calc(var(--rf-status-height, 56px) + 18px); }
.book-page.notes-hidden .paragraph { grid-template-columns: 28px minmax(0, 1fr); }
.paragraph + .paragraph { margin-top: 1.2em; }
.paragraph.current, .paragraph.highlighted { border-radius: 8px; background: rgba(76, 141, 255, .045); }
.paragraph.highlighted { background: var(--paragraph-highlight-color); }
.paragraph.current::before, .paragraph.highlighted::before { content: ''; position: absolute; left: 36px; top: .22em; bottom: .22em; width: 2px; border-radius: 999px; }
.paragraph.current::before { background: var(--rf-primary); }
.paragraph.highlighted::before { background: var(--paragraph-highlight-color); }
.paragraph.current.highlighted::before { background: var(--rf-primary); }
.paragraph-index { padding-top: .42em; color: var(--rf-text-weak); font-family: "Segoe UI", "PingFang SC", sans-serif; font-size: .72rem; line-height: 1; text-align: right; opacity: 0; transition: opacity .16s ease; user-select: none; }
.paragraph:hover .paragraph-index, .paragraph.current .paragraph-index, .paragraph.highlighted .paragraph-index { opacity: .68; }
.paragraph-body { min-width: 0; padding-left: 6px; }
.paragraph-text, .translation-text { margin: 0; max-width: 100%; font-family: Georgia, "Times New Roman", Times, serif; font-size: 18px; line-height: 1.76; color: #e7e3dc; overflow-wrap: anywhere; word-break: normal; }
.paragraph.highlighted .paragraph-text { color: #FFFFFF; font-weight: 600; text-shadow: 0 1px 2px rgba(0,0,0,0.45); }
.paragraph-notes { display: flex; flex-direction: column; gap: 10px; min-width: 0; }
.paragraph-notes:empty { min-height: 1px; }
.translation-block { margin-top: .8em; max-width: 100%; }
.translation-text { color: var(--rf-text-muted); }
.translation-text { font-family: "Noto Serif SC", "Source Han Serif SC", "Songti SC", Georgia, serif; font-size: 17px; line-height: 1.78; }
.page-marker { display: flex; align-items: center; gap: 18px; margin: 38px 0 34px; color: var(--rf-text-weak); font-family: "Segoe UI", "PingFang SC", sans-serif; font-size: .78rem; letter-spacing: .08em; text-align: center; text-transform: uppercase; }
.page-marker::before, .page-marker::after { content: ''; flex: 1; height: 1px; background: var(--rf-border); }
.page-marker:last-child { margin-bottom: 0; }
.paragraph-title { display: block; margin: 0 0 2.1em; text-align: center; }
.paragraph-title .paragraph-index, .paragraph-heading .paragraph-index, .paragraph-copyright .paragraph-index { display: none; }
.paragraph-title .paragraph-body, .paragraph-heading .paragraph-body, .paragraph-copyright .paragraph-body { padding-left: 0; }
.paragraph-title .paragraph-notes, .paragraph-heading .paragraph-notes, .paragraph-copyright .paragraph-notes, .paragraph-toc .paragraph-notes, .paragraph-list .paragraph-notes { display: none; }
.paragraph-title .paragraph-text { font-family: Georgia, "Times New Roman", Times, serif; font-size: clamp(2rem, 4vw, 3.2rem); line-height: 1.18; font-weight: 700; color: var(--rf-text); }
.paragraph-heading { display: block; margin: 2.2em 0 1em; }
.paragraph-heading .paragraph-text { font-family: "Segoe UI", "PingFang SC", sans-serif; font-size: 1.28rem; line-height: 1.35; font-weight: 700; color: var(--rf-text); }
.paragraph-toc, .paragraph-list { grid-template-columns: 32px minmax(0, 1fr); margin-top: .75em; }
.paragraph-toc .paragraph-text, .paragraph-list .paragraph-text { font-family: "Segoe UI", "PingFang SC", sans-serif; font-size: 16px; line-height: 1.65; color: var(--rf-text-muted); }
.paragraph-copyright { display: block; margin: .72em auto; max-width: 58ch; text-align: center; }
.paragraph-copyright .paragraph-text { font-family: "Segoe UI", "PingFang SC", sans-serif; font-size: .88rem; line-height: 1.65; color: var(--rf-text-weak); }
.inline-status { display: inline-flex; flex-wrap: wrap; align-items: center; gap: 12px; color: var(--rf-text-muted); font-size: .92rem; }
.inline-status.error { color: var(--rf-danger); }
.inline-status button { border: none; background: transparent; color: var(--rf-primary); padding: 0; }
.sentence-shell { display: inline; }
.sentence-shell + .sentence-shell::before { content: ' '; white-space: pre; }
.sentence-fragment {
  appearance: none;
  border: none;
  border-radius: 0;
  background: transparent;
  color: inherit;
  padding: 0;
  margin: 0;
  display: inline;
  font: inherit;
  line-height: inherit;
  text-align: left;
  vertical-align: baseline;
  white-space: inherit;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: color .16s ease;
}
.sentence-fragment:hover { color: var(--rf-text); }
.sentence-fragment.marked {
  color: #FFFFFF;
  font-weight: 600;
  text-shadow: 0 1px 2px rgba(0,0,0,0.45);
  border-radius: 4px;
  -webkit-box-decoration-break: clone;
  box-decoration-break: clone;
  background: linear-gradient(
    180deg,
    transparent 28%,
    var(--sentence-highlight-color) 28%,
    var(--sentence-highlight-color) 94%,
    transparent 94%
  );
}
.sentence-fragment.selected {
  position: relative;
  color: var(--rf-text);
}
.sentence-selection-layer {
  position: fixed;
  inset: 0;
  z-index: 34;
  pointer-events: none;
}
.sentence-selection-rect {
  position: fixed;
  border-radius: 6px;
  background: var(--rf-highlight-strong);
  box-shadow: inset 0 0 0 1px rgba(92, 172, 255, .42);
}
.success-text { color: var(--rf-success); }
.error-text { color: var(--rf-danger); }
.translation-summary { margin: 10px 0 0; line-height: 1.75; overflow-wrap: anywhere; word-break: break-word; }
.tag-chip, .status-chip { display: inline-flex; align-items: center; padding: 6px 10px; border-radius: 999px; background: var(--rf-primary-soft); color: var(--rf-primary); font-size: .82rem; }
.tag-chip-button { border: none; cursor: pointer; }
.tag-chip-button:hover { background: var(--rf-selected); }
.tag-chip-button.active { background: var(--rf-selected); color: var(--rf-primary); }
.status-chip { background: rgba(184, 184, 184, .1); color: var(--rf-text-muted); }
.status-chip.active { background: rgba(114, 209, 139, .14); color: var(--rf-success); }
.status-chip.warning { background: rgba(230, 180, 80, .14); color: var(--rf-warning); }
.status-chip.error { background: var(--rf-danger-soft); color: var(--rf-danger); }
.status-chip.neutral { background: var(--rf-primary-soft); color: var(--rf-primary); }
.tag-editor { display: flex; gap: 8px; margin-top: 14px; }
.compact-editor { align-items: center; }
.compact-editor input { flex: 1; min-width: 0; }
.subtle-chip { background: var(--rf-surface-strong); }
.tag-review-groups, .tag-review-list { display: flex; flex-direction: column; gap: 8px; margin-top: 12px; }
.tag-review-button, .tag-review-item { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; width: 100%; border: 1px solid var(--rf-border-strong); border-radius: 14px; background: var(--rf-surface-strong); color: var(--rf-text); padding: 10px 12px; text-align: left; }
.tag-review-button:hover, .tag-review-item:hover { background: var(--rf-hover); }
.tag-review-button.active { border-color: var(--rf-primary-border); background: var(--rf-selected); color: var(--rf-primary); }
.tag-review-item { flex-direction: column; align-items: stretch; }
.tag-review-meta { color: var(--rf-text-muted); font-size: .8rem; }
.tag-review-snippet { line-height: 1.55; overflow-wrap: anywhere; word-break: break-word; }
.sentence-card {
  position: fixed;
  z-index: 40;
  width: min(360px, calc(100vw - 24px));
  max-height: min(62vh, 460px);
  overflow: auto;
  padding: 12px;
  border: 1px solid var(--rf-border-strong);
  border-radius: 14px;
  background: var(--rf-surface-raised);
  box-shadow: 0 18px 44px rgba(0, 0, 0, .44);
}
.sentence-card-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.sentence-card-meta { margin: 0; color: var(--rf-text-muted); font-size: .82rem; line-height: 1.45; }
.sentence-card-close {
  border: none;
  background: transparent;
  color: var(--rf-primary);
  padding: 0;
}
.sentence-card-toggle { margin-top: 8px; }
.sentence-card-section { margin-top: 10px; }
.sentence-card-section + .sentence-card-section { margin-top: 10px; }
.sentence-card-label { color: var(--rf-text-muted); font-size: .78rem; font-weight: 600; letter-spacing: .04em; text-transform: uppercase; }
.sentence-card-text { margin: 10px 0 0; color: var(--rf-text); font-family: Georgia, "Times New Roman", Times, serif; font-size: .98rem; line-height: 1.62; overflow-wrap: anywhere; word-break: break-word; }
.sentence-card-translation { margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--rf-border); }
.sentence-card-meaning { margin: 0; color: var(--rf-text-muted); font-size: .9rem; line-height: 1.58; overflow-wrap: anywhere; word-break: break-word; }
.sentence-card-actions { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; margin-top: 12px; }
.sentence-card-actions .chip-button { min-width: 0; padding: 7px 8px; font-size: .8rem; }
.color-swatches { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
.color-swatch {
  width: 22px;
  height: 22px;
  border: 1px solid var(--rf-border-strong);
  border-radius: 999px;
  background: var(--swatch-color);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .2);
}
.color-swatch.active { transform: scale(1.06); box-shadow: 0 0 0 2px var(--rf-primary-border); }
.vocab-saved { background: rgba(114, 209, 139, .14); color: var(--rf-success); }
.vocab-entry {
  padding: 10px 12px;
  border: 1px solid var(--rf-border-strong);
  border-radius: 14px;
  background: var(--rf-surface-strong);
}
.vocab-entry + .vocab-entry { margin-top: 8px; }
.vocab-entry-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 4px; }
.vocab-definition { margin: 4px 0; line-height: 1.55; overflow-wrap: anywhere; word-break: break-word; }
.vocab-example { margin: 4px 0; font-style: italic; line-height: 1.45; overflow-wrap: anywhere; word-break: break-word; }
.vocab-source { margin: 4px 0; }
.mobile-fab { position: fixed; right: 14px; bottom: calc(var(--rf-status-height, 48px) + env(safe-area-inset-bottom) + 14px); z-index: 33; border: 1px solid var(--rf-border-strong); border-radius: 999px; background: var(--rf-surface-raised); color: var(--rf-primary); padding: 11px 14px; box-shadow: var(--rf-shadow); }
.mobile-fab:hover { background: var(--rf-hover); }
.overlay { position: fixed; inset: 0; z-index: 35; background: rgba(0, 0, 0, .58); overscroll-behavior: contain; }
.drawer, .sheet, .study-modal { position: absolute; pointer-events: auto; background: var(--rf-surface); box-shadow: var(--rf-shadow); }
.drawer { left: 0; top: 0; bottom: 0; width: min(88vw, 340px); overflow: auto; padding: 18px 18px calc(18px + env(safe-area-inset-bottom)); }
.sheet { left: 0; right: 0; bottom: 0; max-height: min(72dvh, calc(var(--rf-reader-viewport-height, 100dvh) - var(--rf-toolbar-height, 96px) - 18px)); overflow: auto; padding: 18px 18px calc(104px + env(safe-area-inset-bottom)); border-radius: 24px 24px 0 0; }
.action-sheet { padding-bottom: 42px; }
.action-sheet-copy { margin: 0 0 14px; line-height: 1.55; }
.mobile-action-grid { display: grid; gap: 10px; }
.mobile-action-card { display: flex; flex-direction: column; gap: 6px; width: 100%; padding: 14px; border: 1px solid var(--rf-border-strong); border-radius: 18px; background: var(--rf-surface-strong); color: var(--rf-text); text-align: left; }
.mobile-action-card:hover { background: var(--rf-hover); }
.mobile-action-title { font-weight: 600; color: var(--rf-text); }
.mobile-action-meta { color: var(--rf-text-muted); font-size: .84rem; line-height: 1.55; }
.study-modal { left: 50%; top: 50%; width: min(760px, calc(100vw - 48px)); max-height: min(78vh, 760px); overflow: auto; padding: 18px; border-radius: 24px; transform: translate(-50%, -50%); }
.sheet-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
.sheet-head h3 { margin: 0; font-size: 1.05rem; }
.sheet-head button { border: none; background: transparent; color: var(--rf-primary); }
.sheet-title { margin: 6px 0 0; font-size: 1rem; }
.study-tabs { display: inline-flex; gap: 6px; margin-bottom: 12px; padding: 4px; border: 1px solid var(--rf-border-strong); border-radius: 999px; background: var(--rf-surface-alt); }
.study-tab { border: none; border-radius: 999px; background: transparent; color: var(--rf-text-muted); padding: 8px 14px; }
.study-tab:hover { background: var(--rf-hover); color: var(--rf-text); }
.study-tab.active { background: var(--rf-primary); color: #ffffff; }
.compact-panel + .compact-panel { margin-top: 12px; }
.status-bar { position: sticky; bottom: 0; z-index: 15; display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-top: 14px; padding: 10px 14px; border-radius: 18px; }
.status-summary { color: var(--rf-text-muted); font-size: .88rem; line-height: 1.45; overflow-wrap: anywhere; word-break: break-word; }
.status-bar.mobile { padding: 7px 10px calc(7px + env(safe-area-inset-bottom)); gap: 5px; border-radius: 14px 14px 0 0; border-left: none; border-right: none; border-bottom: none; background: rgba(26, 26, 26, .94); box-shadow: 0 -10px 24px rgba(0, 0, 0, .28); }
.toast-stack { position: fixed; right: 14px; bottom: 18px; z-index: 50; display: flex; flex-direction: column; gap: 8px; align-items: flex-end; }
.toast {
  min-width: 0;
  max-width: min(320px, calc(100vw - 28px));
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px solid var(--rf-border-strong);
  color: var(--rf-text);
  background: var(--rf-surface-raised);
  box-shadow: 0 12px 28px rgba(0, 0, 0, .34);
  font-size: .88rem;
  line-height: 1.45;
}
.toast.info { color: var(--rf-primary); }
.toast.success { color: var(--rf-success); }
.toast.error { border-color: rgba(255, 107, 107, .28); background: var(--rf-danger-soft); color: var(--rf-danger); }
@media (max-width: 960px) {
  .reader-page { min-height: var(--rf-reader-viewport-height, 100dvh); padding: 0 0 8px; }
  .toolbar { grid-template-columns: 1fr; gap: 12px; padding: 12px; }
  .toolbar-group, .toolbar-group.center, .toolbar-group.end { justify-content: space-between; }
  .mobile-trailing-controls { gap: 6px; }
  .lang-switch { max-width: 100%; }
  .toolbar-group.center { justify-content: center; }
  .layout.mobile { margin-top: 8px; }
  .sidebar, .details { position: static; max-height: none; overflow: visible; padding-right: 0; }
  .banner { margin-top: 10px; padding: 8px 12px; border-radius: 14px; font-size: .92rem; }
  .content { min-height: 0; padding: 10px 10px calc(var(--rf-mobile-bottom-offset, 156px) + env(safe-area-inset-bottom)); border-radius: 0; }
  .paragraph { grid-template-columns: 28px minmax(0, 1fr); gap: 12px; padding: 0; }
  .paragraph + .paragraph { margin-top: 1.08em; }
  .paragraph.current::before, .paragraph.highlighted::before { left: 35px; top: .2em; bottom: .2em; }
  .paragraph-body { padding-left: 6px; }
  .paragraph-notes { display: none; }
  .paragraph-text, .translation-text { max-width: none; font-size: 17px; line-height: 1.76; }
  .paragraph-title .paragraph-text { font-size: clamp(1.7rem, 9vw, 2.5rem); }
  .paragraph-heading .paragraph-text { font-size: 1.14rem; }
  .page-marker { margin: 30px 0 28px; }
  .translation-block { margin-top: 10px; }
  .study-modal { left: 0; right: 0; top: auto; bottom: 0; width: auto; max-height: 72vh; padding: 18px 18px 104px; border-radius: 24px 24px 0 0; transform: none; }
  .mobile-fab { right: 12px; bottom: calc(var(--rf-status-height, 48px) + env(safe-area-inset-bottom) + 12px); padding: 10px 13px; font-size: .88rem; }
  .sheet { padding: 18px 18px calc(96px + env(safe-area-inset-bottom)); }
  .compact-panel { padding: 16px; }
  .sentence-card {
    max-height: min(58dvh, calc(var(--rf-reader-viewport-height, 100dvh) - var(--rf-toolbar-height, 88px) - var(--rf-status-height, 56px) - 36px));
    padding: 12px;
    border-radius: 22px;
  }
  .status-bar.mobile { padding: 6px 10px calc(6px + env(safe-area-inset-bottom)); gap: 5px; border-radius: 14px 14px 0 0; }
  .status-summary { font-size: .8rem; }
  .status-bar.mobile .status-chip { padding: 5px 8px; font-size: .76rem; }
  .toast-stack { left: 12px; right: 12px; bottom: calc(var(--rf-status-height, 52px) + env(safe-area-inset-bottom) + 70px); align-items: stretch; }
  .toast { max-width: none; }
}
</style>

































