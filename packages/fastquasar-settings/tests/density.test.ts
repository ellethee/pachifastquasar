import { describe, expect, it } from 'vitest'
import { DENSITY_ATTRIBUTE, normalizeDensity } from '../src/helpers/density'

describe('normalizeDensity', () => {
  it('maps the old stored value `comp` to `compact`', () => {
    expect(normalizeDensity('comp')).toBe('compact')
    expect(normalizeDensity('compact')).toBe('compact')
  })
  it('uses `comf` for everything else', () => {
    expect(normalizeDensity('comf')).toBe('comf')
    expect(normalizeDensity(null)).toBe('comf')
    expect(normalizeDensity('boh')).toBe('comf')
  })
  it('writes the attribute that styles and shell read', () => {
    expect(DENSITY_ATTRIBUTE).toBe('data-density')
  })
})
