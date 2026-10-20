import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { setActivePinia } from 'pinia'
import { createApp } from 'vue'

/** Simulated HTTP client (as in auth-flow.test.ts). */
const http = vi.hoisted(() => ({ form: vi.fn(), post: vi.fn(), get: vi.fn() }))
vi.mock('@ilpachi/use-alova', () => ({
  getUseAlovaInstance: () => () => ({
    alova: { Post: http.post, Get: http.get },
    $form: http.form
  }),
  STOP_PROCESSOR: Symbol('stop')
}))
vi.mock('@ilpachi/use-alova/files', () => ({ withFiles: (api: unknown) => api }))
vi.mock('src/stores/pachi-events', () => ({
  usePachiEventsStore: () => ({
    connected: true,
    hasManager: () => true,
    connect: () => undefined,
    disconnect: () => undefined
  })
}))
const mem = new Map<string, string>()
const storage = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => void mem.set(k, v),
  removeItem: (k: string) => void mem.delete(k)
}
vi.stubGlobal('localStorage', storage)
vi.stubGlobal('sessionStorage', storage)
vi.stubGlobal('window', new EventTarget())

/** In-memory BroadcastChannel: delivers to the other channels with the same name. */
class FakeChannel {
  static all: FakeChannel[] = []
  onmessage: ((e: { data: unknown }) => void) | null = null
  sent: unknown[] = []
  constructor(public name: string) {
    FakeChannel.all.push(this)
  }
  postMessage(data: unknown) {
    this.sent.push(data)
    for (const c of FakeChannel.all) if (c !== this && c.name === this.name) c.onmessage?.({ data })
  }
}
vi.stubGlobal('BroadcastChannel', FakeChannel)
const locks = { request: vi.fn((_name: string, fn: () => Promise<unknown>) => fn()) }
vi.stubGlobal('navigator', { locks })

vi.mock('src/core/menu/menu-registry', () => ({ registerPachiMenus: () => undefined }))
vi.mock('src/core/menu/collect-menus', () => ({ collectPackageMenus: () => [] }))
vi.mock('src/router/routes', () => {
  const view = { template: '<div />' }
  return {
    buildPachiRoutes: () => [
      { path: '/', component: view },
      { path: '/auth/login', component: view, meta: { noAuth: true } },
      { path: '/area', component: view }
    ]
  }
})

const { setPachiConfig } = await import('src/core/config')
const { createPachiRouter } = await import('src/router/create-pachi-router')
const { createPachiPinia } = await import('src/stores/create-pinia')
const { AuthManager } = await import('src/services/auth-manager/auth-manager')
const { useAuthStore } = await import('src/services/auth-manager/auth-store')
const { PACHI_AUTH_REFRESH_HEADER } = await import('src/services/auth-manager/cookie-session')

/** Fake JWT with the given `exp` (epoch seconds). */
const jwt = (exp: number) => `h.${btoa(JSON.stringify({ exp }))}.s`
const farFuture = () => Math.floor(Date.now() / 1000) + 3600
const user = {
  username: 'u', email: null, firstName: 'A', lastName: 'B', isActive: true,
  isStaff: false, isSuperuser: false, id: '1', permissions: []
}
const push = vi.fn(async () => undefined)
const apiError = (status: number, code = 'x') =>
  Object.assign(new Error('x'), {
    status,
    safeResponseData: async () => ({ detail: [{ code }] })
  })
const cookieRequest = expect.objectContaining({
  credentials: 'include',
  autoError: false,
  headers: expect.objectContaining({
    'Content-Type': 'application/json',
    [PACHI_AUTH_REFRESH_HEADER]: 'refresh'
  })
})

/** A fresh AuthManager singleton (a "tab"). */
function newTab() {
  ;(AuthManager as unknown as { instance: unknown }).instance = undefined
  return AuthManager.getInstance()
}

describe('AuthManager in cookie refresh mode', () => {
  let auth: ReturnType<typeof AuthManager.getInstance>

  beforeEach(() => {
    vi.clearAllMocks()
    mem.clear()
    FakeChannel.all = []
    setPachiConfig({ auth: { refreshMode: 'cookie' } })
    // installed in an app: Pinia applies the persistence plugin only then
    const pinia = createPachiPinia()
    createApp({}).use(pinia)
    setActivePinia(pinia)
    AuthManager.setRouter({
      push,
      currentRoute: { value: { query: {}, meta: { noAuth: true } } }
    } as never)
    auth = newTab()
    http.get.mockResolvedValue(user)
    http.post.mockResolvedValue(undefined)
  })

  afterAll(() => {
    setPachiConfig()
  })

  it('login: /token with credentials, ignores refresh_token, persists nothing', async () => {
    mem.set('auth', JSON.stringify({ refresh_token: 'stale' }))
    http.form.mockResolvedValue({ access_token: jwt(farFuture()), token_type: 'bearer', refresh_token: 'leak' })
    await auth.login('u', 'p')
    expect(http.form).toHaveBeenCalledWith('/token', expect.any(Object), {
      meta: { autoError: false },
      credentials: 'include'
    })
    const store = useAuthStore()
    expect(store.refresh_token).toBeNull()
    expect(auth.refreshToken).toBeNull()
    expect(store.access_token).toBeTruthy()
    await vi.waitFor(() => expect(mem.has('auth')).toBe(false))
    expect(JSON.stringify([...mem.values()])).not.toContain('leak')
    expect(push).toHaveBeenCalledWith('/')
  })

  it('verifyMfa: /mfa/verify with credentials', async () => {
    http.form.mockResolvedValue({ mfa_required: true, mfa_token: 'm1' })
    await auth.login('u', 'p')
    http.post.mockResolvedValue({ access_token: jwt(farFuture()), token_type: 'bearer' })
    await auth.verifyMfa('123456')
    expect(http.post).toHaveBeenCalledWith(
      '/verify',
      { mfa_token: 'm1', code: '123456' },
      expect.objectContaining({ credentials: 'include' })
    )
    expect(auth.isAuthenticated).toBe(true)
  })

  it('refresh: body {}, CSRF header, credentials, inside the Web Lock', async () => {
    http.post.mockResolvedValue({ access_token: jwt(farFuture()), token_type: 'bearer' })
    await auth.requestRefreshToken()
    expect(http.post).toHaveBeenCalledWith('/refresh-token', {}, cookieRequest)
    expect(locks.request).toHaveBeenCalledWith('pachi-auth-refresh', expect.any(Function))
    expect(auth.isAuthenticated).toBe(true)
  })

  it('refresh without navigator.locks still works', async () => {
    vi.stubGlobal('navigator', {})
    http.post.mockResolvedValue({ access_token: jwt(farFuture()), token_type: 'bearer' })
    await auth.requestRefreshToken()
    expect(auth.isAuthenticated).toBe(true)
    vi.stubGlobal('navigator', { locks })
  })

  it('concurrent refreshes: a single POST; a second one right after is deduplicated', async () => {
    http.post.mockResolvedValue({ access_token: jwt(farFuture()), token_type: 'bearer' })
    await Promise.all([auth.requestRefreshToken(), auth.requestRefreshToken()])
    await auth.requestRefreshToken()
    expect(http.post.mock.calls.filter(c => c[0] === '/refresh-token')).toHaveLength(1)
  })

  it('refresh 401 (rotation race): retried once, then it succeeds', async () => {
    http.post
      .mockRejectedValueOnce(apiError(401))
      .mockResolvedValueOnce({ access_token: jwt(farFuture()), token_type: 'bearer' })
    await auth.requestRefreshToken()
    expect(http.post).toHaveBeenCalledTimes(2)
    expect(auth.isAuthenticated).toBe(true)
  })

  it('refresh 403 auth.csrf_rejected: console.error, no retry', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    http.post.mockRejectedValue(apiError(403, 'auth.csrf_rejected'))
    await expect(auth.requestRefreshToken()).rejects.toMatchObject({ status: 403 })
    expect(http.post).toHaveBeenCalledTimes(1)
    expect(spy.mock.calls[0]?.[0]).toContain('auth.csrf_rejected')
    spy.mockRestore()
  })

  it('boot: silent restore succeeds without any refresh token in the client', async () => {
    http.post.mockResolvedValue({ access_token: jwt(farFuture()), token_type: 'bearer' })
    expect(await auth.tryRestoreSession()).toBe(true)
    expect(http.get).toHaveBeenCalledWith('/user', expect.anything())
  })

  it('boot: 401 on the second attempt -> not authenticated, no logout request', async () => {
    http.post.mockRejectedValue(apiError(401))
    expect(await auth.tryRestoreSession()).toBe(false)
    expect(http.post.mock.calls.every(c => c[0] === '/refresh-token')).toBe(true)
    expect(http.post).toHaveBeenCalledTimes(2)
  })

  it('logout: /logout with body {} and CSRF header, broadcasts {type: logout}', async () => {
    http.form.mockResolvedValue({ access_token: jwt(farFuture()), token_type: 'bearer' })
    await auth.login('u', 'p')
    const other = new FakeChannel('pachi-auth')
    await auth.logout()
    expect(http.post).toHaveBeenCalledWith('/logout', {}, cookieRequest)
    expect(useAuthStore().access_token).toBeNull()
    expect(other.sent).toEqual([])
    const received: unknown[] = []
    other.onmessage = e => received.push(e.data)
    await auth.login('u', 'p')
    await auth.logout()
    expect(received).toContainEqual({ type: 'logout' })
    expect(JSON.stringify(received)).not.toMatch(/token/i)
  })

  it('cross-tab: a logout message makes the tab log out locally (no request)', async () => {
    http.form.mockResolvedValue({ access_token: jwt(farFuture()), token_type: 'bearer' })
    await auth.login('u', 'p')
    http.post.mockClear()
    new FakeChannel('pachi-auth').postMessage({ type: 'logout' })
    await vi.waitFor(() => expect(useAuthStore().access_token).toBeNull())
    expect(http.post).not.toHaveBeenCalled()
  })

  it('cross-tab: a login message makes a tab without session try a silent refresh', async () => {
    http.post.mockResolvedValue({ access_token: jwt(farFuture()), token_type: 'bearer' })
    new FakeChannel('pachi-auth').postMessage({ type: 'login' })
    await vi.waitFor(() => expect(auth.isAuthenticated).toBe(true))
    expect(http.post).toHaveBeenCalledWith('/refresh-token', {}, cookieRequest)
  })

  it('handleErrors 401: refreshes once and retries the request', async () => {
    http.form.mockResolvedValue({ access_token: jwt(farFuture()), token_type: 'bearer' })
    await auth.login('u', 'p')
    // the login counts as a fresh refresh: let the dedupe window pass
    ;(auth as unknown as { _lastRefreshAt: number })._lastRefreshAt = 0
    http.post.mockResolvedValue({ access_token: jwt(farFuture()), token_type: 'bearer' })
    const retry = vi.fn(async () => 'ok')
    const handler = AuthManager.handleErrors()['401'] as (ctx: unknown) => Promise<unknown>
    const ctx = {
      method: { url: '/api/items', config: { headers: { Authorization: 'Bearer a' } } },
      error: apiError(401),
      retry,
      retried: false
    }
    const result = (await handler(ctx)) as unknown[]
    expect(result[0]).toBe('ok')
    expect(http.post).toHaveBeenCalledWith('/refresh-token', {}, cookieRequest)
  })

  it('handleErrors 401 without an active session: local logout', async () => {
    useAuthStore().access_token = 'a'
    const handler = AuthManager.handleErrors()['401'] as (ctx: unknown) => Promise<unknown>
    const ctx = {
      method: { url: '/api/items', config: { headers: { Authorization: 'Bearer a' } } },
      error: apiError(401),
      retry: vi.fn(),
      retried: false
    }
    await expect(handler(ctx)).rejects.toBeTruthy()
    expect(http.post).not.toHaveBeenCalled()
    expect(useAuthStore().access_token).toBeNull()
  })

  it('guard at boot: silent refresh ok -> the protected route opens', async () => {
    http.post.mockResolvedValue({ access_token: jwt(farFuture()), token_type: 'bearer' })
    const router = createPachiRouter({ mode: 'memory' })
    await router.push('/area')
    expect(router.currentRoute.value.path).toBe('/area')
    expect(http.post).toHaveBeenCalledWith('/refresh-token', {}, cookieRequest)
  })

  it('guard at boot: refresh 401 -> /auth/login?next=', async () => {
    http.post.mockRejectedValue(apiError(401))
    const router = createPachiRouter({ mode: 'memory' })
    await router.push('/area')
    expect(router.currentRoute.value.path).toBe('/auth/login')
    expect(router.currentRoute.value.query.next).toBe('/area')
  })
})
