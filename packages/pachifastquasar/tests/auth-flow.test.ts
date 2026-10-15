import { beforeEach, describe, expect, it, vi } from 'vitest'
import { retryAfterFromError } from '../src/helpers/retry-after'
import { createPinia, setActivePinia } from 'pinia'

/** Simulated HTTP client: each call is recorded and resolved/rejected by the tests. */
const http = vi.hoisted(() => ({
  form: vi.fn(),
  post: vi.fn(),
  get: vi.fn()
}))
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

const { AuthManager, unwrapAuthResponse, isMfaRequired } = await import(
  'src/services/auth-manager/auth-manager'
)
const { useAuthStore } = await import('src/services/auth-manager/auth-store')
const { createPachiLogout } = await import('src/helpers/logout-provider')

/** Fake JWT with the given `exp` (epoch seconds). */
function jwt(expSeconds: number): string {
  return `h.${btoa(JSON.stringify({ exp: expSeconds }))}.s`
}
const farFuture = () => Math.floor(Date.now() / 1000) + 3600
const user = {
  username: 'u', email: null, firstName: 'A', lastName: 'B', isActive: true,
  isStaff: false, isSuperuser: false, id: '1', permissions: []
}
const push = vi.fn(async () => undefined)

describe('AuthManager: login, MFA, refresh, logout', () => {
  let auth: ReturnType<typeof AuthManager.getInstance>

  beforeEach(() => {
    vi.clearAllMocks()
    mem.clear()
    setActivePinia(createPinia())
    ;(AuthManager as unknown as { instance: unknown }).instance = undefined
    AuthManager.setRouter({ push, currentRoute: { value: { query: {} } } } as never)
    auth = AuthManager.getInstance()
    http.get.mockResolvedValue(user)
    http.post.mockResolvedValue(undefined)
  })

  it('login normale: salva i token e naviga', async () => {
    http.form.mockResolvedValue({ access_token: jwt(farFuture()), token_type: 'bearer', refresh_token: 'r1' })
    const result = await auth.login('u', 'p')
    expect(result).toEqual({ mfaRequired: false })
    expect(useAuthStore().refresh_token).toBe('r1')
    expect(auth.hasPendingMfa).toBe(false)
    expect(push).toHaveBeenCalledWith('/')
  })

  it('login: the /token request does not open the automatic dialog (meta.autoError false)', async () => {
    http.form.mockResolvedValue({ access_token: jwt(farFuture()), token_type: 'bearer', refresh_token: 'r1' })
    await auth.login('u', 'p')
    expect(http.form).toHaveBeenCalledWith('/token', expect.any(Object), { meta: { autoError: false } })
  })

  it('login 429: the error keeps Retry-After for the countdown', async () => {
    const err = Object.assign(apiError(429, 'auth.too_many_attempts'), {
      response: { headers: new Headers({ 'Retry-After': '90' }) }
    })
    http.form.mockRejectedValue(err)
    const caught = await auth.login('u', 'p').catch((e: unknown) => e)
    expect(retryAfterFromError(caught)).toBe(90)
  })

  it('login with mfa_required: keeps the mfa_token in memory only', async () => {
    http.form.mockResolvedValue({ mfa_required: true, mfa_token: 'm1' })
    const result = await auth.login('u', 'p')
    expect(result).toEqual({ mfaRequired: true })
    expect(auth.hasPendingMfa).toBe(true)
    expect(useAuthStore().access_token).toBeNull()
    expect(JSON.stringify([...mem.values()])).not.toContain('m1')
    expect(push).not.toHaveBeenCalled()
  })

  it('login with mfa_required inside envelope', async () => {
    http.form.mockResolvedValue({ success: true, message: null, data: { mfa_required: true, mfa_token: 'm1' } })
    expect(await auth.login('u', 'p')).toEqual({ mfaRequired: true })
  })

  it('verifyMfa ok: sends mfa_token and code, completes the login', async () => {
    http.form.mockResolvedValue({ mfa_required: true, mfa_token: 'm1' })
    await auth.login('u', 'p')
    http.post.mockResolvedValue({ access_token: jwt(farFuture()), token_type: 'bearer', refresh_token: 'r9' })
    await auth.verifyMfa(' 123456 ')
    expect(http.post).toHaveBeenCalledWith(
      '/verify', { mfa_token: 'm1', code: '123456' }, expect.objectContaining({ autoError: false })
    )
    expect(useAuthStore().refresh_token).toBe('r9')
    expect(auth.hasPendingMfa).toBe(false)
    expect(push).toHaveBeenCalledWith('/')
  })

  const apiError = (status: number, code: string) =>
    Object.assign(new Error('x'), {
      status,
      safeResponseData: async () => ({ detail: [{ code, msg: 'm', loc: [], type: 't', input: '' }] })
    })

  it('verifyMfa with wrong code: can retry', async () => {
    http.form.mockResolvedValue({ mfa_required: true, mfa_token: 'm1' })
    await auth.login('u', 'p')
    http.post.mockRejectedValue(apiError(401, 'mfa.code_invalid'))
    await expect(auth.verifyMfa('000000')).rejects.toMatchObject({ status: 401 })
    expect(auth.hasPendingMfa).toBe(true)
  })

  it.each([
    [401, 'mfa.token_invalid'],
    [401, 'mfa.challenge_not_found'],
    [429, 'mfa.too_many_attempts']
  ])('verifyMfa %i %s: discards the challenge', async (status, code) => {
    http.form.mockResolvedValue({ mfa_required: true, mfa_token: 'm1' })
    await auth.login('u', 'p')
    http.post.mockRejectedValue(apiError(status, code))
    await expect(auth.verifyMfa('000000')).rejects.toBeTruthy()
    expect(auth.hasPendingMfa).toBe(false)
  })

  it('verifyMfa 429: the error keeps a Retry-After the page can read', async () => {
    http.form.mockResolvedValue({ mfa_required: true, mfa_token: 'm1' })
    await auth.login('u', 'p')
    const err = Object.assign(apiError(429, 'mfa.too_many_attempts'), {
      response: { headers: new Headers({ 'Retry-After': '300' }) }
    })
    http.post.mockRejectedValue(err)
    const caught = await auth.verifyMfa('000000').catch((e: unknown) => e)
    expect(retryAfterFromError(caught)).toBe(300)
    expect(auth.hasPendingMfa).toBe(false)
  })

  it('verifyMfa without a pending challenge throws', async () => {
    await expect(auth.verifyMfa('123456')).rejects.toThrow()
  })

  it('refresh: replaces the refresh token and reuses it on the next refresh', async () => {
    const store = useAuthStore()
    store.refresh_token = 'r1'
    http.post.mockResolvedValueOnce({ access_token: jwt(farFuture()), token_type: 'bearer', refresh_token: 'r2' })
    await auth.requestRefreshToken()
    expect(store.refresh_token).toBe('r2')
    http.post.mockResolvedValueOnce({ access_token: jwt(farFuture()), token_type: 'bearer', refresh_token: 'r3' })
    await auth.requestRefreshToken()
    expect(http.post).toHaveBeenLastCalledWith(
      '/refresh-token', { refresh_token: 'r2' }, expect.anything()
    )
    expect(store.refresh_token).toBe('r3')
  })

  it('refresh without refresh_token in the response (rotation off) keeps the current one', async () => {
    const store = useAuthStore()
    store.refresh_token = 'r1'
    http.post.mockResolvedValueOnce({ access_token: jwt(farFuture()), token_type: 'bearer' })
    await auth.requestRefreshToken()
    expect(store.refresh_token).toBe('r1')
  })

  it('concurrent refreshes: a single POST', async () => {
    useAuthStore().refresh_token = 'r1'
    http.post.mockResolvedValue({ access_token: jwt(farFuture()), token_type: 'bearer', refresh_token: 'r2' })
    await Promise.all([auth.requestRefreshToken(), auth.requestRefreshToken(), auth.requestRefreshToken()])
    expect(http.post).toHaveBeenCalledTimes(1)
  })

  it('refresh: if another tab already rotated the token (valid access) it does not POST again', async () => {
    const store = useAuthStore()
    store.refresh_token = 'old'
    store.expires_at = Date.now() - 1000
    const exp = Date.now() + 10 * 60_000
    mem.set('auth', JSON.stringify({
      access_token: 'newaccess', token_type: 'bearer', refresh_token: 'new', expires_at: exp
    }))
    await auth.requestRefreshToken()
    expect(http.post).not.toHaveBeenCalled()
    expect(store.refresh_token).toBe('new')
    expect(store.access_token).toBe('newaccess')
  })

  it('refresh: token changed in another tab but access expired, uses the latest token', async () => {
    const store = useAuthStore()
    store.refresh_token = 'old'
    store.expires_at = Date.now() - 5000
    mem.set('auth', JSON.stringify({ refresh_token: 'new', expires_at: Date.now() - 1000 }))
    http.post.mockResolvedValue({ access_token: jwt(farFuture()), token_type: 'bearer', refresh_token: 'n2' })
    await auth.requestRefreshToken()
    expect(http.post).toHaveBeenCalledWith('/refresh-token', { refresh_token: 'new' }, expect.anything())
  })

  it('refresh with revoked 401: the error propagates; the 401 handler does a local logout', async () => {
    const store = useAuthStore()
    store.refresh_token = 'r1'
    store.access_token = 'a'
    const err = apiError(401, 'auth.refresh_token_revoked')
    http.post.mockRejectedValue(err)
    await expect(auth.requestRefreshToken()).rejects.toBe(err)
    // the timer failure on 401 does not retry: local logout
    ;(auth as unknown as { _onRenewFailed: (e: unknown) => void })._onRenewFailed(err)
    await vi.waitFor(() => expect(store.refresh_token).toBeNull())
    expect(push).toHaveBeenCalledWith('/auth/login')
    // no call to /logout (session already invalid)
    expect(http.post.mock.calls.some(c => c[0] === '/logout')).toBe(false)
  })

  it('handleErrors: a 429 does neither refresh nor logout', async () => {
    useAuthStore().refresh_token = 'r1'
    const handlers = AuthManager.handleErrors() as Record<string, unknown>
    expect(handlers['429']).toBeUndefined()
    expect(Object.keys(handlers)).toEqual(['401'])
  })

  it('normal logout: sends the refresh_token and clears the state', async () => {
    const store = useAuthStore()
    store.access_token = 'a'
    store.refresh_token = 'r1'
    await auth.logout()
    expect(http.post).toHaveBeenCalledWith(
      '/logout', { refresh_token: 'r1' }, expect.objectContaining({ autoError: false })
    )
    expect(store.access_token).toBeNull()
    expect(push).toHaveBeenCalledWith('/auth/login')
  })

  it('pachiLogout: local, without requests, even with a revoked token', async () => {
    const store = useAuthStore()
    store.access_token = 'a'
    store.refresh_token = 'r1'
    http.post.mockRejectedValue(new Error('401'))
    await createPachiLogout()()
    expect(http.post).not.toHaveBeenCalled()
    expect(store.access_token).toBeNull()
    expect(store.refresh_token).toBeNull()
    expect(push).toHaveBeenCalledWith('/auth/login')
  })
})

describe('response helpers', () => {
  it('unwrapAuthResponse', () => {
    expect(unwrapAuthResponse({ success: true, data: { a: 1 } })).toEqual({ a: 1 })
    expect(unwrapAuthResponse({ access_token: 'x' })).toEqual({ access_token: 'x' })
  })
  it('isMfaRequired', () => {
    expect(isMfaRequired({ mfa_required: true, mfa_token: 't' })).toBe(true)
    expect(isMfaRequired({ access_token: 't' })).toBe(false)
    expect(isMfaRequired(null)).toBe(false)
  })
})
