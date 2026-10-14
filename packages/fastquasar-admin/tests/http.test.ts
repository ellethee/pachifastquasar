import { beforeEach, describe, expect, it, vi } from 'vitest'

const getInstance = vi.hoisted(() => vi.fn())
const failing = vi.hoisted(() => ({ on: false }))
vi.mock('@ilpachi/use-alova', () => ({
  getUseAlovaInstance: (): unknown => {
    if (failing.on) throw new Error('no instance')
    return getInstance()
  },
}))

import { resolveHttp } from '../src/helpers/http'
import type { IPachiAdminHttp } from '../src/helpers/http'

describe('resolveHttp', () => {
  beforeEach(() => {
    getInstance.mockReset()
    failing.on = false
  })

  it('usa getHttp se presente, senza toccare use-alova', () => {
    const custom = {} as IPachiAdminHttp
    expect(resolveHttp('/x', () => custom)).toBe(custom)
    expect(getInstance).not.toHaveBeenCalled()
  })

  it('di default usa getUseAlovaInstance() e riusa il client in cache', () => {
    const alova = { Get: vi.fn() }
    const factory = vi.fn().mockReturnValue({ alova })
    getInstance.mockReturnValue(factory)
    const a = resolveHttp('/api/admin/models')
    const b = resolveHttp('/api/admin/models')
    expect(a).toBe(alova)
    expect(b).toBe(a)
    expect(factory).toHaveBeenCalledTimes(1)
    expect(factory).toHaveBeenCalledWith({ url: '/api/admin/models' })
    resolveHttp('/altro')
    expect(factory).toHaveBeenCalledTimes(2)
  })

  it('con una nuova factory ricrea il client', () => {
    const f1 = vi.fn().mockReturnValue({ alova: { id: 1 } })
    const f2 = vi.fn().mockReturnValue({ alova: { id: 2 } })
    getInstance.mockReturnValueOnce(f1).mockReturnValueOnce(f2)
    expect(resolveHttp('/u')).not.toBe(resolveHttp('/u'))
  })

  it('senza istanza lancia un errore chiaro', () => {
    failing.on = true
    let msg = ''
    try { resolveHttp('/u') } catch (e) { msg = String((e as Error).message) }
    expect(msg).toMatch(/needs an @ilpachi\/use-alova client/)
  })
})
