import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const loading = vi.hoisted(() => ({ show: vi.fn(), hide: vi.fn() }))
const dialog = vi.hoisted(() => ({
  create: vi.fn(() => {
    const chain = { onOk: () => chain, onCancel: () => chain, onDismiss: () => chain }
    return chain
  })
}))
vi.mock('quasar', () => ({ Loading: loading, Dialog: dialog, Notify: { create: vi.fn() } }))
vi.mock('@ilpachi/pachi-i18n', () => ({
  getPachiI18n: () => ({ global: { te: () => true } }),
  pachiT: (key: string) => `T(${key})`
}))
// no real WebSocket: the events connection is optional and lazy
vi.mock('src/stores/pachi-events', () => ({
  usePachiEventsStore: () => ({
    connected: true,
    hasManager: () => true,
    connect: () => undefined,
    disconnect: () => undefined
  })
}))
vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => undefined, removeItem: () => undefined })
vi.stubGlobal('sessionStorage', { getItem: () => null, setItem: () => undefined, removeItem: () => undefined })

const { createPachiHttp } = await import('src/app/create-http')
const { setPachiConfig } = await import('src/core/config')
const { setPachiQuasar } = await import('src/helpers/quasar-instance')
// the app's `$q` instance (registered by createPachiApp): fake plugins
setPachiQuasar({ dialog: dialog.create, notify: vi.fn(), loading } as never)
const { AuthManager } = await import('src/services/auth-manager/auth-manager')
const { useAuthStore } = await import('src/services/auth-manager/auth-store')

interface Call {
  method: string
  url: string
  headers: Record<string, string>
  body: unknown
}

/** Fake handler: returns the response for a request (or a Promise to control its timing). */
type Handler = (call: Call) => Response | Promise<Response>

let calls: Call[] = []
let handler: Handler = () => json({})

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

/** JWT-like token (payload with `exp`) used by the refresh to schedule the renewal. */
const jwt = (): string => `h.${btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }))}.s`

const USER = {
  id: '1', username: 'u', email: null, firstName: 'A', lastName: 'B', isActive: true,
  isStaff: false, isSuperuser: false, permissions: []
}

/** Creates the HTTP factory and the AuthManager singleton with an already started session. */
function setup(session = true, options?: Parameters<typeof createPachiHttp>[0]) {
  setActivePinia(createPinia())
  ;(AuthManager as unknown as { instance: unknown }).instance = undefined
  const useAlova = createPachiHttp(options)
  const auth = AuthManager.getInstance()
  const store = useAuthStore()
  if (session) {
    store.access_token = 'old'
    store.token_type = 'bearer'
    store.refresh_token = 'refresh'
    auth.userInfo = USER as never
  }
  return { useAlova, auth, store }
}

beforeEach(() => {
  calls = []
  handler = () => json({})
  loading.show.mockClear()
  loading.hide.mockClear()
  dialog.create.mockClear()
  vi.stubGlobal('fetch', async (url: string, init: RequestInit = {}) => {
    const headers: Record<string, string> = {}
    new Headers(init.headers as HeadersInit).forEach((v, k) => (headers[k] = v))
    const call: Call = { method: String(init.method), url, headers, body: init.body }
    calls.push(call)
    const result = handler(call)
    // like fetch: an aborted request (signal) is rejected with AbortError
    return Promise.race([
      result,
      new Promise<never>((_, reject) =>
        init.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
      )
    ])
  })
})
afterEach(() => {
  vi.useRealTimers()
})

describe('refresh del token su 401', () => {
  it('renews only once for concurrent requests and repeats each one once', async () => {
    const { useAlova } = setup()
    const fresh = jwt()
    handler = ({ url, headers }) => {
      if (url === '/api/auth/refresh-token') return json({ access_token: fresh, token_type: 'bearer' })
      if (url === '/api/auth/user') return json(USER)
      return headers.authorization === `bearer ${fresh}` ? json({ success: true, data: [1] }) : json({ detail: 'x' }, 401)
    }
    const { alova } = useAlova({ url: '/api' })
    const results = await Promise.all([alova.Get('/a'), alova.Get('/b'), alova.Get('/c')])
    expect(results).toEqual([[1], [1], [1]])
    expect(calls.filter(c => c.url === '/api/auth/refresh-token')).toHaveLength(1)
    for (const path of ['/api/a', '/api/b', '/api/c']) {
      expect(calls.filter(c => c.url === path)).toHaveLength(2) // original + a single retry
    }
    expect(dialog.create).not.toHaveBeenCalled()
  })

  it('a second 401 after the retry logs out and rejects without loops or messages', async () => {
    const { useAlova, store } = setup()
    handler = ({ url }) => {
      if (url === '/api/auth/refresh-token') return json({ access_token: jwt(), token_type: 'bearer' })
      if (url === '/api/auth/user') return json(USER)
      return json({ detail: 'no' }, 401)
    }
    const { alova } = useAlova({ url: '/api' })
    await expect(alova.Get('/a')).rejects.toMatchObject({ status: 401 })
    expect(calls.filter(c => c.url === '/api/a')).toHaveLength(2)
    expect(store.refresh_token).toBeNull()
    expect(dialog.create).not.toHaveBeenCalled()
  })

  it('failed refresh: logout and rejection, without retrying the refresh', async () => {
    const { useAlova, store } = setup()
    handler = ({ url }) => (url === '/api/auth/refresh-token' ? json({ detail: 'bad' }, 401) : json({ detail: 'no' }, 401))
    const { alova } = useAlova({ url: '/api' })
    await expect(alova.Get('/a')).rejects.toMatchObject({ status: 401 })
    expect(calls.filter(c => c.url === '/api/auth/refresh-token')).toHaveLength(1)
    expect(store.refresh_token).toBeNull()
  })

  it('a 401 without Authorization (wrong credentials) does not refresh and shows the message', async () => {
    const { useAlova } = setup(false)
    handler = () => json({ detail: 'Credenziali errate' }, 401)
    const { alova } = useAlova({ url: '/api' })
    await expect(alova.Get('/a')).rejects.toMatchObject({ status: 401 })
    expect(calls).toHaveLength(1)
    await vi.waitFor(() => expect(dialog.create).toHaveBeenCalledTimes(1))
  })
})

describe('header Authorization', () => {
  it('applies to relative and same-origin requests, not to external origins', async () => {
    const { useAlova } = setup()
    const { alova } = useAlova()
    await alova.Get('/api/rel')
    await alova.Get('http://use-alova.invalid/api/same')
    await alova.Get('https://evil.example/steal')
    await alova.Get('//evil.example/steal2')
    const auth = (path: string) => calls.find(c => c.url.endsWith(path))?.headers.authorization
    expect(auth('/api/rel')).toBe('bearer old')
    expect(auth('/api/same')).toBe('bearer old')
    expect(auth('/steal')).toBeUndefined()
    expect(auth('/steal2')).toBeUndefined()
  })

  it('uses the backend token_type as scheme', async () => {
    const { useAlova, store } = setup()
    store.token_type = 'Token'
    await useAlova().alova.Get('/api/t')
    expect(calls[0]?.headers.authorization).toBe('Token old')
  })

  it('without a session it does not send Authorization', async () => {
    const { useAlova } = setup(false)
    await useAlova().alova.Get('/api/x')
    expect(calls[0]?.headers.authorization).toBeUndefined()
  })
})

describe('response body', () => {
  it('discards the envelope, lets the rest through and returns null for 204', async () => {
    const { useAlova } = setup()
    const { alova } = useAlova()
    handler = () => json({ success: true, message: 'ok', data: { a: 1 } })
    expect(await alova.Get('/api/a')).toEqual({ a: 1 })
    handler = () => json({ access_token: 't', token_type: 'bearer' })
    expect(await alova.Get('/api/b')).toEqual({ access_token: 't', token_type: 'bearer' })
    handler = () => new Response(null, { status: 204 })
    expect(await alova.Delete('/api/c')).toBeNull()
  })

  it('envelope:false (backend without envelope): the body with success and data is not discarded', async () => {
    const { useAlova } = setup(true, { envelope: false })
    const body = { success: true, message: 'm', data: { a: 1 } }
    handler = () => json(body)
    expect(await useAlova().alova.Get('/api/a')).toEqual(body)
  })

  it('without options the envelope follows http.envelope from the configuration', async () => {
    setPachiConfig({ http: { envelope: false } })
    try {
      const { useAlova } = setup()
      handler = () => json({ success: true, data: 1 })
      expect(await useAlova().alova.Get('/api/a')).toEqual({ success: true, data: 1 })
    } finally {
      setPachiConfig()
    }
  })

  it('Form (login) invia application/x-www-form-urlencoded', async () => {
    const { auth } = setup(false)
    handler = ({ url }) =>
      url === '/api/auth/token'
        ? json({ access_token: jwt(), token_type: 'bearer', refresh_token: 'r' })
        : json(USER)
    await auth.login('mario', 'pw')
    const call = calls.find(c => c.url === '/api/auth/token')
    expect(call?.headers['content-type']).toContain('application/x-www-form-urlencoded')
    expect(String(call?.body)).toBe('username=mario&password=pw&scope=&grant_type=password')
  })

  it('GETs are not cached by default (as with httpachi), with explicit cacheFor they are', async () => {
    const { useAlova } = setup()
    const { alova } = useAlova()
    await alova.Get('/api/n')
    await alova.Get('/api/n')
    expect(calls.filter(c => c.url === '/api/n')).toHaveLength(2)
    await alova.Get('/api/c', { cacheFor: 60_000 })
    await alova.Get('/api/c', { cacheFor: 60_000 })
    expect(calls.filter(c => c.url === '/api/c')).toHaveLength(1)
  })
})

describe('spinner (auto overlay with delay)', () => {
  /** Pending request: resolved on demand. */
  function deferred() {
    let release!: () => void
    const promise = new Promise<Response>(resolve => {
      release = () => resolve(json({ success: true, data: 1 }))
    })
    return { promise, release }
  }

  it('does not show for fast responses, shows after 300 ms and is shared (ref-count)', async () => {
    vi.useFakeTimers()
    const { useAlova } = setup()
    const { alova } = useAlova()
    await alova.Get('/api/fast')
    await vi.advanceTimersByTimeAsync(1000)
    expect(loading.show).not.toHaveBeenCalled()

    const a = deferred()
    const b = deferred()
    const queue = [a, b]
    handler = () => queue.shift()!.promise
    const pa = alova.Get('/api/a').send()
    const pb = alova.Get('/api/b').send()
    await vi.advanceTimersByTimeAsync(299)
    expect(loading.show).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(2)
    expect(loading.show).toHaveBeenCalledTimes(1)
    a.release()
    await pa
    expect(loading.hide).not.toHaveBeenCalled()
    b.release()
    await pb
    expect(loading.hide).toHaveBeenCalledTimes(1)
  })

  it('meta.spinner:false and showOverlay:false do not show it', async () => {
    vi.useFakeTimers()
    const { useAlova } = setup()
    const { alova } = useAlova()
    const a = deferred()
    const b = deferred()
    const queue = [a, b]
    handler = () => queue.shift()!.promise
    const pa = alova.Get('/api/a', { meta: { spinner: false } }).send()
    const pb = alova.Get('/api/b', { showOverlay: false }).send()
    await vi.advanceTimersByTimeAsync(1000)
    a.release()
    b.release()
    await Promise.all([pa, pb])
    expect(loading.show).not.toHaveBeenCalled()
  })

  it('a cache hit does not touch the spinner', async () => {
    vi.useFakeTimers()
    const { useAlova } = setup()
    const { alova } = useAlova()
    await alova.Get('/api/c', { cacheFor: 60_000 })
    const d = deferred()
    handler = () => d.promise // if the hit went to the network it would hang
    await alova.Get('/api/c', { cacheFor: 60_000 })
    await vi.advanceTimersByTimeAsync(1000)
    expect(loading.show).not.toHaveBeenCalled()
    expect(calls).toHaveLength(1)
  })
})

describe('errori', () => {
  const validation = {
    detail: [{ type: 'x', loc: ['body', 'name'], msg: 'bad', input: '', code: 'a.b' }]
  }

  it('shows the dialog with the translated detail and rejects with ResponseError', async () => {
    const { useAlova } = setup()
    handler = () => json(validation, 422)
    await expect(useAlova().alova.Post('/api/x', {})).rejects.toMatchObject({ status: 422 })
    await vi.waitFor(() => expect(dialog.create).toHaveBeenCalledTimes(1))
    const arg = (dialog.create.mock.calls[0] as unknown as [{ title: string; message: string }])[0]
    expect(arg.message).toContain('T(errors.codes.a.b)')
    expect(arg.message).toContain('body.name')
  })

  it('autoError:false (native or via meta) shows nothing but rejects', async () => {
    const { useAlova } = setup()
    handler = () => json(validation, 422)
    const { alova } = useAlova()
    await expect(alova.Get('/api/x', { autoError: false })).rejects.toMatchObject({ status: 422 })
    await expect(alova.Get('/api/y', { meta: { autoError: false } })).rejects.toMatchObject({ status: 422 })
    await new Promise(r => setTimeout(r, 20))
    expect(dialog.create).not.toHaveBeenCalled()
  })

  it('network error: dialog with the error message', async () => {
    const { useAlova } = setup()
    handler = () => Promise.reject(new TypeError('Failed to fetch'))
    await expect(useAlova().alova.Get('/api/x')).rejects.toMatchObject({ status: 0 })
    await vi.waitFor(() => expect(dialog.create).toHaveBeenCalledTimes(1))
  })

  it('an aborted request shows no messages', async () => {
    const { useAlova } = setup()
    handler = ({ }) => new Promise<Response>(() => undefined)
    const method = useAlova().alova.Get('/api/slow')
    const p = method.send()
    method.abort()
    await expect(p).rejects.toBeDefined()
    await new Promise(r => setTimeout(r, 20))
    expect(dialog.create).not.toHaveBeenCalled()
  })
})
