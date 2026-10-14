import { afterEach, describe, expect, it, vi } from 'vitest'
import { collectLocales } from '../src/helper/collect-locales'
import { detectLocale, matchLocale } from '../src/helper/detect-locale'
import { deepMerge, omitExisting } from '../src/helper/messages'

afterEach(() => vi.unstubAllGlobals())

describe('matchLocale', () => {
  const available = ['it', 'en', 'pt-BR']
  it('esatto senza maiuscole', () => expect(matchLocale('EN', available)).toBe('en'))
  it('lingua base', () => expect(matchLocale('it-IT', available)).toBe('it'))
  it('variante della stessa lingua', () => expect(matchLocale('pt', available)).toBe('pt-BR'))
  it('nessuna corrispondenza', () => expect(matchLocale('de', available)).toBeUndefined())
})

describe('collectLocales', () => {
  it('ricava il codice dal nome file (ts e json)', () => {
    const result = collectLocales({
      './locales/it.ts': { a: 'x' },
      './locales/pt-BR.ts': { a: 'y' },
      './generated/en.json': { default: { b: 'z' } },
    })
    expect(result).toEqual({ it: { a: 'x' }, 'pt-BR': { a: 'y' }, en: { b: 'z' } })
  })
  it('unisce file con lo stesso codice e ignora valori non oggetto', () => {
    const result = collectLocales({
      './a/it.ts': { app: { x: 1 } },
      './b/it.json': { app: { y: 2 } },
      './c/en.ts': null,
    })
    expect(result).toEqual({ it: { app: { x: 1, y: 2 } } })
  })
})

describe('deepMerge / omitExisting', () => {
  it('deepMerge non muta e override vince', () => {
    const base = { a: { x: 1, y: 2 }, b: 'b' }
    const merged = deepMerge(base, { a: { y: 3 }, c: 'c' })
    expect(merged).toEqual({ a: { x: 1, y: 3 }, b: 'b', c: 'c' })
    expect(base).toEqual({ a: { x: 1, y: 2 }, b: 'b' })
  })
  it('omitExisting tiene solo le chiavi mancanti', () => {
    const out = omitExisting({ a: { x: 'n', z: 'n' }, b: 'n', c: 'n' }, { a: { x: 'old' }, b: 'old' })
    expect(out).toEqual({ a: { z: 'n' }, c: 'n' })
  })
  it('omitExisting senza novità -> vuoto', () => {
    expect(omitExisting({ a: { x: 1 } }, { a: { x: 2 } })).toEqual({})
  })
})

describe('detectLocale', () => {
  const available = ['it', 'en']
  it('usa localStorage se valido', () => {
    vi.stubGlobal('localStorage', { getItem: () => 'en' })
    vi.stubGlobal('navigator', { languages: ['it-IT'] })
    expect(detectLocale(available, 'it', 'k')).toBe('en')
  })
  it('ripiega su navigator.languages', () => {
    vi.stubGlobal('localStorage', { getItem: () => 'xx' })
    vi.stubGlobal('navigator', { languages: ['de', 'en-US'] })
    expect(detectLocale(available, 'it', 'k')).toBe('en')
  })
  it('localStorage che lancia -> prosegue; poi default', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked')
      },
    })
    vi.stubGlobal('navigator', { languages: ['de'] })
    expect(detectLocale(available, 'it', 'k')).toBe('it')
  })
})
