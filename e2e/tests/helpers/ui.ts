import { expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import { PASSWORD } from './backend'

/** Accessible labels of the login form (the Playwright locale is pinned to en-US, so the UI is English; Italian labels are accepted too). */
export const LABELS = {
  user: /^(Utente|Username)$/,
  password: /^Password$/,
  accountMenu: /^(Account menu|Menu Account)$/i,
  logout: /^(Log out|Disconnetti)$/i,
  themeToggle: /(Toggle dark mode|Cambia tema)/i,
} as const

/**
 * Fills the login form and submits it (does not wait for the outcome).
 *
 * @param page - Playwright page, already on the login page
 * @param username - user name
 * @param password - password (default: the test password)
 */
export async function fillLogin(page: Page, username: string, password: string = PASSWORD): Promise<void> {
  await page.getByLabel(LABELS.user).fill(username)
  await page.getByLabel(LABELS.password).fill(password)
  await page.locator('form button[type=submit]').click()
}

/**
 * Logs in through the UI and waits for the app to leave the login page.
 *
 * @param page - Playwright page
 * @param username - user name
 * @param path - route to open first (default `/`)
 */
export async function loginUi(page: Page, username: string, path = '/'): Promise<void> {
  await page.goto(path)
  await expect(page).toHaveURL(/\/auth\/login/)
  await fillLogin(page, username)
  await expect(page).not.toHaveURL(/\/auth\/login/)
}

/**
 * Logs out through the account menu.
 *
 * @param page - Playwright page, authenticated
 */
export async function logoutUi(page: Page): Promise<void> {
  await page.getByLabel(LABELS.accountMenu).click()
  await page.getByText(LABELS.logout).click()
  await expect(page).toHaveURL(/\/auth\/login/)
}
