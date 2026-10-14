import { expect, test } from '@playwright/test'
import { USERS } from './helpers/backend'
import { fillLogin } from './helpers/ui'

test.describe('Router guard', () => {
  test('anonymous visit to a protected route redirects to /auth/login with next', async ({ page }) => {
    await page.goto('/admin')
    await expect(page).toHaveURL(/\/auth\/login\?next=(%2F|\/)admin/)
  })

  test('after login the app returns to the requested route', async ({ page }) => {
    await page.goto('/user/profile')
    await expect(page).toHaveURL(/\/auth\/login/)
    await fillLogin(page, USERS.limited)
    await expect(page).toHaveURL(/\/user\/profile$/)
  })

  test('unknown route shows the not-found page', async ({ page }) => {
    await page.goto('/auth/login')
    await fillLogin(page, USERS.admin)
    await expect(page).not.toHaveURL(/\/auth\/login/)
    await page.goto('/does-not-exist')
    await expect(page.getByText('404')).toBeVisible()
  })
})
