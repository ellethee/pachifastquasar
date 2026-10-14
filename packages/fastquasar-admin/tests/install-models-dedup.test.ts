import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AUTH_CHANGED_EVENT, installPachiAdmin } from '../src/services/install'
import { fetchAdminModels, hasAdminModels, resetAdminModels } from '../src/helpers/models-state'
import { createAdminApi } from '../src/helpers/api'
import { resetPachiAdminOptions } from '../src/helpers/options'
import type { IPachiAdminHttp } from '../src/helpers/http'

vi.mock('@ilpachi/pachi-i18n', () => ({ getPachiI18n: () => undefined, collectLocales: () => ({}), pachiT: (k: string) => k }))

const perms = { view: true, add: false, change: false, delete: false }
const MODELS = [{ app: 'a', model: 'm', title: 'M', permissions: perms }]

let calls: string[]
let uninstall: () => void
let target: EventTarget

/** Client finto: conta le richieste `GET` e risponde con l'elenco dei modelli. */
function fakeHttp(): IPachiAdminHttp {
  return {
    Get: <T>(url: string) => {
      calls.push(url)
      return Promise.resolve(MODELS as unknown as T)
    },
    Post: () => Promise.resolve(null as never),
    Patch: () => Promise.resolve(null as never),
    Delete: () => Promise.resolve(null as never),
  }
}

/** Emette `pachi:auth-changed` come fa la shell. */
function emitAuth(userId: string | null): void {
  target.dispatchEvent(new CustomEvent(AUTH_CHANGED_EVENT, {
    detail: { authenticated: userId !== null, userId, username: userId },
  }))
}

/** Lascia completare le promise in sospeso. */
async function settle(): Promise<void> {
  for (let i = 0; i < 5; i++) await Promise.resolve()
}

beforeEach(() => {
  calls = []
  target = new EventTarget()
  vi.stubGlobal('window', target)
  uninstall = installPachiAdmin({ getHttp: fakeHttp })
})

afterEach(() => {
  uninstall()
  resetAdminModels()
  resetPachiAdminOptions()
  vi.unstubAllGlobals()
})

describe('GET /api/admin/models al primo caricamento', () => {
  it('menu che parte prima del primo pachi:auth-changed: una sola richiesta anche se la pagina si monta dopo', async () => {
    // il menu legge `visible` con la sessione ripristinata dallo storage: parte il caricamento
    expect(hasAdminModels()).toBe(false)
    await settle()
    // la shell conferma l'utente (primo evento): non deve buttare via l'elenco già richiesto
    emitAuth('u1')
    await settle()
    // la pagina Admin si monta e chiede l'elenco
    await fetchAdminModels(createAdminApi(fakeHttp()))
    expect(calls).toHaveLength(1)
    expect(hasAdminModels()).toBe(true)
  })

  it('richiesta ancora in volo quando arriva l\'evento: pagina e menu la condividono', async () => {
    hasAdminModels()
    emitAuth('u1')
    const list = fetchAdminModels(createAdminApi(fakeHttp()))
    hasAdminModels()
    await list
    await settle()
    expect(calls).toHaveLength(1)
  })

  it('un altro utente invalida l\'elenco e lo ricarica', async () => {
    hasAdminModels()
    await settle()
    emitAuth('u1')
    await settle()
    emitAuth('u2')
    await settle()
    expect(calls).toHaveLength(2)
  })

  it('l\'evento con lo stesso utente non ripete la richiesta', async () => {
    emitAuth('u1')
    await settle()
    emitAuth('u1')
    await settle()
    expect(calls).toHaveLength(1)
  })
})
