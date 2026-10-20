import { expect, test } from '@playwright/test'
import type { BrowserContext, Page } from '@playwright/test'
import { BACKEND, PASSWORD, USERS } from './helpers/backend'
import { fillLogin, LABELS, loginUi, logoutUi } from './helpers/ui'

/** localStorage key read by the playground (`playground/src/pachi-config.ts`) to switch to cookie mode. */
const MODE_KEY = 'pachi-playground-refresh-mode'
/** Name of the refresh cookie set by the simulated backend. */
const COOKIE = 'pachi_refresh'

/**
 * Starts every page of the context in `auth.refreshMode: 'cookie'`.
 *
 * @param context - Playwright browser context
 */
async function useCookieMode(context: BrowserContext): Promise<void> {
  await context.addInitScript(key => localStorage.setItem(key, 'cookie'), MODE_KEY)
}

/**
 * Asserts that the client cannot see the refresh token: no readable cookie, nothing persisted.
 *
 * @param page - authenticated page
 */
async function expectNoClientSecrets(page: Page): Promise<void> {
  const seen = await page.evaluate(() => ({ cookie: document.cookie, auth: localStorage.getItem('auth') }))
  expect(seen.cookie).not.toContain(COOKIE)
  expect(seen.auth).toBeNull()
}

test.describe('Refresh token in an HttpOnly cookie (real backend)', () => {
  test('reload keeps the session through the cookie', async ({ page, context }) => {
    // pachifast <= 0.15 has no cookie mode: the token response carries no Set-Cookie
    const probe = await fetch(`${BACKEND}/api/auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ username: USERS.admin, password: PASSWORD, grant_type: 'password' }),
    }).catch(() => null)
    test.skip(
      !probe?.headers.get('set-cookie'),
      'the compat backend does not set the refresh cookie (needs pachifast with auth.refresh_mode cookie|both)',
    )
    await useCookieMode(context)
    await loginUi(page, USERS.admin)
    await page.reload()
    await expect(page.getByLabel(LABELS.accountMenu)).toBeVisible()
    await expectNoClientSecrets(page)
    await logoutUi(page)
  })
})

/** Simulated pachifast in cookie mode: single-use rotating cookie, CSRF header, envelope. */
interface FakeBackend {
  /** Bodies and CSRF headers of the received `/refresh-token` calls. */
  refreshes: { body: string | null; header: string | undefined }[]
  /** Number of `/logout` calls. */
  logouts: number
}

/**
 * Intercepts `/api/**` of the whole context with a fake backend in cookie mode.
 *
 * @param context - Playwright browser context
 * @returns the recorded calls
 */
async function fakeCookieBackend(context: BrowserContext): Promise<FakeBackend> {
  const calls: FakeBackend = { refreshes: [], logouts: 0 }
  let current: string | null = null
  let serial = 0
  const exp = () => Math.floor(Date.now() / 1000) + 3600
  const access = () => `h.${Buffer.from(JSON.stringify({ exp: exp(), n: ++serial })).toString('base64url')}.s`
  const user = {
    id: '1', username: 'admin', email: 'admin@example.com', firstName: 'Ad', lastName: 'Min',
    isActive: true, isStaff: true, isSuperuser: true, permissions: [],
  }
  const rotate = () => {
    current = `r${++serial}`
    return `${COOKIE}=${current}; HttpOnly; Path=/api/auth; SameSite=Strict`
  }

  await context.route('**/api/**', async route => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    const headers = await request.allHeaders()
    const sent = new RegExp(`${COOKIE}=([^;]+)`).exec(headers.cookie ?? '')?.[1] ?? null
    const ok = (data: unknown, extra: Record<string, string> = {}) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: extra,
        body: JSON.stringify({ success: true, message: null, data }),
      })
    const fail = (status: number, code: string) =>
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify({ detail: [{ code, msg: code, loc: [], type: code, input: null }] }),
      })

    if (path === '/api/auth/token') {
      return ok({ access_token: access(), token_type: 'bearer' }, { 'Set-Cookie': rotate() })
    }
    if (path === '/api/auth/refresh-token') {
      calls.refreshes.push({ body: request.postData(), header: headers['x-pachi-auth'] })
      if (headers['x-pachi-auth'] !== 'refresh') return fail(403, 'auth.csrf_rejected')
      if (!sent || sent !== current) return fail(401, 'auth.refresh_token_invalid')
      return ok({ access_token: access(), token_type: 'bearer' }, { 'Set-Cookie': rotate() })
    }
    if (path === '/api/auth/logout') {
      calls.logouts++
      current = null
      return ok(null, { 'Set-Cookie': `${COOKIE}=; Max-Age=0; Path=/api/auth` })
    }
    if (path === '/api/auth/user') {
      return headers.authorization ? ok(user) : fail(401, 'auth.not_authenticated')
    }
    return fail(404, 'not_found')
  })
  return calls
}

test.describe('Refresh token in an HttpOnly cookie (simulated backend)', () => {
  test('reload restores the session with a silent refresh', async ({ page, context }) => {
    await useCookieMode(context)
    const calls = await fakeCookieBackend(context)
    await page.goto('/')
    await expect(page).toHaveURL(/\/auth\/login/)
    await fillLogin(page, USERS.admin)
    await expect(page).not.toHaveURL(/\/auth\/login/)
    await page.reload()
    await expect(page.getByLabel(LABELS.accountMenu)).toBeVisible()
    await expect(page).not.toHaveURL(/\/auth\/login/)
    await expectNoClientSecrets(page)
    const cookies = await context.cookies()
    expect(cookies.find(c => c.name === COOKIE)?.httpOnly).toBe(true)
    // body {} and CSRF header, never the token
    expect(calls.refreshes.length).toBeGreaterThan(0)
    for (const r of calls.refreshes) {
      expect(r.header).toBe('refresh')
      expect(r.body).toBe('{}')
    }
  })

  test('anonymous visit: the silent refresh fails and the guard goes to the login', async ({ page, context }) => {
    await useCookieMode(context)
    await fakeCookieBackend(context)
    await page.goto('/user/profile')
    await expect(page).toHaveURL(/\/auth\/login\?next=/)
    await expect(page.getByRole('dialog')).toHaveCount(0)
  })

  test('two tabs share the cookie; logout in one logs out the other', async ({ page, context }) => {
    await useCookieMode(context)
    const calls = await fakeCookieBackend(context)
    await page.goto('/')
    await fillLogin(page, USERS.admin)
    await expect(page).not.toHaveURL(/\/auth\/login/)

    const second = await context.newPage()
    await second.goto('/')
    await expect(second.getByLabel(LABELS.accountMenu)).toBeVisible()
    // the first tab reloads after the second rotated the cookie
    await page.reload()
    await expect(page.getByLabel(LABELS.accountMenu)).toBeVisible()

    await logoutUi(page)
    await expect(second).toHaveURL(/\/auth\/login/)
    // only the tab that logged out called the backend
    expect(calls.logouts).toBe(1)
  })
})
