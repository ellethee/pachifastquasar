import { describe, expect, it } from 'vitest'
import { coerceInputValue } from '../../src/ui/helper/coerce-input'

describe('coerceInputValue', () => {
  it('type number: stringa -> number', () => {
    expect(coerceInputValue('number', '12.5')).toBe(12.5)
    expect(coerceInputValue('number', 7)).toBe(7)
  })
  it('type number: vuoto o non numerico -> null', () => {
    expect(coerceInputValue('number', '')).toBeNull()
    expect(coerceInputValue('number', null)).toBeNull()
    expect(coerceInputValue('number', 'abc')).toBeNull()
  })
  it('altri tipi: invariato', () => {
    expect(coerceInputValue('text', '12')).toBe('12')
    expect(coerceInputValue(undefined, '')).toBe('')
  })
})
