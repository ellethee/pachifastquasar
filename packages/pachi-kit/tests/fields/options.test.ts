import { describe, expect, it } from 'vitest'
import { mergeVirtualOptions, safeLabel } from '../../src/fields/helpers/options'

describe('safeLabel', () => {
  it('restituisce l\'etichetta o stringa vuota se l\'estrattore lancia', () => {
    expect(safeLabel(() => 'x', {})).toBe('x')
    expect(
      safeLabel((item) => (item as { a: { b: string } }).a.b, { value: 1 }),
    ).toBe('')
  })
})

describe('mergeVirtualOptions', () => {
  it('conserva le virtuali non presenti e non duplica quelle già caricate', () => {
    const items = [{ value: 1, label: 'a' }]
    const virtuals = [{ value: 'nuovo', label: 'nuovo' }, { value: 1, label: 'dup' }]
    expect(mergeVirtualOptions(items, virtuals, 'value')).toEqual([
      { value: 1, label: 'a' },
      { value: 'nuovo', label: 'nuovo' },
    ])
  })
  it('senza virtuali restituisce le stesse opzioni', () => {
    const items = [1, 2]
    expect(mergeVirtualOptions(items, [], 'value')).toBe(items)
  })
})
