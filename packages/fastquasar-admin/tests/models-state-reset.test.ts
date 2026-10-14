import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getAdminModels, hasAdminModels, loadAdminModels, resetAdminModels } from '../src/helpers/models-state'
import { setPachiAdminOptions, resetPachiAdminOptions } from '../src/helpers/options'
import type { IPachiAdminHttp } from '../src/helpers/http'

vi.mock('@ilpachi/pachi-i18n', () => ({ getPachiI18n: () => undefined, collectLocales: () => ({}), pachiT: (k: string) => k }))

const perms = { view: true, add: false, change: false, delete: false }
const model = (name: string) => [{ app: 'a', model: name, title: name, permissions: perms }]

/** Client finto la cui `GET` e' risolta/rifiutata a mano dal test. */
function controllableHttp() {
  const pending: Array<{ resolve: (v: unknown) => void, reject: (e: unknown) => void }> = []
  const http: IPachiAdminHttp = {
    Get: <T>() => new Promise<T>((resolve, reject) => { pending.push({ resolve: resolve as (v: unknown) => void, reject }) }),
    Post: () => Promise.resolve(null as never),
    Patch: () => Promise.resolve(null as never),
    Delete: () => Promise.resolve(null as never),
  }
  return { http, pending }
}

const settle = async () => { for (let i = 0; i < 5; i++) await Promise.resolve() }

beforeEach(() => resetAdminModels())
afterEach(() => { resetAdminModels(); resetPachiAdminOptions(); vi.useRealTimers() })

describe('reset dei modelli admin', () => {
  it('la risposta in volo di un utente precedente non scrive i modelli del nuovo utente', async () => {
    const { http, pending } = controllableHttp()
    setPachiAdminOptions({ getHttp: () => http })
    const first = loadAdminModels()
    // logout/login con un altro utente mentre la richiesta e' ancora in volo
    resetAdminModels()
    pending[0]!.resolve(model('dell-utente-A'))
    await first
    await settle()
    expect(getAdminModels()).toBeNull()
    // il nuovo utente fa una richiesta sua, non riusa la promise vecchia
    const second = loadAdminModels()
    expect(pending).toHaveLength(2)
    pending[1]!.resolve(model('dell-utente-B'))
    await second
    expect(getAdminModels()?.map((m) => m.model)).toEqual(['dell-utente-B'])
  })

  it('un errore transitorio non diventa "nessun modello" e si riprova dopo la pausa', async () => {
    vi.useFakeTimers()
    const { http, pending } = controllableHttp()
    setPachiAdminOptions({ getHttp: () => http })
    const run = loadAdminModels()
    pending[0]!.reject(Object.assign(new Error('rete'), { status: 503 }))
    await run
    expect(getAdminModels()).toBeNull()
    // subito dopo: nessun nuovo tentativo (pausa)
    void hasAdminModels()
    expect(pending).toHaveLength(1)
    vi.advanceTimersByTime(11_000)
    void hasAdminModels()
    expect(pending).toHaveLength(2)
  })

  it('401/403/404 sono definitivi: elenco vuoto, nessun nuovo tentativo', async () => {
    const { http, pending } = controllableHttp()
    setPachiAdminOptions({ getHttp: () => http })
    const run = loadAdminModels()
    pending[0]!.reject(Object.assign(new Error('forbidden'), { status: 403 }))
    await run
    expect(getAdminModels()).toEqual([])
    void hasAdminModels()
    expect(pending).toHaveLength(1)
  })
})
