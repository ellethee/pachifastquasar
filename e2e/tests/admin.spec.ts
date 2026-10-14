import { expect, test } from '@playwright/test'
import { api, apiLogin, USERS } from './helpers/backend'
import { loginUi } from './helpers/ui'

const PREFIX = `e2e-${Date.now() % 1000000}-`
const COUNT = 30
const BASE = '/admin/models/compat/item'
let token = ''
const ids: number[] = []

// Pagination: the table shows 25 rows per page, so 30 seeded rows span two pages.
test.describe('Admin page (fastquasar-admin)', () => {
  test.beforeAll(async () => {
    token = (await apiLogin(USERS.admin)).access_token
    for (let i = 1; i <= COUNT; i++) {
      const name = `${PREFIX}${String(i).padStart(2, '0')}`
      const res = await api('POST', BASE, { token, json: { name, status: 'draft', quantity: i, active: true } })
      expect(res.status).toBeLessThan(300)
      ids.push(res.body.data.id)
    }
  })

  test.afterAll(async () => {
    for (const id of ids) await api('DELETE', `${BASE}/${id}`, { token })
  })

  test('model list and a searchable, paginated item table', async ({ page }) => {
    await loginUi(page, USERS.admin, '/admin')
    await expect(page.getByText('Item').first()).toBeVisible()
    await page.goto('/admin/compat/item')
    await page.getByLabel(/^(Cerca|Search)$/).fill(PREFIX)
    const rows = page.locator('tbody tr')
    await expect(rows).toHaveCount(25)
    await expect(page.getByText(new RegExp(`1-25 (di|of) ${COUNT}`))).toBeVisible()

    await page.getByRole('button', { name: /next page|pagina successiva/i }).click()
    await expect(rows).toHaveCount(COUNT - 25)
    await expect(page.getByText(new RegExp(`26-${COUNT} (di|of) ${COUNT}`))).toBeVisible()
  })

  test('the limited (non staff) user gets no admin models', async ({ page }) => {
    await loginUi(page, USERS.limited, '/admin')
    await expect(page.locator('tbody tr')).toHaveCount(0)
    await expect(page.getByText(PREFIX)).toHaveCount(0)
  })
})
