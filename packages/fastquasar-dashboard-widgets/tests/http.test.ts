import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@ilpachi/use-alova', () => ({ getUseAlovaInstance: vi.fn() }))

import { getUseAlovaInstance } from '@ilpachi/use-alova'
import { getPachiWidgetsHttp, resetPachiWidgetsHttp, setPachiWidgetsHttp } from '../src/helpers/http'

const mocked = vi.mocked(getUseAlovaInstance)

/** Creates a fake `useAlova` factory returning `alova`. */
function fakeFactory(alova: unknown): ReturnType<typeof getUseAlovaInstance> {
  return vi.fn(() => ({ alova })) as unknown as ReturnType<typeof getUseAlovaInstance>
}

beforeEach(() => {
  resetPachiWidgetsHttp()
  mocked.mockReset()
})

describe('default from @ilpachi/use-alova', () => {
  it('uses the alova from getUseAlovaInstance()', () => {
    const alova = { Get: vi.fn() }
    const f = fakeFactory(alova)
    mocked.mockReturnValue(f)
    expect(getPachiWidgetsHttp()).toBe(alova)
    expect(f).toHaveBeenCalledTimes(1)
  })

  it('caches the client until the global factory changes', () => {
    const a = { Get: vi.fn() }
    const b = { Get: vi.fn() }
    const fa = fakeFactory(a)
    const fb = fakeFactory(b)
    mocked.mockReturnValue(fa)
    getPachiWidgetsHttp()
    getPachiWidgetsHttp()
    expect(fa).toHaveBeenCalledTimes(1)
    mocked.mockReturnValue(fb)
    expect(getPachiWidgetsHttp()).toBe(b)
    expect(fb).toHaveBeenCalledTimes(1)
  })

  it('throws a clear error if there is no instance', () => {
    mocked.mockImplementation(() => {
      throw new Error('no hook')
    })
    expect(() => getPachiWidgetsHttp()).toThrow(/needs an @ilpachi\/use-alova client.*setPachiWidgetsHttp\(\)/)
  })
})

describe('registered client', () => {
  it('takes precedence and does not query use-alova', async () => {
    const wrapped = { success: true, data: [1] }
    setPachiWidgetsHttp(() => ({ Get: async <T>() => wrapped as T }))
    expect(await getPachiWidgetsHttp().Get('/x')).toBe(wrapped)
    setPachiWidgetsHttp(() => ({ Get: async <T>() => [2] as T }))
    expect(await getPachiWidgetsHttp().Get('/x')).toEqual([2])
    expect(mocked).not.toHaveBeenCalled()
  })
})
