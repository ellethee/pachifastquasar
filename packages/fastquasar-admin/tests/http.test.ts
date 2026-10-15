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

  it('uses getHttp if present, without touching use-alova', () => {
    const custom = {} as IPachiAdminHttp
    expect(resolveHttp('/x', () => custom)).toBe(custom)
    expect(getInstance).not.toHaveBeenCalled()
  })

  it('by default uses getUseAlovaInstance() and reuses the cached client', () => {
    const alova = { Get: vi.fn() }
    const factory = vi.fn().mockReturnValue({ alova })
    getInstance.mockReturnValue(factory)
    const a = resolveHttp('/api/admin/models')
    const b = resolveHttp('/api/admin/models')
    expect(a).toBe(alova)
    expect(b).toBe(a)
    expect(factory).toHaveBeenCalledTimes(1)
    expect(factory).toHaveBeenCalledWith({ url: '/api/admin/models' })
    resolveHttp('/other')
    expect(factory).toHaveBeenCalledTimes(2)
  })

  it('with a new factory it recreates the client', () => {
    const f1 = vi.fn().mockReturnValue({ alova: { id: 1 } })
    const f2 = vi.fn().mockReturnValue({ alova: { id: 2 } })
    getInstance.mockReturnValueOnce(f1).mockReturnValueOnce(f2)
    expect(resolveHttp('/u')).not.toBe(resolveHttp('/u'))
  })

  it('without an instance it throws a clear error', () => {
    failing.on = true
    let msg = ''
    try { resolveHttp('/u') } catch (e) { msg = String((e as Error).message) }
    expect(msg).toMatch(/needs an @ilpachi\/use-alova client/)
  })
})
