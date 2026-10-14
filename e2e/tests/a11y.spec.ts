import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { USERS } from './helpers/backend'
import { LABELS, loginUi } from './helpers/ui'

/**
 * Known axe rule ids that are tolerated, each with the reason. Empty on purpose: add an id here only together with a
 * comment pointing to the bug that tracks it.
 */
const KNOWN_EXCEPTIONS: string[] = []

/**
 * Runs axe (WCAG 2 A/AA) and returns the serious/critical violations that are not known exceptions.
 *
 * @param page - Playwright page
 * @returns a readable list of violations
 */
async function seriousViolations(page: Page): Promise<string[]> {
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  // moderate/minor findings do not fail the test: they are listed in the report as annotations
  for (const v of result.violations.filter((x) => x.impact === 'moderate' || x.impact === 'minor')) {
    test.info().annotations.push({ type: `axe-${v.impact}`, description: `${v.id}: ${v.nodes.length} node(s)` })
  }
  return result.violations
    .filter((v) => (v.impact === 'serious' || v.impact === 'critical') && !KNOWN_EXCEPTIONS.includes(v.id))
    .map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)
}

test.describe('Accessibility (axe)', () => {
  test('login page has no serious or critical violations', async ({ page }) => {
    await page.goto('/auth/login')
    await expect(page.locator('form')).toBeVisible()
    expect(await seriousViolations(page)).toEqual([])
  })

  test('login page in dark scheme has no serious or critical violations', async ({ page }) => {
    await page.goto('/auth/login')
    await expect(page.locator('form')).toBeVisible()
    // force the dark theme with the toggle (the stored/system preference may be light)
    if (!(await page.evaluate(() => document.body.classList.contains('body--dark')))) {
      await page.getByLabel(LABELS.themeToggle).click()
    }
    await expect(page.locator('body.body--dark')).toHaveCount(1)
    expect(await seriousViolations(page)).toEqual([])
  })

  test('home page has no serious or critical violations', async ({ page }) => {
    await loginUi(page, USERS.admin)
    await expect(page.getByRole('heading', { name: /Overview/ })).toBeVisible()
    expect(await seriousViolations(page)).toEqual([])
  })
})
