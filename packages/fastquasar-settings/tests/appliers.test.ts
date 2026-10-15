import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const dark = vi.hoisted(() => ({ isActive: true, set: vi.fn(), toggle: vi.fn() }))
const i18nState = vi.hoisted(() => ({ locale: { value: 'it' }, available: ['it', 'en'] }))
vi.mock('@ilpachi/pachi-i18n', () => ({
  getPachiI18n: () => ({ global: { locale: i18nState.locale, availableLocales: i18nState.available } }),
  matchLocale: (requested: string, available: string[]) => {
    const w = requested.toLowerCase()
    const base = w.split('-')[0] ?? w
    return available.find((c) => c === w) ?? available.find((c) => c === base)
  },
}))
vi.mock('quasar', () => ({ Notify: { create: vi.fn() }, Dark: dark }))

import {
  ACCENT_PRESETS,
  applyAccent,
  listSettingsAppliers,
  registerSettingsApplier,
  resetSettingsAppliers,
  runSettingsApplier,
} from '../src/services/appliers'

/** Fake root element with attributes and style. */
function fakeRoot() {
  const attrs = new Map<string, string>()
  const style = new Map<string, string>()
  return {
    attrs,
    style: {
      props: style,
      setProperty: (k: string, v: string) => void style.set(k, v),
      removeProperty: (k: string) => void style.delete(k),
    },
    setAttribute: (k: string, v: string) => void attrs.set(k, v),
    removeAttribute: (k: string) => void attrs.delete(k),
  }
}
const store = new Map<string, string>()

describe('appliers standard', () => {
  let root: ReturnType<typeof fakeRoot>

  beforeEach(() => {
    root = fakeRoot()
    store.clear()
    dark.set.mockClear()
    vi.stubGlobal('document', { documentElement: root })
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    })
  })
  afterEach(() => vi.unstubAllGlobals())

  const run = (name: string, value: unknown, source: 'set' | 'load' | 'cache' | 'reset' = 'set') =>
    runSettingsApplier(name, value, { source })

  it('lists the standard appliers', () => {
    expect(listSettingsAppliers()).toEqual(
      expect.arrayContaining(['theme', 'accent', 'density', 'fontScale', 'reduceMotion', 'locale'])
    )
  })

  it('theme: dark/light/auto on Quasar and pachi-prefs-theme cache', () => {
    run('theme', 'light')
    expect(dark.set).toHaveBeenLastCalledWith(false)
    expect(store.get('pachi-prefs-theme')).toBe('light')
    run('theme', 'dark')
    expect(dark.set).toHaveBeenLastCalledWith(true)
    run('theme', 'auto')
    expect(dark.set).toHaveBeenLastCalledWith('auto')
    expect(store.get('pachi-prefs-theme')).toBe('auto')
  })

  it('theme: reset does not touch the device theme', () => {
    run('theme', undefined, 'reset')
    expect(dark.set).not.toHaveBeenCalled()
  })

  it('accent: writes the --pachi-accent* variables and removes them for teal/reset', () => {
    run('accent', 'indigo')
    expect(root.style.props.get('--pachi-accent')).toBe(ACCENT_PRESETS.indigo!.accent)
    expect(root.style.props.has('--pachi-accent-soft')).toBe(true)
    expect(root.style.props.has('--pachi-accent-deep')).toBe(true)
    run('accent', 'teal')
    expect(root.style.props.size).toBe(0)
    run('accent', 'coral')
    run('accent', undefined, 'reset')
    expect(root.style.props.size).toBe(0)
    applyAccent('boh', { name: 'accent', source: 'set' })
    expect(root.style.props.size).toBe(0)
  })

  it('density: data-density comf|compact', () => {
    run('density', 'compact')
    expect(root.attrs.get('data-density')).toBe('compact')
    run('density', undefined, 'reset')
    expect(root.attrs.get('data-density')).toBe('comf')
  })

  it('fontScale: data-font-scale only for sm/lg', () => {
    run('fontScale', 'lg')
    expect(root.attrs.get('data-font-scale')).toBe('lg')
    run('fontScale', 'md')
    expect(root.attrs.has('data-font-scale')).toBe(false)
    run('fontScale', 'sm')
    run('fontScale', undefined, 'reset')
    expect(root.attrs.has('data-font-scale')).toBe(false)
  })

  it('reduceMotion: data-reduce-motion only if true', () => {
    run('reduceMotion', true)
    expect(root.attrs.get('data-reduce-motion')).toBe('true')
    run('reduceMotion', false)
    expect(root.attrs.has('data-reduce-motion')).toBe(false)
  })

  it('resetSettingsAppliers restores everything to default', () => {
    run('accent', 'violet')
    run('density', 'compact')
    run('reduceMotion', true)
    resetSettingsAppliers()
    expect(root.style.props.size).toBe(0)
    expect(root.attrs.get('data-density')).toBe('comf')
    expect(root.attrs.has('data-reduce-motion')).toBe(false)
  })

  it('locale: changes the pachi-i18n language, null = automatic', () => {
    vi.stubGlobal('navigator', { languages: ['en-GB'] })
    const i18n = { global: { locale: i18nState.locale } }
    i18nState.locale.value = 'it'
    expect(i18n.global.locale.value).toBe('it')
    run('locale', 'en')
    expect(i18n.global.locale.value).toBe('en')
    run('locale', 'it-IT')
    expect(i18n.global.locale.value).toBe('it')
    run('locale', null)
    expect(i18n.global.locale.value).toBe('en')
    run('locale', 'xx')
    expect(i18n.global.locale.value).toBe('en')
  })

  it('registerSettingsApplier: app applier, replacement and unregistration', () => {
    const fn = vi.fn()
    const unregister = registerSettingsApplier('pageSize', fn)
    expect(runSettingsApplier('pageSize', 25, { category: 'preferences', key: 'tablePageSize', source: 'load' })).toBe(true)
    expect(fn).toHaveBeenCalledWith(25, { name: 'pageSize', category: 'preferences', key: 'tablePageSize', source: 'load' })
    unregister()
    expect(runSettingsApplier('pageSize', 25, { source: 'set' })).toBe(false)
    const override = vi.fn()
    const restore = registerSettingsApplier('density', override)
    run('density', 'compact')
    expect(override).toHaveBeenCalled()
    restore()
    run('density', 'compact')
    expect(root.attrs.get('data-density')).toBe('compact')
  })

  it('an applier that throws does not break the others', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const un = registerSettingsApplier('boom', () => { throw new Error('x') })
    expect(() => runSettingsApplier('boom', 1, { source: 'set' })).not.toThrow()
    expect(warn).toHaveBeenCalled()
    un()
    warn.mockRestore()
  })
})
