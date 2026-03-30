import { expect, test } from '@playwright/test'
import { clickAndWait, firstVisibleSentence, getReaderDebug, importFixturePdf, openToolbarMoreMenu } from './helpers'

test.describe('reader desktop interactions', () => {
  test('A/C/F: desktop reader remains interactive and does not freeze after repeated controls', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('pageerror', error => {
      consoleErrors.push(error.message)
    })

    await importFixturePdf(page)

    const content = page.getByTestId('reader-content')
    const contentBox = await content.boundingBox()
    expect(contentBox?.height ?? 0).toBeGreaterThan(320)

    await openToolbarMoreMenu(page)
    await clickAndWait(page.getByTestId('toolbar-more-close-target'))
    await clickAndWait(page.getByTestId('mode-translation'))
    await expect(page.locator('.translation-block').first()).toBeVisible()
    await clickAndWait(page.getByTestId('mode-original'))
    await expect(page.locator('.translation-block').first()).toHaveCount(0)

    const sentence = await firstVisibleSentence(page)
    await clickAndWait(sentence)
    await expect(page.getByTestId('sentence-card')).toBeVisible()
    await page.screenshot({ path: 'test-results/desktop-sentence-selected.png', fullPage: false })

    await page.mouse.wheel(0, 1200)
    await page.waitForTimeout(300)

    const paragraphIds = await page.locator('[data-testid="paragraph"]').evaluateAll(nodes =>
      nodes
        .filter(node => node.classList.contains('current'))
        .map(node => node.getAttribute('data-paragraph-id'))
    )

    expect(paragraphIds[0]).not.toBe('p-0001')
    expect(consoleErrors).toEqual([])

    const debug = await getReaderDebug(page)
    expect(debug).not.toBeNull()
  })
})
