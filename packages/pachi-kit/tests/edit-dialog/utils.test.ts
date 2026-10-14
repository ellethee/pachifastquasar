import { describe, expect, it } from 'vitest'
import { reactive } from 'vue'
import { cloneValue } from '../../src/edit-dialog/utils/clone-value'
import { formatLocalDate } from '../../src/edit-dialog/utils/date'
import { formatList, parseList } from '../../src/edit-dialog/utils/permissions'

describe('formatLocalDate', () => {
  it('usa i valori locali: mezzanotte locale resta lo stesso giorno', () => {
    expect(formatLocalDate(new Date(2026, 0, 5, 0, 0, 0))).toBe('2026-01-05')
    expect(formatLocalDate(new Date(2026, 11, 31, 23, 59, 59))).toBe('2026-12-31')
  })
})

describe('parseList / formatList', () => {
  it('fa trim e scarta le voci vuote', () => {
    expect(parseList(' a, b ,, c,')).toEqual(['a', 'b', 'c'])
    expect(parseList('')).toEqual([])
  })
  it('formatta con ", "', () => {
    expect(formatList(['a', 'b'])).toBe('a, b')
  })
})

describe('cloneValue', () => {
  it('clona oggetti reattivi annidati senza DataCloneError', () => {
    const src = reactive({ a: { b: [1, { c: 2 }] }, d: new Date(0) })
    const copy = cloneValue(src)
    expect(copy).toEqual({ a: { b: [1, { c: 2 }] }, d: new Date(0) })
    expect(copy.a).not.toBe(src.a)
    copy.a.b.push(3)
    expect(src.a.b).toHaveLength(2)
  })
  it('gestisce primitivi e null', () => {
    expect(cloneValue(5)).toBe(5)
    expect(cloneValue(null)).toBeNull()
  })
})
