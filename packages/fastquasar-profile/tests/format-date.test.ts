import { describe, expect, it } from 'vitest'
import { formatProfileDate, resolveProfileDate } from '../src/helpers/format-date'

const iso = '2026-10-05T14:02:23.430541Z'

describe('formatProfileDate', () => {
  it('formatta solo la data in italiano', () => {
    const out = formatProfileDate(iso, 'it')
    expect(out).toContain('2026')
    expect(out).toContain('ott')
    expect(out).not.toMatch(/:/)
  })
  it('formatta solo la data in inglese', () => {
    expect(formatProfileDate(iso, 'en')).toContain('Oct')
  })
  it('include l\'ora con withTime', () => {
    expect(formatProfileDate(iso, 'it', { withTime: true })).toMatch(/\d{1,2}:\d{2}/)
  })
  it('null, undefined e vuoto danno null', () => {
    expect(formatProfileDate(null)).toBeNull()
    expect(formatProfileDate(undefined)).toBeNull()
    expect(formatProfileDate('')).toBeNull()
  })
  it('stringa non valida dà null senza eccezioni', () => {
    expect(formatProfileDate('non-una-data')).toBeNull()
  })
  it('locale non valido ricade su it', () => {
    expect(formatProfileDate(iso, 'xx_??!')).toContain('ott')
  })
})

describe('resolveProfileDate', () => {
  it('la prop esplicita ha la precedenza', () => {
    expect(resolveProfileDate('oggi', iso, 'it')).toBe('oggi')
  })
  it('senza prop usa la data ISO', () => {
    expect(resolveProfileDate(undefined, iso, 'en')).toContain('Oct')
  })
  it('senza nulla dà null', () => {
    expect(resolveProfileDate(undefined, null, 'it')).toBeNull()
  })
})
