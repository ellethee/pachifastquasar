import { describe, expect, it } from 'vitest'
import { coerceInputValue } from '../../src/ui/helper/coerce-input'

describe('coerceInputValue', () => {
  it('type number: string -> number', () => {
    expect(coerceInputValue('number', '12.5')).toBe(12.5)
    expect(coerceInputValue('number', 7)).toBe(7)
  })
  it('type number: empty or non-numeric -> null', () => {
    expect(coerceInputValue('number', '')).toBeNull()
    expect(coerceInputValue('number', null)).toBeNull()
    expect(coerceInputValue('number', 'abc')).toBeNull()
  })
  it('other types: unchanged', () => {
    expect(coerceInputValue('text', '12')).toBe('12')
    expect(coerceInputValue(undefined, '')).toBe('')
  })
})
