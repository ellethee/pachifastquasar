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

  it('usa getUseAlovaInstance() e passa l\'url', () => {
    const alova = createPachiAlova({ url: '/api/users' }) as unknown as { url: string }
    expect(useAlovaMock).toHaveBeenCalledWith({ url: '/api/users' })
    expect(alova.url).toBe('/api/users')
  })

  it('usa url vuota se non indicata', () => {
    createPachiAlova()
    expect(useAlovaMock).toHaveBeenCalledWith({ url: '' })
  })

  it('riusa l\'istanza se url e useAlova non cambiano, la ricrea se cambia l\'url', () => {
    const a = createPachiAlova({ url: '/a' })
    expect(createPachiAlova({ url: '/a' })).toBe(a)
    expect(createPachiAlova({ url: '/b' })).not.toBe(a)
  })

  it('lancia un errore chiaro senza istanza use-alova', () => {
    getInstanceMock.mockImplementation(() => { throw new Error('none') })
    expect(() => createPachiAlova({ url: '/x' })).toThrow(/needs an @ilpachi\/use-alova client/)
  })

  it('la factory personalizzata ha la precedenza (e va per ultima: stato globale)', () => {
    const custom = vi.fn(() => ({ tag: 'custom' }) as never)
    setPachiAlovaFactory(custom as PachiAlovaFactory)
    expect(createPachiAlova({ url: '/z' })).toEqual({ tag: 'custom' })
    expect(custom).toHaveBeenCalledWith({ url: '/z' })
    expect(getInstanceMock).not.toHaveBeenCalled()
  })
})
