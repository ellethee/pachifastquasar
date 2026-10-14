import { describe, expect, it } from 'vitest'
import { coerce, normalizeAgainstOriginal, valueForValidation } from '../../src/fields/helpers/coerce'

describe('coerce', () => {
  it('lascia invariati i tipi non numerici', () => {
    expect(coerce({ type: 'text' }, '12')).toBe('12')
    expect(coerce({}, '')).toBe('')
  })
  it('converte le stringhe numeriche in number', () => {
    expect(coerce({ type: 'number' }, '42')).toBe(42)
    expect(coerce({ type: 'number' }, '3.5')).toBe(3.5)
    expect(coerce({ type: 'number' }, '0')).toBe(0)
  })
  it('restituisce null per vuoto o non numerico', () => {
    expect(coerce({ type: 'number' }, '')).toBeNull()
    expect(coerce({ type: 'number' }, null)).toBeNull()
    expect(coerce({ type: 'number' }, undefined)).toBeNull()
    expect(coerce({ type: 'number' }, 'abc')).toBeNull()
  })
})

describe('valueForValidation', () => {
  it('boolean non toccato vale false', () => {
    expect(valueForValidation({ type: 'boolean' }, undefined)).toBe(false)
    expect(valueForValidation({ type: 'boolean' }, null)).toBe(false)
    expect(valueForValidation({ type: 'boolean' }, true)).toBe(true)
  })
  it('altri tipi o component custom restano invariati', () => {
    expect(valueForValidation({ type: 'text' }, undefined)).toBeUndefined()
    expect(valueForValidation({ type: 'boolean', component: {} }, undefined)).toBeUndefined()
  })
})

describe('normalizeAgainstOriginal', () => {
  it('svuotare un campo assente nel baseline non è una modifica', () => {
    expect(normalizeAgainstOriginal(undefined, '')).toBeUndefined()
    expect(normalizeAgainstOriginal(undefined, null)).toBeUndefined()
  })
  it('negli altri casi il valore resta invariato', () => {
    expect(normalizeAgainstOriginal('a', '')).toBe('')
    expect(normalizeAgainstOriginal(undefined, 'x')).toBe('x')
    expect(normalizeAgainstOriginal(null, '')).toBe('')
  })
})
