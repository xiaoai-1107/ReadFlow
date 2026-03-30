import { devices, expect, test } from '@playwright/test'
import { clickAndWait, clickByBoxCenter, firstVisibleSentence, getReaderDebug, importFixturePdf } from './e2eHelpers'

const { defaultBrowserType: _defaultBrowserType, ...iphoneUse } = devices['iPhone 13']

test.describe('reader mobile interactions (iphone-13)', () => {
  test('A/B/D/E: mobile reader opens layers, taps sentences, and keeps article visible', async ({ browser }) => {
    const context = await browser.newContext(iphoneUse)
    const page = await context.newPage()
    try {
      await importFixturePdf(page)

      const content = page.getByTestId('reader-content')
      const contentBox = await content.boundingBox()
      expect(contentBox?.height ?? 0).toBeGreaterThan(220)

      const toolbarMoreButton = page.getByTestId('toolbar-more-button')
      await clickAndWait(page, toolbarMoreButton)
      await expect(page.getByTestId('toolbar-more-menu')).toBeVisible()
      await page.screenshot({ path: 'test-results/iphone-13-more-menu.png', fullPage: false })
      await clickAndWait(page, toolbarMoreButton)
      await expect(page.getByTestId('toolbar-more-menu')).toHaveCount(0)

      await clickAndWait(page, page.getByTestId('mobile-primary-action'))
      await expect(page.getByTestId('action-sheet')).toBeVisible()
      await clickAndWait(page, page.getByTestId('open-structure-drawer'))
      await expect(page.getByTestId('structure-drawer')).toBeVisible()
      await page.getByTestId('structure-drawer-backdrop').click({ position: { x: 40, y: 100 } })
      await expect(page.getByTestId('structure-drawer')).toHaveCount(0)

      const sentence = await firstVisibleSentence(page)
      await clickByBoxCenter(page, sentence)
      await expect(page.getByTestId('sentence-card')).toBeVisible()
      await page.screenshot({ path: 'test-results/iphone-13-sentence-selected.png', fullPage: false })

      expect(await sentence.getAttribute('data-selected')).toBe('true')

      await page.mouse.wheel(0, 1400)
      await page.waitForTimeout(300)

      const currentParagraphId = await page.locator('[data-testid="paragraph"].current').first().getAttribute('data-paragraph-id')
      expect(currentParagraphId).not.toBe('p-0001')

      const debug = await getReaderDebug(page)
      expect(debug).not.toBeNull()
    } finally {
      await context.close()
    }
  })
})
