import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const dark = vi.hoisted(() => ({ isActive: true, set: vi.fn(), toggle: vi.fn() }))
vi.mock('quasar', () => ({ Notify: { create: vi.fn() }, Dark: dark }))
vi.mock('@ilpachi/pachi-i18n', () => ({
  getPachiI18n: () => undefined,
  matchLocale: () => undefined,
  pachiT: (k: string) => k,
}))

import { setPachiSettingsOptions } from '../src/helpers/http'
import { handleAuthChanged, handleLocaleChanged, handleThemeChanged } from '../src/services/auth-sync'
import { SettingsManager } from '../src/services/settings-manager'
import { readSettingsCache, settingsCacheKey } from '../src/services/settings-cache'

const schema = {
  appearance: {
    title: 'A', icon: null, route: null,
    fields: {
      theme: { component: 'select', apply: 'theme' },
      accent: { component: 'select', apply: 'accent' },
      density: { component: 'select', apply: 'density' },
    },
  },
  preferences: { title: 'P', icon: null, route: null, fields: { locale: { component: 'select', apply: 'locale' }, tablePageSize: { component: 'number' } } },
}
/** Valori per utente (simula il backend). */
const backend: Record<string, Record<string, Record<string, unknown>>> = {
  u1: { appearance: { theme: 'light', accent: 'indigo', density: 'compact' }, preferences: { locale: 'en', tablePageSize: 50 } },
  u2: { appearance: { theme: 'dark', accent: 'teal', density: 'comf' }, preferences: { locale: null, tablePageSize: 25 } },
}
let currentUser = 'u1'
const puts: Array<[string, unknown]> = []
const storage = new Map<string, string>()
const attrs = new Map<string, string>()
const css = new Map<string, string>()

beforeEach(() => {
  setActivePinia(createPinia())
  ;(SettingsManager as unknown as { instance: unknown }).instance = undefined
  storage.clear(); attrs.clear(); css.clear(); puts.length = 0
  dark.set.mockClear()
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => storage.get(k) ?? null,
    setItem: (k: string, v: string) => void storage.set(k, v),
    removeItem: (k: string) => void storage.delete(k),
  })
  vi.stubGlobal('document', {
    documentElement: {
      setAttribute: (k: string, v: string) => void attrs.set(k, v),
      removeAttribute: (k: string) => void attrs.delete(k),
      style: { setProperty: (k: string, v: string) => void css.set(k, v), removeProperty: (k: string) => void css.delete(k) },
    },
  })
  setPachiSettingsOptions({
    isAuthenticated: () => true,
    getHttp: () => ({
      Get: async (url: string) => (url.endsWith('/schema') ? schema : structuredClone(backend[currentUser])) as never,
      Put: async (url: string, data?: unknown) => { puts.push([url, data]); return undefined },
    }),
  })
})

describe('eventi auth -> settings manager', () => {
  it('al login carica, applica e scrive la cache dell\'utente', async () => {
    await handleAuthChanged({ authenticated: true, userId: 'u1', username: 'ann' })
    const m = SettingsManager.getInstance()
    expect(m.get('appearance', 'accent')).toBe('indigo')
    expect(attrs.get('data-density')).toBe('compact')
    expect(dark.set).toHaveBeenLastCalledWith(false)
    const cache = readSettingsCache('u1')
    expect(cache?.values).toMatchObject({ 'appearance.theme': 'light', 'preferences.locale': 'en' })
    expect(cache?.values).not.toHaveProperty('preferences.tablePageSize')
    expect(cache?.apply['appearance.accent']).toBe('accent')
  })

  it('al boot applica la cache dell\'utente prima della risposta (nessun flash)', () => {
    storage.set(settingsCacheKey('u1'), JSON.stringify({
      v: 1, apply: { 'appearance.density': 'density', 'appearance.accent': 'accent' },
      values: { 'appearance.density': 'compact', 'appearance.accent': 'violet' },
    }))
    SettingsManager.getInstance().primeUser('u1')
    expect(attrs.get('data-density')).toBe('compact')
    expect(css.get('--pachi-accent')).toBeDefined()
  })

  it('al logout svuota lo store e riporta gli applier al default, mantenendo la cache dell\'utente', async () => {
    await handleAuthChanged({ authenticated: true, userId: 'u1' })
    await handleAuthChanged({ authenticated: false, userId: null })
    const m = SettingsManager.getInstance()
    expect(m.get('appearance', 'accent')).toBeUndefined()
    expect(css.size).toBe(0)
    expect(attrs.get('data-density')).toBe('comf')
    expect(readSettingsCache('u1')).not.toBeNull()
    m.set('appearance', 'accent', 'coral')
    expect(puts).toHaveLength(0)
  })

  it('il cambio utente non mostra i dati dell\'altro', async () => {
    await handleAuthChanged({ authenticated: true, userId: 'u1' })
    currentUser = 'u2'
    await handleAuthChanged({ authenticated: true, userId: 'u2' })
    const m = SettingsManager.getInstance()
    expect(m.get('appearance', 'accent')).toBe('teal')
    expect(css.has('--pachi-accent')).toBe(false)
    expect(attrs.get('data-density')).toBe('comf')
    expect(readSettingsCache('u2')?.values['appearance.theme']).toBe('dark')
    currentUser = 'u1'
  })

  it('una risposta in volo di un utente precedente viene scartata', async () => {
    const m = SettingsManager.getInstance()
    const loading = handleAuthChanged({ authenticated: true, userId: 'u1' })
    m.deactivateUser()
    await loading
    expect(m.get('appearance', 'accent')).toBeUndefined()
    expect(css.size).toBe(0)
  })

  it('lo stesso utente già caricato non ricarica', async () => {
    const get = vi.fn(async (url: string) => (url.endsWith('/schema') ? schema : backend['u1']) as never)
    setPachiSettingsOptions({ getHttp: () => ({ Get: get, Put: async () => undefined }) })
    await handleAuthChanged({ authenticated: true, userId: 'u1' })
    await handleAuthChanged({ authenticated: true, userId: 'u1' })
    expect(get).toHaveBeenCalledTimes(2)
  })

  it('set() applica subito, aggiorna la cache e salva (PUT) dopo il debounce', async () => {
    vi.useFakeTimers()
    await handleAuthChanged({ authenticated: true, userId: 'u1' })
    const m = SettingsManager.getInstance()
    m.set('appearance', 'density', 'comf')
    expect(attrs.get('data-density')).toBe('comf')
    expect(readSettingsCache('u1')?.values['appearance.density']).toBe('comf')
    await vi.advanceTimersByTimeAsync(500)
    expect(puts).toEqual([['/user/settings/appearance/density', { value: 'comf' }]])
    vi.useRealTimers()
  })

  it('pachi:theme-changed e cambio lingua salvano il campo con l\'applier corrispondente', async () => {
    vi.useFakeTimers()
    await handleAuthChanged({ authenticated: true, userId: 'u1' })
    handleThemeChanged('dark')
    handleThemeChanged('dark')
    handleThemeChanged('boh')
    handleLocaleChanged('it')
    await vi.advanceTimersByTimeAsync(500)
    expect(puts).toEqual([
      ['/user/settings/appearance/theme', { value: 'dark' }],
      ['/user/settings/preferences/locale', { value: 'it' }],
    ])
    vi.useRealTimers()
  })

  it('con vecchio backend (senza appearance.theme) il cambio tema non salva nulla', async () => {
    const old = { preferences: { title: 'P', icon: null, route: null, fields: { other: { component: 'string' } } } }
    setPachiSettingsOptions({ getHttp: () => ({ Get: async (u: string) => (u.endsWith('/schema') ? old : {}) as never, Put: async () => undefined }) })
    await handleAuthChanged({ authenticated: true, userId: 'u1' })
    handleThemeChanged('dark')
    expect(puts).toHaveLength(0)
  })
})
