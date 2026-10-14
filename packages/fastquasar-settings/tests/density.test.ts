import { describe, expect, it } from 'vitest'
import { DENSITY_ATTRIBUTE, normalizeDensity } from '../src/helpers/density'

describe('normalizeDensity', () => {
  it('mappa il vecchio valore salvato `comp` su `compact`', () => {
    expect(normalizeDensity('comp')).toBe('compact')
    expect(normalizeDensity('compact')).toBe('compact')
  })
  it('usa `comf` per tutto il resto', () => {
    expect(normalizeDensity('comf')).toBe('comf')
    expect(normalizeDensity(null)).toBe('comf')
    expect(normalizeDensity('boh')).toBe('comf')
  })
  it('scrive l\'attributo che stili e shell leggono', () => {
    expect(DENSITY_ATTRIBUTE).toBe('data-density')
  })
})
