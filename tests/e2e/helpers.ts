import type { Locator, Page } from '@playwright/test'
import { expect } from '@playwright/test'
import { buildReaderFixturePdf } from './pdfFixture'

export async function importFixturePdf(page: Page) {
  await page.goto('/?rfDebug=1')
  await page.setInputFiles('input[type="file"]', {
    name: 'reader-fixture.pdf',
    mimeType: 'application/pdf',
    buffer: buildReaderFixturePdf()
  })

  await page.waitForURL(/\/reader\//)
  await page.waitForSelector('[data-testid="reader-content"] article')
}

export async function openToolbarMoreMenu(page: Page) {
  await page.getByTestId('toolbar-more-button').click()
  await expect(page.getByTestId('toolbar-more-menu')).toBeVisible()
}

export async function firstVisibleSentence(page: Page) {
  const locator = page.locator('[data-testid="sentence-fragment"]').first()
  await expect(locator).toBeVisible()
  return locator
}

export async function getReaderDebug(page: Page) {
  return page.evaluate(() => (window as Window & { __READFLOW_DEBUG__?: unknown }).__READFLOW_DEBUG__ ?? null)
}

export async function clickAndWait(locator: Locator) {
  await locator.click()
  await locator.page().waitForTimeout(120)
}
