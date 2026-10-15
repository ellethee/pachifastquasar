import { afterEach, describe, expect, it, vi } from 'vitest'
import { createPachiI18n, getPachiI18n } from '../src/services/i18n-instance'

const messages = { it: { app: { hi: 'Ciao' } }, en: { app: { hi: 'Hello' } }, 'pt-BR': { app: { hi: 'Oi' } } }

afterEach(() => vi.unstubAllGlobals())

describe('createPachiI18n', () => {
  it('fixedLocale: a single locale, no detection', () => {
    vi.stubGlobal('localStorage', { getItem: () => 'en', setItem: vi.fn() })
    const i18n = createPachiI18n({ messages, fixedLocale: 'pt' })
    expect(i18n.global.locale.value).toBe('pt-BR')
    expect(i18n.global.availableLocales).toEqual(['pt-BR'])
    expect(getPachiI18n()).toBe(i18n)
  })
  it('unknown fixedLocale -> default with warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const i18n = createPachiI18n({ messages, fixedLocale: 'de', defaultLocale: 'it' })
    expect(i18n.global.locale.value).toBe('it')
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })
  it('initialLocale forces the locale and the locales are the app ones', () => {
    const i18n = createPachiI18n({ messages, initialLocale: 'en' })
    expect(i18n.global.locale.value).toBe('en')
    expect([...i18n.global.availableLocales].sort()).toEqual(['en', 'it', 'pt-BR'])
  })
  it('async onLocaleChange: on rapid changes the last one wins', async () => {
    const calls: string[] = []
    const onLocaleChange = (code: string) =>
      new Promise<void>((resolve) => setTimeout(() => (calls.push(code), resolve()), code === 'en' ? 20 : 1))
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => {} })
    const i18n = createPachiI18n({ messages, initialLocale: 'it', onLocaleChange })
    i18n.global.locale.value = 'en'
    i18n.global.locale.value = 'pt-BR'
    await new Promise((r) => setTimeout(r, 100))
    expect(calls.at(-1)).toBe('pt-BR')
  })
})
