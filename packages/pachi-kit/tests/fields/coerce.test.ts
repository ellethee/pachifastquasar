import { describe, expect, it } from 'vitest'
import { coerce, normalizeAgainstOriginal, valueForValidation } from '../../src/fields/helpers/coerce'

describe('coerce', () => {
  it('leaves non-numeric types unchanged', () => {
    expect(coerce({ type: 'text' }, '12')).toBe('12')
    expect(coerce({}, '')).toBe('')
  })
  it('converts numeric strings to number', () => {
    expect(coerce({ type: 'number' }, '42')).toBe(42)
    expect(coerce({ type: 'number' }, '3.5')).toBe(3.5)
    expect(coerce({ type: 'number' }, '0')).toBe(0)
  })
  it('returns null for empty or non-numeric', () => {
    expect(coerce({ type: 'number' }, '')).toBeNull()
    expect(coerce({ type: 'number' }, null)).toBeNull()
    expect(coerce({ type: 'number' }, undefined)).toBeNull()
    expect(coerce({ type: 'number' }, 'abc')).toBeNull()
  })
})

describe('valueForValidation', () => {
  it('untouched boolean is false', () => {
    expect(valueForValidation({ type: 'boolean' }, undefined)).toBe(false)
    expect(valueForValidation({ type: 'boolean' }, null)).toBe(false)
    expect(valueForValidation({ type: 'boolean' }, true)).toBe(true)
  })
  it('other types or custom components stay unchanged', () => {
    expect(valueForValidation({ type: 'text' }, undefined)).toBeUndefined()
    expect(valueForValidation({ type: 'boolean', component: {} }, undefined)).toBeUndefined()
  })
})

describe('normalizeAgainstOriginal', () => {
  it('clearing a field absent from the baseline is not a change', () => {
    expect(normalizeAgainstOriginal(undefined, '')).toBeUndefined()
    expect(normalizeAgainstOriginal(undefined, null)).toBeUndefined()
  })
  it('in the other cases the value stays unchanged', () => {
    expect(normalizeAgainstOriginal('a', '')).toBe('')
    expect(normalizeAgainstOriginal(undefined, 'x')).toBe('x')
    expect(normalizeAgainstOriginal(null, '')).toBe('')
  })
})
