import { describe, expect, it } from 'vitest'
import { mergeVirtualOptions, safeLabel } from '../../src/fields/helpers/options'

describe('safeLabel', () => {
  it('returns the label or an empty string if the extractor throws', () => {
    expect(safeLabel(() => 'x', {})).toBe('x')
    expect(
      safeLabel((item) => (item as { a: { b: string } }).a.b, { value: 1 }),
    ).toBe('')
  })
})

describe('mergeVirtualOptions', () => {
  it('keeps the missing virtual ones and does not duplicate those already loaded', () => {
    const items = [{ value: 1, label: 'a' }]
    const virtuals = [{ value: 'new', label: 'new' }, { value: 1, label: 'dup' }]
    expect(mergeVirtualOptions(items, virtuals, 'value')).toEqual([
      { value: 1, label: 'a' },
      { value: 'new', label: 'new' },
    ])
  })
  it('without virtual ones it returns the same options', () => {
    const items = [1, 2]
    expect(mergeVirtualOptions(items, [], 'value')).toBe(items)
  })
})
