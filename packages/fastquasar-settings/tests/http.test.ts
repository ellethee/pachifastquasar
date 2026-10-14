import { beforeEach, describe, expect, it, vi } from 'vitest'

const getInstance = vi.hoisted(() => vi.fn())
vi.mock('@ilpachi/use-alova', () => ({ getUseAlovaInstance: getInstance }))

import { defaultGetHttp, getPachiSettingsOptions, setPachiSettingsOptions } from '../src/helpers/http'

/** Crea una factory finta che restituisce un client nuovo a ogni chiamata. */
function makeFactory() {
  return vi.fn((_opts?: { url?: string }) => ({ alova: { Get: vi.fn(), Put: vi.fn() } }))
}

beforeEach(() => {
  getInstance.mockReset()
  setPachiSettingsOptions({ baseUrl: '/api/auth' })
})

describe('client HTTP di default', () => {
  it('usa getUseAlovaInstance()({ url: baseUrl }).alova', () => {
    const factory = makeFactory()
    getInstance.mockReturnValue(factory)
    setPachiSettingsOptions({ baseUrl: '/api/x' })
    const http = getPachiSettingsOptions().getHttp()
    expect(factory).toHaveBeenCalledWith({ url: '/api/x' })
    expect(http).toBe(factory.mock.results[0]!.value.alova)
  })

  it('memorizza il client finché factory e baseUrl non cambiano', () => {
    const factory = makeFactory()
    getInstance.mockReturnValue(factory)
    setPachiSettingsOptions({ baseUrl: '/a' })
    const first = defaultGetHttp()
    expect(defaultGetHttp()).toBe(first)
    expect(factory).toHaveBeenCalledTimes(1)
    setPachiSettingsOptions({ baseUrl: '/b' })
    const second = defaultGetHttp()
    expect(second).not.toBe(first)
    expect(factory).toHaveBeenLastCalledWith({ url: '/b' })
    const other = makeFactory()
    getInstance.mockReturnValue(other)
    expect(defaultGetHttp()).not.toBe(second)
    expect(other).toHaveBeenCalledTimes(1)
  })

  it('senza istanza use-alova lancia un errore chiaro', () => {
    getInstance.mockImplementation(() => { throw new Error('no instance') })
    expect(() => defaultGetHttp()).toThrow(/needs an @ilpachi\/use-alova client.*createUseAlova\(\).*getHttp/)
  })

  it('getHttp personalizzato ha la precedenza', () => {
    const custom = { Get: vi.fn(), Put: vi.fn() }
    setPachiSettingsOptions({ getHttp: () => custom })
    expect(getPachiSettingsOptions().getHttp()).toBe(custom)
    expect(getInstance).not.toHaveBeenCalled()
    setPachiSettingsOptions({ getHttp: defaultGetHttp })
  })
})
