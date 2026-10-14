import { describe, expect, it } from 'vitest'
import { passesRules } from '../../src/ui/helper/rules'

describe('passesRules', () => {
  it('senza regole e\' sempre valido', () => {
    expect(passesRules(undefined, 'x')).toBe(true)
    expect(passesRules([], '')).toBe(true)
  })
  it('true = valido; false o messaggio = non valido', () => {
    expect(passesRules([v => !!v || 'obbligatorio'], 'a')).toBe(true)
    expect(passesRules([v => !!v || 'obbligatorio'], '')).toBe(false)
    expect(passesRules([() => false], 'a')).toBe(false)
  })
  it('tutte le regole devono passare', () => {
    expect(passesRules([v => String(v).length > 1, v => String(v).length < 4], 'abc')).toBe(true)
    expect(passesRules([v => String(v).length > 1, v => String(v).length < 4], 'abcd')).toBe(false)
  })
  it('ignora risultati asincroni (Promise)', () => {
    expect(passesRules([(() => Promise.resolve(true)) as never], 'a')).toBe(true)
  })
  it('come q-input: undefined/null/true sono validi, false o stringa no', () => {
    expect(passesRules([(() => undefined) as never], 'a')).toBe(true)
    expect(passesRules([(() => null) as never], 'a')).toBe(true)
    expect(passesRules([() => 'errore'], 'a')).toBe(false)
  })
})
