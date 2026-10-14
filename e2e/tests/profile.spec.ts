import { expect, test } from '@playwright/test'
import { api, apiLogin, USERS, PASSWORD } from './helpers/backend'
import { loginUi } from './helpers/ui'

// Uses the `limited` user so the edits never touch `admin`; the original name is restored after every test.
test.describe('Profile page', () => {
  // both tests use the same user and the first one rewrites its name: never run them concurrently
  test.describe.configure({ mode: 'serial' })
  let original = { firstName: '', lastName: '' }

  test.beforeEach(async () => {
    const { access_token } = await apiLogin(USERS.limited)
    const res = await api('GET', '/auth/user', { token: access_token })
    original = {
      firstName: res.body.data.firstName ?? '',
      lastName: res.body.data.lastName ?? '',
    }
  })

  test.afterEach(async () => {
    const { access_token } = await apiLogin(USERS.limited)
    await api('PATCH', '/auth/user', { token: access_token, json: original })
  })

  test('shows the user and edits the first name (PATCH /auth/user)', async ({ page }) => {
    await loginUi(page, USERS.limited, '/user/profile')
    await expect(page.getByLabel('Username')).toHaveValue(USERS.limited)
    const newName = `E2E${Date.now() % 100000}`

    await page.getByRole('button', { name: /^(Modifica|Edit)$/ }).click()
    await page.getByLabel(/^(Nome|First name)$/).fill(newName)
    // both names are required by the client-side validation
    await page.getByLabel(/^(Cognome|Last name)$/).fill('Tester')
    const patch = page.waitForResponse((r) => r.url().includes('/api/auth/user') && r.request().method() === 'PATCH')
    await page.getByRole('button', { name: /^(Salva|Save)$/ }).click()
    expect((await patch).status()).toBe(200)
    await expect(page.getByText(newName).first()).toBeVisible()

    // persisted on the backend
    const { access_token } = await apiLogin(USERS.limited)
    const res = await api('GET', '/auth/user', { token: access_token })
    expect(res.body.data.firstName).toBe(newName)
    expect(res.body.data.lastName).toBe('Tester')
  })

  test('changing the password to the same one shows auth.password_unchanged on the new-password field', async ({ page }) => {
    await loginUi(page, USERS.limited, '/user/profile')
    await page.getByLabel(/^(Password attuale|Current password)$/).last().fill(PASSWORD)
    await page.getByLabel(/^(Nuova password|New password)$/).fill(PASSWORD)
    await page.getByLabel(/^(Conferma nuova password|Confirm new password)$/).fill(PASSWORD)
    const res = page.waitForResponse((r) => r.url().includes('/api/auth/user/password'))
    await page.getByRole('button', { name: /^(Cambia password|Change password)$/ }).click()
    const response = await res
    expect(response.status()).toBeGreaterThanOrEqual(400)
    expect(JSON.stringify(await response.json())).toContain('auth.password_unchanged')
    // the error is attached to the "new password" field, not to a generic banner
    const field = page.locator('label.q-field--error').filter({ hasText: /Nuova password|New password/ })
    await expect(field).toContainText(/diversa|differ/)
  })
})
