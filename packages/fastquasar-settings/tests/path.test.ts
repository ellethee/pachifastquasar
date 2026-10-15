import { describe, expect, it } from 'vitest'
import { getByPath, setByPath } from '../src/helpers/path'

describe('setByPath / getByPath', () => {
  it('writes and reads nested paths', () => {
    const o: Record<string, unknown> = {}
    expect(setByPath(o, 'a.b.c', 1)).toBe(true)
    expect(getByPath(o, 'a.b.c')).toBe(1)
  })
  it('ignores __proto__, constructor and prototype', () => {
    const o: Record<string, unknown> = {}
    expect(setByPath(o, '__proto__.polluted', true)).toBe(false)
    expect(setByPath(o, 'a.constructor.prototype.x', true)).toBe(false)
    expect(({} as Record<string, unknown>).polluted).toBeUndefined()
    expect(({} as Record<string, unknown>).x).toBeUndefined()
    expect(getByPath(o, '__proto__')).toBeUndefined()
  })
})
