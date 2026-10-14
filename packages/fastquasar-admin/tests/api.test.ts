import { describe, expect, it, vi } from 'vitest'
import { createAdminApi, rowPath } from '../src/helpers/api'
import type { IPachiAdminHttp } from '../src/helpers/http'

/** Client finto che registra le chiamate. */
function fakeHttp(result: unknown = {}): { http: IPachiAdminHttp, calls: unknown[][] } {
  const calls: unknown[][] = []
  const rec = (m: string) => (...a: unknown[]) => { calls.push([m, ...a]); return Promise.resolve(result) }
  return { http: { Get: rec('GET'), Post: rec('POST'), Patch: rec('PATCH'), Delete: rec('DELETE') } as unknown as IPachiAdminHttp, calls }
}

describe('api', () => {
  it('percorsi con pk uuid/stringa codificata', () => {
    expect(rowPath('a', 'm', 'x/y z')).toBe('/a/m/x%2Fy%20z')
  })

  it('metodi e URL', async () => {
    const { http, calls } = fakeHttp({ affected: 2 })
    const api = createAdminApi(http)
    await api.getSchema('demo', 'item')
    await api.list('demo', 'item', { page: 1, pageSize: 25 })
    await api.create('demo', 'item', { name: 'a' })
    await api.update('demo', 'item', 5, { name: 'b' })
    await api.remove('demo', 'item', 5)
    await api.runAction('demo', 'item', 'archive', [1, 2])
    await api.options('auth', 'user', { ids: [3] })
    await api.history('demo', 'item', 5, 2, 10)
    expect(calls.map((c) => [c[0], c[1]])).toEqual([
      ['GET', '/demo/item/_schema'],
      ['GET', '/demo/item?page=1&pageSize=25'],
      ['POST', '/demo/item'],
      ['PATCH', '/demo/item/5'],
      ['DELETE', '/demo/item/5'],
      ['POST', '/demo/item/_actions/archive'],
      ['GET', '/auth/user/_options?ids=3'],
      ['GET', '/demo/item/5/history?page=2&pageSize=10'],
    ])
    expect(calls[5]![2]).toEqual({ ids: [1, 2] })
  })

  it('listModels senza corpo restituisce []', async () => {
    const get = vi.fn().mockResolvedValue(null)
    const api = createAdminApi({ Get: get } as unknown as IPachiAdminHttp)
    expect(await api.listModels()).toEqual([])
    expect(get.mock.calls[0]![0]).toBe('')
  })
})
