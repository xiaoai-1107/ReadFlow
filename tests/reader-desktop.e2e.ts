import { expect, test } from '@playwright/test'
import { clickAndWait, clickByBoxCenterInSteps, firstVisibleSentence, getReaderDebug, importFixturePdf, inspectPoint, openToolbarMoreMenu } from './e2eHelpers'

test.describe('reader desktop interactions', () => {
  test('A/C/F: desktop reader remains interactive and does not freeze after repeated controls', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-edge', 'Desktop reader coverage only runs in the desktop project.')

    const consoleErrors: string[] = []
    page.on('pageerror', error => {
      consoleErrors.push(error.message)
    })

    await importFixturePdf(page)

    const content = page.getByTestId('reader-content')
    const contentBox = await content.boundingBox()
    expect(contentBox?.height ?? 0).toBeGreaterThan(320)

    await openToolbarMoreMenu(page)
    await clickAndWait(page, page.getByTestId('toolbar-more-button'))
    await expect(page.getByTestId('toolbar-more-menu')).toHaveCount(0)

    await clickAndWait(page, page.getByTestId('mode-translation'))
    await expect(page.locator('.translation-block').first()).toBeVisible()
    await clickAndWait(page, page.getByTestId('mode-original'))
    await expect(page.locator('.translation-block').first()).toHaveCount(0)

    await page.screenshot({ path: 'test-results/desktop-before-content-click.png', fullPage: false })
    const sentence = await firstVisibleSentence(page)
    const sentenceBox = await sentence.boundingBox()
    expect(sentenceBox).not.toBeNull()
    if (!sentenceBox) {
      throw new Error('Sentence box is unavailable.')
    }

    const whitespacePoint = {
      x: Math.round((contentBox?.x ?? 0) + (contentBox?.width ?? 0) - 56),
      y: Math.round(sentenceBox.y + Math.max(16, sentenceBox.height * 0.5))
    }
    const sentencePoint = {
      x: Math.round(sentenceBox.x + Math.min(Math.max(sentenceBox.width * 0.35, 12), sentenceBox.width - 4)),
      y: Math.round(sentenceBox.y + Math.min(Math.max(sentenceBox.height * 0.5, 8), sentenceBox.height - 4))
    }

    console.log('[desktop-probe] whitespacePoint', whitespacePoint, await inspectPoint(page, whitespacePoint.x, whitespacePoint.y))
    console.log('[desktop-probe] sentencePoint', sentencePoint, await inspectPoint(page, sentencePoint.x, sentencePoint.y))
    console.log('[desktop-probe] debugBeforeContentClick', await getReaderDebug(page))

    await page.mouse.click(whitespacePoint.x, whitespacePoint.y)
    await page.waitForTimeout(120)
    await expect(page.getByTestId('mode-original')).toBeVisible()

    await clickByBoxCenterInSteps(page, sentence)
    await expect(page.getByTestId('sentence-card')).toBeVisible()
    await page.screenshot({ path: 'test-results/desktop-sentence-selected.png', fullPage: false })

    await page.mouse.wheel(0, 1200)
    await page.waitForTimeout(300)

    const currentParagraphId = await page.locator('[data-testid="paragraph"].current').first().getAttribute('data-paragraph-id')
    expect(currentParagraphId).not.toBe('p-0001')
    expect(consoleErrors).toEqual([])

    const debug = await getReaderDebug(page)
    expect(debug).not.toBeNull()
    await testInfo.attach('reader-debug.json', {
      body: JSON.stringify(debug, null, 2),
      contentType: 'application/json'
    })
  })
})
