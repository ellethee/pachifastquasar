import { beforeEach, describe, expect, it, vi } from 'vitest'

const useAlovaMock = vi.fn((params?: { url?: string } | null) => ({ alova: { tag: 'alova', url: params?.url } }))
const getInstanceMock = vi.fn(() => useAlovaMock)

vi.mock('@ilpachi/use-alova', () => ({ getUseAlovaInstance: () => getInstanceMock() }))

import { createPachiAlova, setPachiAlovaFactory } from '../../src/table/helpers/alova-helper'
import type { PachiAlovaFactory } from '../../src/table/helpers/alova-helper'

describe('createPachiAlova', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getInstanceMock.mockImplementation(() => useAlovaMock)
  })

  it('uses getUseAlovaInstance() and passes the url', () => {
    const alova = createPachiAlova({ url: '/api/users' }) as unknown as { url: string }
    expect(useAlovaMock).toHaveBeenCalledWith({ url: '/api/users' })
    expect(alova.url).toBe('/api/users')
  })

  it('uses an empty url if not given', () => {
    createPachiAlova()
    expect(useAlovaMock).toHaveBeenCalledWith({ url: '' })
  })

  it('reuses the instance if url and useAlova do not change, recreates it if the url changes', () => {
    const a = createPachiAlova({ url: '/a' })
    expect(createPachiAlova({ url: '/a' })).toBe(a)
    expect(createPachiAlova({ url: '/b' })).not.toBe(a)
  })

  it('throws a clear error without a use-alova instance', () => {
    getInstanceMock.mockImplementation(() => { throw new Error('none') })
    expect(() => createPachiAlova({ url: '/x' })).toThrow(/needs an @ilpachi\/use-alova client/)
  })

  it('the custom factory takes precedence (and goes last: global state)', () => {
    const custom = vi.fn(() => ({ tag: 'custom' }) as never)
    setPachiAlovaFactory(custom as PachiAlovaFactory)
    expect(createPachiAlova({ url: '/z' })).toEqual({ tag: 'custom' })
    expect(custom).toHaveBeenCalledWith({ url: '/z' })
    expect(getInstanceMock).not.toHaveBeenCalled()
  })
})
