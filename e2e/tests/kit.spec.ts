import { expect, test } from '@playwright/test'
import { USERS } from './helpers/backend'
import { loginUi } from './helpers/ui'

// Playground page that uses @ilpachi/pachi-kit (ui + dialog sub-paths).
test.describe('pachi-kit', () => {
  test('popup edit, confirm dialog and dialog render and work', async ({ page }) => {
    await loginUi(page, USERS.admin, '/kit')
    const name = page.locator('[data-test=kit-name]')
    await expect(name).toHaveText('Esempio')

    await name.click()
    await page.locator('.q-popup-edit input').fill('Modificato')
    await page.keyboard.press('Enter')
    await expect(name).toHaveText('Modificato')

    await page.locator('[data-test=kit-confirm]').click()
    await expect(page.getByText('Conferma esempio')).toBeVisible()
    await page.getByRole('textbox', { name: /DELETE/ }).fill('DELETE')
    await page.getByRole('button', { name: 'Procedi' }).click()
    await expect(page.locator('[data-test=kit-result]')).toHaveText('confermato')

    await page.locator('[data-test=kit-dialog]').click()
    await expect(page.getByText('Dialogo di pachi-kit/dialog.')).toBeVisible()
  })
})
