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

/** Fake client: counts the `GET` requests and replies with the model list. */
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

/** Emits `pachi:auth-changed` as the shell does. */
function emitAuth(userId: string | null): void {
  target.dispatchEvent(new CustomEvent(AUTH_CHANGED_EVENT, {
    detail: { authenticated: userId !== null, userId, username: userId },
  }))
}

/** Lets pending promises complete. */
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

describe('GET /api/admin/models on first load', () => {
  it('menu starting before the first pachi:auth-changed: a single request even if the page mounts later', async () => {
    // the menu reads `visible` with the session restored from storage: loading starts
    expect(hasAdminModels()).toBe(false)
    await settle()
    // the shell confirms the user (first event): it must not throw away the already requested list
    emitAuth('u1')
    await settle()
    // the Admin page mounts and requests the list
    await fetchAdminModels(createAdminApi(fakeHttp()))
    expect(calls).toHaveLength(1)
    expect(hasAdminModels()).toBe(true)
  })

  it('request still in flight when the event arrives: page and menu share it', async () => {
    hasAdminModels()
    emitAuth('u1')
    const list = fetchAdminModels(createAdminApi(fakeHttp()))
    hasAdminModels()
    await list
    await settle()
    expect(calls).toHaveLength(1)
  })

  it('another user invalidates the list and reloads it', async () => {
    hasAdminModels()
    await settle()
    emitAuth('u1')
    await settle()
    emitAuth('u2')
    await settle()
    expect(calls).toHaveLength(2)
  })

  it('the event with the same user does not repeat the request', async () => {
    emitAuth('u1')
    await settle()
    emitAuth('u1')
    await settle()
    expect(calls).toHaveLength(1)
  })
})
