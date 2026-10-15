import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const getUseAlovaInstance = vi.hoisted(() => vi.fn())
vi.mock('@ilpachi/use-alova', () => ({ getUseAlovaInstance }))

import { resolvePachiProfileHttp, setPachiProfileHttp } from '../src/helpers/http'

describe('resolvePachiProfileHttp', () => {
  beforeEach(() => {
    setPachiProfileHttp(null)
    getUseAlovaInstance.mockReset()
  })
  afterEach(() => setPachiProfileHttp(null))

  it('uses the alova client from getUseAlovaInstance with apiBase', () => {
    const alova = { Get: vi.fn(), Post: vi.fn() }
    const factory = vi.fn(() => ({ alova }))
    getUseAlovaInstance.mockReturnValue(factory)
    expect(resolvePachiProfileHttp('/x')).toBe(alova)
    expect(factory).toHaveBeenCalledWith({ url: '/x' })
  })

  it('caches the client per factory and apiBase', () => {
    const factory = vi.fn(() => ({ alova: { Get: vi.fn(), Post: vi.fn() } }))
    getUseAlovaInstance.mockReturnValue(factory)
    const a = resolvePachiProfileHttp('/api')
    expect(resolvePachiProfileHttp('/api')).toBe(a)
    expect(factory).toHaveBeenCalledTimes(1)
    expect(resolvePachiProfileHttp('/other')).not.toBe(a)
    expect(factory).toHaveBeenCalledTimes(2)
    const factory2 = vi.fn(() => ({ alova: { Get: vi.fn(), Post: vi.fn() } }))
    getUseAlovaInstance.mockReturnValue(factory2)
    expect(resolvePachiProfileHttp('/other')).not.toBe(a)
    expect(factory2).toHaveBeenCalledTimes(1)
  })

  it('throws a clear error without an instance', () => {
    getUseAlovaInstance.mockImplementation(() => {
      throw new Error('no instance')
    })
    expect(() => resolvePachiProfileHttp()).toThrow(/needs an @ilpachi\/use-alova client/)
  })

  it('setPachiProfileHttp takes precedence', () => {
    const client = { Get: vi.fn(), Post: vi.fn() }
    setPachiProfileHttp(() => client)
    expect(resolvePachiProfileHttp()).toBe(client)
    expect(getUseAlovaInstance).not.toHaveBeenCalled()
  })
})
