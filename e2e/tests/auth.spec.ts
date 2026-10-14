import { expect, test } from '@playwright/test'
import { USERS } from './helpers/backend'
import { fillLogin, loginUi, logoutUi, LABELS } from './helpers/ui'

test.describe('Login and logout', () => {
  test('valid admin login lands on the home dashboard', async ({ page }) => {
    await loginUi(page, USERS.admin)
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByLabel(LABELS.accountMenu)).toBeVisible()
    await expect(page.getByText('Pachi Fast Quasar').first()).toBeVisible()
  })

  test('wrong password shows an error and stays on the login page', async ({ page }) => {
    await page.goto('/')
    await fillLogin(page, USERS.admin, 'definitely-wrong-password')
    await expect(page.getByRole('alert')).toBeVisible()
    await expect(page).toHaveURL(/\/auth\/login/)
    await expect(page.getByLabel(LABELS.accountMenu)).toHaveCount(0)
  })

  test('logout returns to the login page and drops the session', async ({ page }) => {
    await loginUi(page, USERS.admin)
    await logoutUi(page)
    // the session is gone: a protected route redirects to the login again
    await page.goto('/admin')
    await expect(page).toHaveURL(/\/auth\/login/)
  })
})
