import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { USERS } from './helpers/backend'
import { LABELS, loginUi } from './helpers/ui'

/**
 * Asserts the page has no horizontal scroll and that the logo image is rendered with a real size.
 *
 * @param page - Playwright page on the login route
 */
async function expectLoginFits(page: Page): Promise<void> {
  await expect(page.locator('form')).toBeVisible()
  const { scrollW, clientW } = await page.evaluate(() => ({
    scrollW: document.documentElement.scrollWidth,
    clientW: document.documentElement.clientWidth,
  }))
  expect(scrollW, 'horizontal scroll').toBeLessThanOrEqual(clientW)
  const logo = page.locator('.pachi-logo img').first()
  await expect(logo).toBeVisible()
  const ok = await logo.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)
  expect(ok, 'logo image loaded').toBe(true)
  const box = await logo.boundingBox()
  expect(box && box.width > 0 && box.height > 0 && box.x >= 0 && box.x + box.width <= page.viewportSize()!.width).toBe(true)
}

test.describe('Login layout', () => {
  test('desktop light and dark theme', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
    await page.goto('/auth/login')
    await expectLoginFits(page)
    const isDark = (): Promise<boolean> => page.evaluate(() => document.body.classList.contains('body--dark'))
    const before = await isDark()
    await page.getByLabel(LABELS.themeToggle).click()
    await expect.poll(isDark).toBe(!before)
    await expectLoginFits(page)
  })

  test.describe('mobile 390px', () => {
    test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })

    for (const scheme of ['light', 'dark'] as const) {
      test(`no horizontal scroll (${scheme} scheme)`, async ({ page }) => {
        await page.emulateMedia({ colorScheme: scheme })
        await page.goto('/auth/login')
        await expectLoginFits(page)
        await page.getByLabel(LABELS.themeToggle).click()
        await expectLoginFits(page)
      })
    }
  })
})

test.describe('Dashboard at 375px', () => {
  test.use({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true })

  test('cards are fully inside the viewport and the page does not scroll sideways', async ({ page }) => {
    await loginUi(page, USERS.admin, '/')
    const cards = page.locator('.pachi-dashboard-card')
    await expect(cards.first()).toBeVisible()
    expect(await cards.count()).toBeGreaterThan(1)
    const { scrollW, clientW } = await page.evaluate(() => ({
      scrollW: document.documentElement.scrollWidth,
      clientW: document.documentElement.clientWidth,
    }))
    expect(scrollW, 'horizontal scroll').toBeLessThanOrEqual(clientW)
    for (const box of await cards.evaluateAll((els) => els.map((e) => e.getBoundingClientRect().toJSON()))) {
      expect(box.x).toBeGreaterThanOrEqual(0)
      expect(box.x + box.width).toBeLessThanOrEqual(clientW)
      // one column on a phone: a card squeezed into a third of the width cuts its text
      expect(box.width).toBeGreaterThanOrEqual(280)
    }
  })
})
