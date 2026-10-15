import { describe, expect, it } from 'vitest'
import { formatProfileDate, resolveProfileDate } from '../src/helpers/format-date'

const iso = '2026-10-05T14:02:23.430541Z'

describe('formatProfileDate', () => {
  it('formats the date only, in Italian', () => {
    const out = formatProfileDate(iso, 'it')
    expect(out).toContain('2026')
    expect(out).toContain('ott')
    expect(out).not.toMatch(/:/)
  })
  it('formats the date only, in English', () => {
    expect(formatProfileDate(iso, 'en')).toContain('Oct')
  })
  it('includes the time with withTime', () => {
    expect(formatProfileDate(iso, 'it', { withTime: true })).toMatch(/\d{1,2}:\d{2}/)
  })
  it('null, undefined and empty give null', () => {
    expect(formatProfileDate(null)).toBeNull()
    expect(formatProfileDate(undefined)).toBeNull()
    expect(formatProfileDate('')).toBeNull()
  })
  it('an invalid string gives null without throwing', () => {
    expect(formatProfileDate('not-a-date')).toBeNull()
  })
  it('an invalid locale falls back to it', () => {
    expect(formatProfileDate(iso, 'xx_??!')).toContain('ott')
  })
})

describe('resolveProfileDate', () => {
  it('the explicit prop takes precedence', () => {
    expect(resolveProfileDate('today', iso, 'it')).toBe('today')
  })
  it('without the prop it uses the ISO date', () => {
    expect(resolveProfileDate(undefined, iso, 'en')).toContain('Oct')
  })
  it('with nothing it gives null', () => {
    expect(resolveProfileDate(undefined, null, 'it')).toBeNull()
  })
})
