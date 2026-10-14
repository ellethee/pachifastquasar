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
// niente WebSocket reale: la connessione agli eventi è opzionale e lazy
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
// l'istanza `$q` dell'app (la registra createPachiApp): plugin fittizi
setPachiQuasar({ dialog: dialog.create, notify: vi.fn(), loading } as never)
const { AuthManager } = await import('src/services/auth-manager/auth-manager')
const { useAuthStore } = await import('src/services/auth-manager/auth-store')

interface Call {
  method: string
  url: string
  headers: Record<string, string>
  body: unknown
}

/** Gestore fittizio: restituisce la risposta per una richiesta (o una Promise per controllarne i tempi). */
type Handler = (call: Call) => Response | Promise<Response>

let calls: Call[] = []
let handler: Handler = () => json({})

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

/** Token JWT-like (payload con `exp`) usato dal refresh per programmare il rinnovo. */
const jwt = (): string => `h.${btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }))}.s`

const USER = {
  id: '1', username: 'u', email: null, firstName: 'A', lastName: 'B', isActive: true,
  isStaff: false, isSuperuser: false, permissions: []
}

/** Crea la factory HTTP e il singleton AuthManager con una sessione già avviata. */
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
    // come fetch: una richiesta annullata (signal) viene rifiutata con AbortError
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
  it('rinnova una sola volta per richieste concorrenti e ripete ciascuna una volta', async () => {
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
      expect(calls.filter(c => c.url === path)).toHaveLength(2) // originale + un solo retry
    }
    expect(dialog.create).not.toHaveBeenCalled()
  })

  it('un secondo 401 dopo il retry esegue il logout e rifiuta senza cicli né messaggi', async () => {
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

  it('refresh fallito: logout e rifiuto, senza ritentare il refresh', async () => {
    const { useAlova, store } = setup()
    handler = ({ url }) => (url === '/api/auth/refresh-token' ? json({ detail: 'bad' }, 401) : json({ detail: 'no' }, 401))
    const { alova } = useAlova({ url: '/api' })
    await expect(alova.Get('/a')).rejects.toMatchObject({ status: 401 })
    expect(calls.filter(c => c.url === '/api/auth/refresh-token')).toHaveLength(1)
    expect(store.refresh_token).toBeNull()
  })

  it('un 401 senza Authorization (credenziali errate) non fa il refresh e mostra il messaggio', async () => {
    const { useAlova } = setup(false)
    handler = () => json({ detail: 'Credenziali errate' }, 401)
    const { alova } = useAlova({ url: '/api' })
    await expect(alova.Get('/a')).rejects.toMatchObject({ status: 401 })
    expect(calls).toHaveLength(1)
    await vi.waitFor(() => expect(dialog.create).toHaveBeenCalledTimes(1))
  })
})

describe('header Authorization', () => {
  it('va alle richieste relative e same-origin, non alle origini esterne', async () => {
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

  it('usa il token_type del backend come schema', async () => {
    const { useAlova, store } = setup()
    store.token_type = 'Token'
    await useAlova().alova.Get('/api/t')
    expect(calls[0]?.headers.authorization).toBe('Token old')
  })

  it('senza sessione non invia Authorization', async () => {
    const { useAlova } = setup(false)
    await useAlova().alova.Get('/api/x')
    expect(calls[0]?.headers.authorization).toBeUndefined()
  })
})

describe('corpo delle risposte', () => {
  it('scarta l\'envelope, lascia passare il resto e restituisce null per 204', async () => {
    const { useAlova } = setup()
    const { alova } = useAlova()
    handler = () => json({ success: true, message: 'ok', data: { a: 1 } })
    expect(await alova.Get('/api/a')).toEqual({ a: 1 })
    handler = () => json({ access_token: 't', token_type: 'bearer' })
    expect(await alova.Get('/api/b')).toEqual({ access_token: 't', token_type: 'bearer' })
    handler = () => new Response(null, { status: 204 })
    expect(await alova.Delete('/api/c')).toBeNull()
  })

  it('envelope:false (backend senza envelope): il corpo con success e data non viene scartato', async () => {
    const { useAlova } = setup(true, { envelope: false })
    const body = { success: true, message: 'm', data: { a: 1 } }
    handler = () => json(body)
    expect(await useAlova().alova.Get('/api/a')).toEqual(body)
  })

  it('senza opzioni l\'envelope segue http.envelope della configurazione', async () => {
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

  it('le GET non sono in cache di default (come con httpachi), con cacheFor esplicito sì', async () => {
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

describe('spinner (overlay auto con ritardo)', () => {
  /** Richiesta sospesa: si risolve a comando. */
  function deferred() {
    let release!: () => void
    const promise = new Promise<Response>(resolve => {
      release = () => resolve(json({ success: true, data: 1 }))
    })
    return { promise, release }
  }

  it('non compare per risposte veloci, compare dopo 300 ms ed è condiviso (ref-count)', async () => {
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

  it('meta.spinner:false e showOverlay:false non lo mostrano', async () => {
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

  it('una cache hit non tocca lo spinner', async () => {
    vi.useFakeTimers()
    const { useAlova } = setup()
    const { alova } = useAlova()
    await alova.Get('/api/c', { cacheFor: 60_000 })
    const d = deferred()
    handler = () => d.promise // se la hit andasse in rete resterebbe appesa
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

  it('mostra il dialog con il dettaglio tradotto e rifiuta con ResponseError', async () => {
    const { useAlova } = setup()
    handler = () => json(validation, 422)
    await expect(useAlova().alova.Post('/api/x', {})).rejects.toMatchObject({ status: 422 })
    await vi.waitFor(() => expect(dialog.create).toHaveBeenCalledTimes(1))
    const arg = (dialog.create.mock.calls[0] as unknown as [{ title: string; message: string }])[0]
    expect(arg.message).toContain('T(errors.codes.a.b)')
    expect(arg.message).toContain('body.name')
  })

  it('autoError:false (nativo o via meta) non mostra nulla ma rifiuta', async () => {
    const { useAlova } = setup()
    handler = () => json(validation, 422)
    const { alova } = useAlova()
    await expect(alova.Get('/api/x', { autoError: false })).rejects.toMatchObject({ status: 422 })
    await expect(alova.Get('/api/y', { meta: { autoError: false } })).rejects.toMatchObject({ status: 422 })
    await new Promise(r => setTimeout(r, 20))
    expect(dialog.create).not.toHaveBeenCalled()
  })

  it('errore di rete: dialog con il messaggio dell\'errore', async () => {
    const { useAlova } = setup()
    handler = () => Promise.reject(new TypeError('Failed to fetch'))
    await expect(useAlova().alova.Get('/api/x')).rejects.toMatchObject({ status: 0 })
    await vi.waitFor(() => expect(dialog.create).toHaveBeenCalledTimes(1))
  })

  it('una richiesta annullata non mostra messaggi', async () => {
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
