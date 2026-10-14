import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('quasar', () => ({ Notify: { create: vi.fn() }, Dark: { isActive: true, set: vi.fn(), toggle: vi.fn() } }))
vi.mock('@ilpachi/pachi-i18n', () => ({ getPachiI18n: () => undefined, matchLocale: () => undefined, pachiT: (k: string) => k }))

import { setPachiSettingsOptions } from '../src/helpers/http'
import { SettingsManager } from '../src/services/settings-manager'

/** PUT finti: ognuno resta in sospeso finche' il test non lo risolve. */
const puts: Array<{ value: unknown, done: () => void }> = []

beforeEach(() => {
  setActivePinia(createPinia())
  ;(SettingsManager as unknown as { instance: unknown }).instance = undefined
  puts.length = 0
  vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => undefined, removeItem: () => undefined })
  setPachiSettingsOptions({
    isAuthenticated: () => true,
    getHttp: () => ({
      Get: () => Promise.resolve({}),
      Put: (_url: string, body: { value: unknown }) => new Promise<unknown>((resolve) => {
        puts.push({ value: body.value, done: () => resolve({}) })
      }),
    }),
  } as never)
})

const tick = async () => { for (let i = 0; i < 8; i++) await Promise.resolve() }

describe('salvataggio delle impostazioni', () => {
  it('i PUT della stessa chiave sono serializzati: il secondo parte a fine del primo', async () => {
    const m = SettingsManager.getInstance()
    m.set('preferences', 'tablePageSize', 25)
    const first = m.flushAll()
    await tick()
    expect(puts.map((p) => p.value)).toEqual([25])
    m.set('preferences', 'tablePageSize', 50)
    const second = m.flushAll()
    await tick()
    // il primo PUT non e' ancora finito: il secondo non deve essere partito
    expect(puts.map((p) => p.value)).toEqual([25])
    puts[0]!.done()
    await first
    await tick()
    expect(puts.map((p) => p.value)).toEqual([25, 50])
    puts[1]!.done()
    await second
  })

  it('flushAll invia subito i salvataggi in attesa del debounce', async () => {
    const m = SettingsManager.getInstance()
    m.set('appearance', 'accent', 'teal')
    expect(puts).toHaveLength(0)
    const all = m.flushAll()
    await tick()
    expect(puts.map((p) => p.value)).toEqual(['teal'])
    puts[0]!.done()
    await all
  })
})
