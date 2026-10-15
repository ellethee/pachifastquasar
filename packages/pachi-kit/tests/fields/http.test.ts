import { beforeEach, describe, expect, it, vi } from 'vitest'

const get = vi.fn((_url: string, _config?: unknown) => Promise.resolve({ ok: true }))
const factory = vi.fn((_opts?: unknown) => ({ alova: { Get: get } }))
const getUseAlovaInstance = vi.fn(() => factory)

vi.mock('@ilpachi/use-alova', () => ({ getUseAlovaInstance: () => getUseAlovaInstance() }))

describe('getPachiFieldsHttp', () => {
  beforeEach(() => {
    vi.resetModules()
    get.mockClear()
    factory.mockClear()
    getUseAlovaInstance.mockReset()
    getUseAlovaInstance.mockImplementation(() => factory)
  })

  it('by default it uses the use-alova client with cacheFor null', async () => {
    const { getPachiFieldsHttp } = await import('../../src/fields/helpers/http')
    await getPachiFieldsHttp().get('/api/x', { a: 1 })
    expect(factory).toHaveBeenCalledWith({ url: '' })
    expect(get).toHaveBeenCalledWith('/api/x', { params: { a: 1 }, cacheFor: null })
    await getPachiFieldsHttp().get('/api/y')
    expect(get).toHaveBeenLastCalledWith('/api/y', { cacheFor: null })
  })

  it('memoizes the client as long as the factory stays the same', async () => {
    const { getPachiFieldsHttp } = await import('../../src/fields/helpers/http')
    expect(getPachiFieldsHttp()).toBe(getPachiFieldsHttp())
    expect(factory).toHaveBeenCalledTimes(1)
  })

  it('setPachiFieldsHttp takes precedence', async () => {
    const { getPachiFieldsHttp, setPachiFieldsHttp } = await import('../../src/fields/helpers/http')
    const custom = { get: vi.fn() }
    setPachiFieldsHttp(custom as never)
    expect(getPachiFieldsHttp()).toBe(custom)
    expect(getUseAlovaInstance).not.toHaveBeenCalled()
  })

  it('without a use-alova instance it throws a clear error', async () => {
    getUseAlovaInstance.mockImplementation(() => {
      throw new Error('no instance')
    })
    const { getPachiFieldsHttp } = await import('../../src/fields/helpers/http')
    expect(() => getPachiFieldsHttp()).toThrow(/needs an @ilpachi\/use-alova client.*setPachiFieldsHttp\(\)/)
  })
})
