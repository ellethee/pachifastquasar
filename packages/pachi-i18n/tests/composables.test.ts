import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'

vi.mock('vue-i18n', async (orig) => {
  const actual = await orig<typeof import('vue-i18n')>()
  // legge l'istanza dal singleton su globalThis (evita import circolari dentro la factory)
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
  it('registra i messaggi del package senza sovrascrivere quelli dell\'app (omitExisting + merge)', () => {
    createPachiI18n({ messages: { it: { pkg: { hi: 'Ciao app' } }, en: {} }, initialLocale: 'it' })
    const { t } = usePachiI18n(pkg)
    expect(t('pkg.hi')).toBe('Ciao app')
    expect(t('pkg.other')).toBe('Altro')
    expect(getPachiI18n()!.global.getLocaleMessage('en')).toMatchObject({ pkg: { hi: 'Hello pkg' } })
  })

  it('ignora le lingue non offerte dall\'app', () => {
    createPachiI18n({ messages: { it: {} }, initialLocale: 'it' })
    usePachiI18n(pkg)
    expect(getPachiI18n()!.global.availableLocales).toEqual(['it'])
  })

  it('app en-US/it-IT con package it/en: usa matchLocale', () => {
    createPachiI18n({ messages: { 'it-IT': {}, 'en-US': {} }, initialLocale: 'en-US' })
    const { t } = usePachiI18n(pkg)
    expect(t('pkg.hi')).toBe('Hello pkg')
    getPachiI18n()!.global.locale.value = 'it-IT'
    expect(t('pkg.hi')).toBe('Ciao pkg')
  })

  it('registra una sola volta e riempie le lingue aggiunte a runtime alla chiamata successiva', () => {
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

describe('createPachiI18n: defaultLocale e ciclo di vita', () => {
  it('defaultLocale non presente: ripiega sulla lingua disponibile e aggiorna html lang', () => {
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

  it('una nuova istanza dismette la precedente (un solo watcher)', async () => {
    const setItem = vi.fn()
    vi.stubGlobal('localStorage', { getItem: () => null, setItem })
    const first = createPachiI18n({ messages: { it: {}, en: {} }, initialLocale: 'it' })
    createPachiI18n({ messages: { it: {}, en: {} }, initialLocale: 'it' })
    first.global.locale.value = 'en'
    await nextTick()
    expect(setItem).not.toHaveBeenCalled()
  })

  it('disposePachiI18n e\' idempotente e azzera l\'istanza', () => {
    createPachiI18n({ messages: { it: {} }, initialLocale: 'it' })
    disposePachiI18n()
    disposePachiI18n()
    expect(getPachiI18n()).toBeUndefined()
  })

  it('persiste la lingua in localStorage al cambio', async () => {
    const setItem = vi.fn()
    vi.stubGlobal('localStorage', { getItem: () => null, setItem })
    const i18n = createPachiI18n({ messages: { it: {}, en: {} }, initialLocale: 'it', storageKey: 'k' })
    i18n.global.locale.value = 'en'
    await nextTick()
    expect(setItem).toHaveBeenCalledWith('k', 'en')
  })

  it('legge la lingua salvata in localStorage', () => {
    vi.stubGlobal('localStorage', { getItem: () => 'en-GB', setItem: vi.fn() })
    const i18n = createPachiI18n({ messages: { it: {}, en: {} } })
    expect(i18n.global.locale.value).toBe('en')
  })

  it('localStorage che solleva errori non rompe il cambio lingua', async () => {
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => { throw new Error('x') } })
    const i18n = createPachiI18n({ messages: { it: {}, en: {} }, initialLocale: 'it' })
    i18n.global.locale.value = 'en'
    await nextTick()
    expect(i18n.global.locale.value).toBe('en')
  })
})

describe('useLocale', () => {
  it('setLocale ignora codici non validi, labelOf ha fallback al codice', () => {
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

  it('senza istanza solleva errore', () => {
    expect(() => useLocale()).toThrow(/createPachiI18n/)
  })
})
