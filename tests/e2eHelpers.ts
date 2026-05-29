import type { Locator, Page } from '@playwright/test'
import { expect } from '@playwright/test'
import { buildReaderFixturePdf } from './e2e/pdfFixture'

export async function importFixturePdf(page: Page) {
  page.on('console', message => {
    console.log(`[browser:${message.type()}] ${message.text()}`)
  })
  page.on('pageerror', error => {
    console.log(`[pageerror] ${error.message}`)
  })

  await page.addInitScript(() => {
    window.sessionStorage.setItem('__READFLOW_DEBUG__', '1')
  })
  await page.goto('http://127.0.0.1:4173/?rfDebug=1')
  console.log('[bodyTextBeforeImport]', await page.locator('body').innerText().catch(() => '<body unavailable>'))
  await expect(page.getByText('Import PDF')).toBeVisible()
  const fileInput = page.locator('input[type="file"]').first()
  await expect(fileInput).toHaveCount(1)
  await fileInput.setInputFiles({
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
  return page.evaluate(() => {
    const win = window as Window & { __READFLOW_DEBUG__?: unknown }
    return win.__READFLOW_DEBUG__ ?? {
      debugSessionFlag: window.sessionStorage.getItem('__READFLOW_DEBUG__')
    }
  })
}

export async function clickAndWait(page: Page, locator: Locator) {
  await locator.click()
  await page.waitForTimeout(120)
}

export async function clickByBoxCenter(page: Page, locator: Locator) {
  await locator.click()
  await page.waitForTimeout(120)
}

export async function clickByBoxCenterInSteps(page: Page, locator: Locator) {
  const box = await locator.boundingBox()
  if (!box) {
    throw new Error('Target locator has no bounding box.')
  }

  await locator.hover()
  await page.mouse.down()
  await page.waitForTimeout(80)
  await page.mouse.up()
  await page.waitForTimeout(120)
}

export async function inspectPoint(page: Page, x: number, y: number) {
  return page.evaluate(
    ({ x: pointX, y: pointY }) => {
      const target = document.elementFromPoint(pointX, pointY)
      if (!(target instanceof HTMLElement)) {
        return null
      }

      const styles = window.getComputedStyle(target)
      const rect = target.getBoundingClientRect()
      return {
        x: Math.round(pointX),
        y: Math.round(pointY),
        tag: target.tagName.toLowerCase(),
        className: target.className,
        testId: target.getAttribute('data-testid'),
        pointerEvents: styles.pointerEvents,
        position: styles.position,
        zIndex: styles.zIndex,
        rect: {
          left: Math.round(rect.left),
          top: Math.round(rect.top),
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        }
      }
    },
    { x, y }
  )
}
