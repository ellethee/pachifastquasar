import { describe, expect, it } from 'vitest'
import { formatHistoryValue, historyChanges, parseHistoryAction } from '../src/helpers/history'

describe('history', () => {
  it('diff ordinato per campo', () => {
    expect(historyChanges({ changes: { price: { old: 1, new: 2 }, name: { old: 'a', new: 'b' } } })).toEqual([
      { field: 'name', old: 'a', new: 'b' },
      { field: 'price', old: 1, new: 2 },
    ])
    expect(historyChanges({})).toEqual([])
  })

  it('azioni', () => {
    expect(parseHistoryAction('add')).toEqual({ kind: 'add' })
    expect(parseHistoryAction('action:archive')).toEqual({ kind: 'action', name: 'archive' })
    expect(parseHistoryAction('zzz')).toEqual({ kind: 'other' })
  })

  it('valori', () => {
    expect(formatHistoryValue(null)).toBe('—')
    expect(formatHistoryValue({ a: 1 })).toBe('{"a":1}')
    expect(formatHistoryValue('')).toBe('""')
    expect(formatHistoryValue(false)).toBe('false')
  })
})
