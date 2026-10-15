import { describe, expect, it } from 'vitest'
import { parseActivities, parseSystemInfo } from '../src/helpers/validate'

describe('parseActivities', () => {
  it('returns an empty list if the response is not an array', () => {
    expect(parseActivities(null)).toEqual([])
    expect(parseActivities({ activities: [] })).toEqual([])
    expect(parseActivities('x')).toEqual([])
  })
  it('discards non-object elements', () => {
    expect(parseActivities([{ id: 1 }, null, 3])).toEqual([{ id: 1 }])
  })
})

describe('parseSystemInfo', () => {
  it('accepts only objects', () => {
    expect(parseSystemInfo({ status: 'ok' })).toEqual({ status: 'ok' })
    expect(parseSystemInfo([])).toBeNull()
    expect(parseSystemInfo(null)).toBeNull()
    expect(parseSystemInfo(5)).toBeNull()
  })
})
