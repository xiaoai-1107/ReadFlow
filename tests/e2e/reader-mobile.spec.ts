import { expect, test } from '@playwright/test'
import { clickAndWait, firstVisibleSentence, getReaderDebug, importFixturePdf } from './helpers'

test.describe('reader mobile interactions', () => {
  test('A/B/D/E: mobile reader opens layers, taps sentences, and keeps article visible', async ({ page }) => {
    await importFixturePdf(page)

    const content = page.getByTestId('reader-content')
    const contentBox = await content.boundingBox()
    expect(contentBox?.height ?? 0).toBeGreaterThan(220)

    const toolbarMoreButton = page.getByTestId('toolbar-more-button')
    await clickAndWait(toolbarMoreButton)
    await expect(page.getByTestId('toolbar-more-menu')).toBeVisible()
    await page.screenshot({ path: 'test-results/mobile-more-menu.png', fullPage: false })
    await page.locator('body').click({ position: { x: 20, y: 220 } })
    await expect(page.getByTestId('toolbar-more-menu')).toHaveCount(0)

    await clickAndWait(page.getByTestId('mobile-primary-action'))
    await expect(page.getByTestId('action-sheet')).toBeVisible()
    await clickAndWait(page.getByTestId('open-structure-drawer'))
    await expect(page.getByTestId('structure-drawer')).toBeVisible()
    await page.locator('[data-testid="structure-drawer-backdrop"]').click({ position: { x: 360, y: 100 } })
    await expect(page.getByTestId('structure-drawer')).toHaveCount(0)

    const sentence = await firstVisibleSentence(page)
    await clickAndWait(sentence)
    await expect(page.getByTestId('sentence-card')).toBeVisible()
    await page.screenshot({ path: 'test-results/mobile-sentence-selected.png', fullPage: false })

    const firstFragmentState = await sentence.getAttribute('data-selected')
    expect(firstFragmentState).toBe('true')

    await page.mouse.wheel(0, 1400)
    await page.waitForTimeout(300)

    const currentParagraphId = await page.locator('[data-testid="paragraph"].current').first().getAttribute('data-paragraph-id')
    expect(currentParagraphId).not.toBe('p-0001')

    const debug = await getReaderDebug(page)
    expect(debug).not.toBeNull()
  })
})
