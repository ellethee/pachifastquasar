import { nextTick, reactive } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const dark = vi.hoisted(() => ({ isActive: false, mode: false as boolean | 'auto', set: vi.fn() }))
vi.mock('quasar', () => {
  dark.set.mockImplementation((v: boolean | 'auto') => {
    dark.mode = v
    dark.isActive = v === 'auto' ? false : v
  })
  // reactive like Quasar's `Dark` plugin (the manager watches `isActive`); tests mutate it through the proxy
  return { Dark: reactive(dark), setCssVar: vi.fn() }
})
import { Dark, setCssVar } from 'quasar'

import {
  PACHI_THEME_ID_KEY,
  PACHI_THEME_MODE_KEY,
  ThemeManager,
  getPachiThemes,
  registerPachiThemes
} from 'src/services/theme-manager'
import type { ThemeDefinition } from 'src/services/theme-manager'

const store = new Map<string, string>()
const body = { attrs: {} as Record<string, string>, setAttribute(k: string, v: string) { this.attrs[k] = v } }

beforeEach(() => {
  store.clear()
  body.attrs = {}
  dark.isActive = false
  dark.mode = false
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v)
  })
  vi.stubGlobal('document', { body })
  ThemeManager.reset()
})

describe('ThemeManager', () => {
  it('auto mode: re-applies the brand colors when the effective scheme changes at runtime', async () => {
    store.set(PACHI_THEME_MODE_KEY, 'auto')
    ThemeManager.getInstance().init({ defaultTheme: 'emerald' })
    vi.mocked(setCssVar).mockClear()
    ;(Dark as { isActive: boolean }).isActive = true // the OS switches to dark
    await nextTick()
    expect(setCssVar).toHaveBeenCalledWith('primary', '#10b981')
  })
  it('init applies the default theme as data-theme', () => {
    ThemeManager.getInstance().init()
    expect(body.attrs['data-theme']).toBe('slate')
  })
  it('restores the persisted theme and mode', () => {
    store.set(PACHI_THEME_ID_KEY, 'cosmic')
    store.set(PACHI_THEME_MODE_KEY, 'dark')
    const m = ThemeManager.getInstance()
    m.init({ defaultTheme: 'teal' })
    expect(m.activeThemeId.value).toBe('cosmic')
    expect(m.activeMode.value).toBe('dark')
  })
  it('unknown default falls back to slate with a warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    ThemeManager.getInstance().init({ defaultTheme: 'nope' })
    expect(warn).toHaveBeenCalled()
    expect(body.attrs['data-theme']).toBe('slate')
    warn.mockRestore()
  })
  it('setTheme persists and ignores unknown ids; setMode persists the shared mode key', () => {
    const m = ThemeManager.getInstance()
    m.init()
    m.setTheme('amber')
    m.setTheme('nope')
    expect(store.get(PACHI_THEME_ID_KEY)).toBe('amber')
    m.setMode('light')
    expect(store.get(PACHI_THEME_MODE_KEY)).toBe('light')
    m.toggleMode()
    expect(m.activeMode.value).toBe('dark')
  })
  it('registerPachiThemes adds custom themes, replacing by id', () => {
    const custom = { ...getPachiThemes()[0]!, id: 'm3', label: 'M3' } as ThemeDefinition
    registerPachiThemes([custom])
    registerPachiThemes([{ ...custom, label: 'M3 bis' }])
    expect(getPachiThemes().filter(t => t.id === 'm3')).toHaveLength(1)
    store.set(PACHI_THEME_ID_KEY, 'm3')
    const m = ThemeManager.getInstance()
    m.init()
    expect(body.attrs['data-theme']).toBe('m3')
  })
})
