import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'

vi.mock('vue-i18n', async (orig) => {
  const actual = await orig<typeof import('vue-i18n')>()
  // read the instance from the singleton on globalThis (avoids circular imports inside the factory)
  const instance = () => (globalThis as Record<symbol, { global: unknown } | undefined>)[Symbol.for('@ilpachi/pachi-i18n/instance')]!
  return { ...actual, useI18n: () => instance().global }
})

import { createPachiI18n, disposePachiI18n, getPachiI18n } from '../src/services/i18n-instance'
import { usePachiI18n } from '../src/composables/use-pachi-i18n'
import { useLocale } from '../src/composables/use-locale'

const pkg = { it: { pkg: { hi: 'Ciao pkg', other: 'Altro' } }, en: { pkg: { hi: 'Hello pkg', other: 'Other' } } }

beforeEach(() => {
  vi.stubGlobal('localStorage', { getItem: () => null, setItem: vi.fn() })
})
afterEach(() => {
  disposePachiI18n()
  vi.unstubAllGlobals()
})

describe('usePachiI18n / registerMessages', () => {
  it('registers package messages without overwriting the app ones (omitExisting + merge)', () => {
    createPachiI18n({ messages: { it: { pkg: { hi: 'Ciao app' } }, en: {} }, initialLocale: 'it' })
    const { t } = usePachiI18n(pkg)
    expect(t('pkg.hi')).toBe('Ciao app')
    expect(t('pkg.other')).toBe('Altro')
    expect(getPachiI18n()!.global.getLocaleMessage('en')).toMatchObject({ pkg: { hi: 'Hello pkg' } })
  })

  it('ignores locales not offered by the app', () => {
    createPachiI18n({ messages: { it: {} }, initialLocale: 'it' })
    usePachiI18n(pkg)
    expect(getPachiI18n()!.global.availableLocales).toEqual(['it'])
  })

  it('app en-US/it-IT with package it/en: uses matchLocale', () => {
    createPachiI18n({ messages: { 'it-IT': {}, 'en-US': {} }, initialLocale: 'en-US' })
    const { t } = usePachiI18n(pkg)
    expect(t('pkg.hi')).toBe('Hello pkg')
    getPachiI18n()!.global.locale.value = 'it-IT'
    expect(t('pkg.hi')).toBe('Ciao pkg')
  })

  it('registers only once and fills locales added at runtime on the next call', () => {
    const i18n = createPachiI18n({ messages: { it: {} }, initialLocale: 'it' })
    const merge = vi.spyOn(i18n.global, 'mergeLocaleMessage')
    usePachiI18n(pkg)
    usePachiI18n(pkg)
    expect(merge).toHaveBeenCalledTimes(1)
    i18n.global.setLocaleMessage('en', {} as never)
    usePachiI18n(pkg)
    expect(merge).toHaveBeenCalledTimes(2)
    expect(i18n.global.getLocaleMessage('en')).toMatchObject({ pkg: { hi: 'Hello pkg' } })
  })
})

describe('createPachiI18n: defaultLocale and lifecycle', () => {
  it('defaultLocale not present: falls back to the available locale and updates html lang', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const doc = { documentElement: { lang: '' } }
    vi.stubGlobal('document', doc)
    vi.stubGlobal('navigator', { languages: [] })
    const i18n = createPachiI18n({ messages: { 'de-DE': {}, fr: {} }, defaultLocale: 'it' })
    expect(i18n.global.locale.value).toBe('de-DE')
    expect(doc.documentElement.lang).toBe('de-DE')
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it('a new instance disposes the previous one (a single watcher)', async () => {
    const setItem = vi.fn()
    vi.stubGlobal('localStorage', { getItem: () => null, setItem })
    const first = createPachiI18n({ messages: { it: {}, en: {} }, initialLocale: 'it' })
    createPachiI18n({ messages: { it: {}, en: {} }, initialLocale: 'it' })
    first.global.locale.value = 'en'
    await nextTick()
    expect(setItem).not.toHaveBeenCalled()
  })

  it('disposePachiI18n is idempotent and resets the instance', () => {
    createPachiI18n({ messages: { it: {} }, initialLocale: 'it' })
    disposePachiI18n()
    disposePachiI18n()
    expect(getPachiI18n()).toBeUndefined()
  })

  it('persists the locale in localStorage on change', async () => {
    const setItem = vi.fn()
    vi.stubGlobal('localStorage', { getItem: () => null, setItem })
    const i18n = createPachiI18n({ messages: { it: {}, en: {} }, initialLocale: 'it', storageKey: 'k' })
    i18n.global.locale.value = 'en'
    await nextTick()
    expect(setItem).toHaveBeenCalledWith('k', 'en')
  })

  it('reads the locale saved in localStorage', () => {
    vi.stubGlobal('localStorage', { getItem: () => 'en-GB', setItem: vi.fn() })
    const i18n = createPachiI18n({ messages: { it: {}, en: {} } })
    expect(i18n.global.locale.value).toBe('en')
  })

  it('localStorage throwing errors does not break the locale change', async () => {
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => { throw new Error('x') } })
    const i18n = createPachiI18n({ messages: { it: {}, en: {} }, initialLocale: 'it' })
    i18n.global.locale.value = 'en'
    await nextTick()
    expect(i18n.global.locale.value).toBe('en')
  })
})

describe('useLocale', () => {
  it('setLocale ignores invalid codes, labelOf falls back to the code', () => {
    createPachiI18n({ messages: { it: {}, en: {} }, initialLocale: 'it' })
    const { locale, setLocale, labelOf, availableLocales } = useLocale()
    setLocale('xx')
    expect(locale.value).toBe('it')
    setLocale('en')
    expect(locale.value).toBe('en')
    expect([...availableLocales.value].sort()).toEqual(['en', 'it'])
    expect(labelOf('it')).toBe('Italiano')
    expect(labelOf('not a code!')).toBe('not a code!')
  })

  it('throws without an instance', () => {
    expect(() => useLocale()).toThrow(/createPachiI18n/)
  })
})
