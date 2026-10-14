import { describe, expect, it } from 'vitest'
import { parseActivities, parseSystemInfo } from '../src/helpers/validate'

describe('parseActivities', () => {
  it('restituisce lista vuota se la risposta non è un array', () => {
    expect(parseActivities(null)).toEqual([])
    expect(parseActivities({ activities: [] })).toEqual([])
    expect(parseActivities('x')).toEqual([])
  })
  it('scarta gli elementi non oggetto', () => {
    expect(parseActivities([{ id: 1 }, null, 3])).toEqual([{ id: 1 }])
  })
})

describe('parseSystemInfo', () => {
  it('accetta solo oggetti', () => {
    expect(parseSystemInfo({ status: 'ok' })).toEqual({ status: 'ok' })
    expect(parseSystemInfo([])).toBeNull()
    expect(parseSystemInfo(null)).toBeNull()
    expect(parseSystemInfo(5)).toBeNull()
  })
})
