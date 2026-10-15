import { describe, expect, it } from 'vitest'
import { passesRules } from '../../src/ui/helper/rules'

describe('passesRules', () => {
  it('without rules it is always valid', () => {
    expect(passesRules(undefined, 'x')).toBe(true)
    expect(passesRules([], '')).toBe(true)
  })
  it('true = valid; false or message = invalid', () => {
    expect(passesRules([v => !!v || 'obbligatorio'], 'a')).toBe(true)
    expect(passesRules([v => !!v || 'obbligatorio'], '')).toBe(false)
    expect(passesRules([() => false], 'a')).toBe(false)
  })
  it('all the rules must pass', () => {
    expect(passesRules([v => String(v).length > 1, v => String(v).length < 4], 'abc')).toBe(true)
    expect(passesRules([v => String(v).length > 1, v => String(v).length < 4], 'abcd')).toBe(false)
  })
  it('ignores async results (Promise)', () => {
    expect(passesRules([(() => Promise.resolve(true)) as never], 'a')).toBe(true)
  })
  it('like q-input: undefined/null/true are valid, false or string are not', () => {
    expect(passesRules([(() => undefined) as never], 'a')).toBe(true)
    expect(passesRules([(() => null) as never], 'a')).toBe(true)
    expect(passesRules([() => 'errore'], 'a')).toBe(false)
  })
})
