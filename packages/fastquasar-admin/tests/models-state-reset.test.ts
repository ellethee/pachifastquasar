import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getAdminModels, hasAdminModels, loadAdminModels, resetAdminModels } from '../src/helpers/models-state'
import { setPachiAdminOptions, resetPachiAdminOptions } from '../src/helpers/options'
import type { IPachiAdminHttp } from '../src/helpers/http'

vi.mock('@ilpachi/pachi-i18n', () => ({ getPachiI18n: () => undefined, collectLocales: () => ({}), pachiT: (k: string) => k }))

const perms = { view: true, add: false, change: false, delete: false }
const model = (name: string) => [{ app: 'a', model: name, title: name, permissions: perms }]

/** Fake client whose `GET` is resolved/rejected by hand in the test. */
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

describe('admin models reset', () => {
  it('the in-flight response of a previous user does not write the new user\'s models', async () => {
    const { http, pending } = controllableHttp()
    setPachiAdminOptions({ getHttp: () => http })
    const first = loadAdminModels()
    // logout/login with another user while the request is still in flight
    resetAdminModels()
    pending[0]!.resolve(model('of-user-A'))
    await first
    await settle()
    expect(getAdminModels()).toBeNull()
    // the new user makes their own request, it does not reuse the old promise
    const second = loadAdminModels()
    expect(pending).toHaveLength(2)
    pending[1]!.resolve(model('of-user-B'))
    await second
    expect(getAdminModels()?.map((m) => m.model)).toEqual(['of-user-B'])
  })

  it('a transient error does not become "no models" and is retried after the pause', async () => {
    vi.useFakeTimers()
    const { http, pending } = controllableHttp()
    setPachiAdminOptions({ getHttp: () => http })
    const run = loadAdminModels()
    pending[0]!.reject(Object.assign(new Error('network'), { status: 503 }))
    await run
    expect(getAdminModels()).toBeNull()
    // right after: no new attempt (pause)
    void hasAdminModels()
    expect(pending).toHaveLength(1)
    vi.advanceTimersByTime(11_000)
    void hasAdminModels()
    expect(pending).toHaveLength(2)
  })

  it('401/403/404 are definitive: empty list, no new attempt', async () => {
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
