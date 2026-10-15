import { afterEach, describe, expect, it, vi } from 'vitest'
import { collectLocales } from '../src/helper/collect-locales'
import { detectLocale, matchLocale } from '../src/helper/detect-locale'
import { deepMerge, omitExisting } from '../src/helper/messages'

afterEach(() => vi.unstubAllGlobals())

describe('matchLocale', () => {
  const available = ['it', 'en', 'pt-BR']
  it('exact, case-insensitive', () => expect(matchLocale('EN', available)).toBe('en'))
  it('base language', () => expect(matchLocale('it-IT', available)).toBe('it'))
  it('variant of the same language', () => expect(matchLocale('pt', available)).toBe('pt-BR'))
  it('no match', () => expect(matchLocale('de', available)).toBeUndefined())
})

describe('collectLocales', () => {
  it('derives the code from the file name (ts and json)', () => {
    const result = collectLocales({
      './locales/it.ts': { a: 'x' },
      './locales/pt-BR.ts': { a: 'y' },
      './generated/en.json': { default: { b: 'z' } },
    })
    expect(result).toEqual({ it: { a: 'x' }, 'pt-BR': { a: 'y' }, en: { b: 'z' } })
  })
  it('merges files with the same code and ignores non-object values', () => {
    const result = collectLocales({
      './a/it.ts': { app: { x: 1 } },
      './b/it.json': { app: { y: 2 } },
      './c/en.ts': null,
    })
    expect(result).toEqual({ it: { app: { x: 1, y: 2 } } })
  })
})

describe('deepMerge / omitExisting', () => {
  it('deepMerge does not mutate and override wins', () => {
    const base = { a: { x: 1, y: 2 }, b: 'b' }
    const merged = deepMerge(base, { a: { y: 3 }, c: 'c' })
    expect(merged).toEqual({ a: { x: 1, y: 3 }, b: 'b', c: 'c' })
    expect(base).toEqual({ a: { x: 1, y: 2 }, b: 'b' })
  })
  it('omitExisting keeps only the missing keys', () => {
    const out = omitExisting({ a: { x: 'n', z: 'n' }, b: 'n', c: 'n' }, { a: { x: 'old' }, b: 'old' })
    expect(out).toEqual({ a: { z: 'n' }, c: 'n' })
  })
  it('omitExisting with nothing new -> empty', () => {
    expect(omitExisting({ a: { x: 1 } }, { a: { x: 2 } })).toEqual({})
  })
})

describe('detectLocale', () => {
  const available = ['it', 'en']
  it('uses localStorage if valid', () => {
    vi.stubGlobal('localStorage', { getItem: () => 'en' })
    vi.stubGlobal('navigator', { languages: ['it-IT'] })
    expect(detectLocale(available, 'it', 'k')).toBe('en')
  })
  it('falls back to navigator.languages', () => {
    vi.stubGlobal('localStorage', { getItem: () => 'xx' })
    vi.stubGlobal('navigator', { languages: ['de', 'en-US'] })
    expect(detectLocale(available, 'it', 'k')).toBe('en')
  })
  it('throwing localStorage -> carries on; then default', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked')
      },
    })
    vi.stubGlobal('navigator', { languages: ['de'] })
    expect(detectLocale(available, 'it', 'k')).toBe('it')
  })
})
