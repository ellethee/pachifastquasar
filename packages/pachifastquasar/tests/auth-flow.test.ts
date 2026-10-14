import { beforeEach, describe, expect, it, vi } from 'vitest'
import { retryAfterFromError } from '../src/helpers/retry-after'
import { createPinia, setActivePinia } from 'pinia'

/** Client HTTP simulato: ogni chiamata è registrata e risolta/rifiutata dai test. */
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

/** JWT fittizio con `exp` (secondi epoch) indicato. */
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

  it('login: la richiesta /token non apre il dialog automatico (meta.autoError false)', async () => {
    http.form.mockResolvedValue({ access_token: jwt(farFuture()), token_type: 'bearer', refresh_token: 'r1' })
    await auth.login('u', 'p')
    expect(http.form).toHaveBeenCalledWith('/token', expect.any(Object), { meta: { autoError: false } })
  })

  it('login 429: l\'errore conserva Retry-After per il conto alla rovescia', async () => {
    const err = Object.assign(apiError(429, 'auth.too_many_attempts'), {
      response: { headers: new Headers({ 'Retry-After': '90' }) }
    })
    http.form.mockRejectedValue(err)
    const caught = await auth.login('u', 'p').catch((e: unknown) => e)
    expect(retryAfterFromError(caught)).toBe(90)
  })

  it('login con mfa_required: conserva il mfa_token solo in memoria', async () => {
    http.form.mockResolvedValue({ mfa_required: true, mfa_token: 'm1' })
    const result = await auth.login('u', 'p')
    expect(result).toEqual({ mfaRequired: true })
    expect(auth.hasPendingMfa).toBe(true)
    expect(useAuthStore().access_token).toBeNull()
    expect(JSON.stringify([...mem.values()])).not.toContain('m1')
    expect(push).not.toHaveBeenCalled()
  })

  it('login con mfa_required dentro envelope', async () => {
    http.form.mockResolvedValue({ success: true, message: null, data: { mfa_required: true, mfa_token: 'm1' } })
    expect(await auth.login('u', 'p')).toEqual({ mfaRequired: true })
  })

  it('verifyMfa ok: invia mfa_token e code, completa il login', async () => {
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

  it('verifyMfa con codice errato: si può riprovare', async () => {
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
  ])('verifyMfa %i %s: scarta la sfida', async (status, code) => {
    http.form.mockResolvedValue({ mfa_required: true, mfa_token: 'm1' })
    await auth.login('u', 'p')
    http.post.mockRejectedValue(apiError(status, code))
    await expect(auth.verifyMfa('000000')).rejects.toBeTruthy()
    expect(auth.hasPendingMfa).toBe(false)
  })

  it('verifyMfa 429: l\'errore conserva Retry-After leggibile dalla pagina', async () => {
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

  it('verifyMfa senza sfida in corso lancia', async () => {
    await expect(auth.verifyMfa('123456')).rejects.toThrow()
  })

  it('refresh: sostituisce il refresh token e lo riusa al refresh successivo', async () => {
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

  it('refresh senza refresh_token in risposta (rotazione off) mantiene quello attuale', async () => {
    const store = useAuthStore()
    store.refresh_token = 'r1'
    http.post.mockResolvedValueOnce({ access_token: jwt(farFuture()), token_type: 'bearer' })
    await auth.requestRefreshToken()
    expect(store.refresh_token).toBe('r1')
  })

  it('refresh concorrenti: una sola POST', async () => {
    useAuthStore().refresh_token = 'r1'
    http.post.mockResolvedValue({ access_token: jwt(farFuture()), token_type: 'bearer', refresh_token: 'r2' })
    await Promise.all([auth.requestRefreshToken(), auth.requestRefreshToken(), auth.requestRefreshToken()])
    expect(http.post).toHaveBeenCalledTimes(1)
  })

  it('refresh: se un\'altra scheda ha già ruotato il token (access valido) non rifà la POST', async () => {
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

  it('refresh: token cambiato in un\'altra scheda ma access scaduto, usa il token più recente', async () => {
    const store = useAuthStore()
    store.refresh_token = 'old'
    store.expires_at = Date.now() - 5000
    mem.set('auth', JSON.stringify({ refresh_token: 'new', expires_at: Date.now() - 1000 }))
    http.post.mockResolvedValue({ access_token: jwt(farFuture()), token_type: 'bearer', refresh_token: 'n2' })
    await auth.requestRefreshToken()
    expect(http.post).toHaveBeenCalledWith('/refresh-token', { refresh_token: 'new' }, expect.anything())
  })

  it('refresh con 401 revocato: l\'errore risale; il handler 401 fa logout locale', async () => {
    const store = useAuthStore()
    store.refresh_token = 'r1'
    store.access_token = 'a'
    const err = apiError(401, 'auth.refresh_token_revoked')
    http.post.mockRejectedValue(err)
    await expect(auth.requestRefreshToken()).rejects.toBe(err)
    // il fallimento del timer su 401 non ritenta: logout locale
    ;(auth as unknown as { _onRenewFailed: (e: unknown) => void })._onRenewFailed(err)
    await vi.waitFor(() => expect(store.refresh_token).toBeNull())
    expect(push).toHaveBeenCalledWith('/auth/login')
    // nessuna chiamata a /logout (sessione già invalida)
    expect(http.post.mock.calls.some(c => c[0] === '/logout')).toBe(false)
  })

  it('handleErrors: un 429 non fa refresh né logout', async () => {
    useAuthStore().refresh_token = 'r1'
    const handlers = AuthManager.handleErrors() as Record<string, unknown>
    expect(handlers['429']).toBeUndefined()
    expect(Object.keys(handlers)).toEqual(['401'])
  })

  it('logout normale: invia il refresh_token e pulisce lo stato', async () => {
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

  it('pachiLogout: locale, senza richieste, anche con il token revocato', async () => {
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

describe('helper di risposta', () => {
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
