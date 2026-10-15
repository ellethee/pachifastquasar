import { describe, expect, it } from 'vitest'
import { hasEventListener, resolveRowFlag, shouldShowActionsColumn } from '../../src/table/helpers/props-helper'

describe('resolveRowFlag', () => {
  it('undefined is true', () => expect(resolveRowFlag(undefined, {})).toBe(true))
  it('fixed boolean', () => {
    expect(resolveRowFlag(false, {})).toBe(false)
    expect(resolveRowFlag(true, {})).toBe(true)
  })
  it('per-row function', () => {
    expect(resolveRowFlag((r: { id: number }) => r.id > 1, { id: 1 })).toBe(false)
    expect(resolveRowFlag((r: { id: number }) => r.id > 1, { id: 2 })).toBe(true)
  })
})

describe('shouldShowActionsColumn', () => {
  it('needs useColActions', () => expect(shouldShowActionsColumn(false, true, true)).toBe(false))
  it('visible by default and with emit-delete', () => {
    expect(shouldShowActionsColumn(true, undefined, undefined)).toBe(true)
    expect(shouldShowActionsColumn('emit-delete', true, true)).toBe(true)
  })
  it('hidden only if edit and delete are both false', () => {
    expect(shouldShowActionsColumn(true, false, false)).toBe(false)
    expect(shouldShowActionsColumn(true, false, true)).toBe(true)
    expect(shouldShowActionsColumn(true, () => false, false)).toBe(true)
  })
})

describe('hasEventListener', () => {
  it('finds camelCase (SFC: @pt2:edit-item and @pt2:editItem) and kebab (JSX)', () => {
    expect(hasEventListener({ 'onPt2:editItem': () => {} }, 'pt2:edit-item')).toBe(true)
    expect(hasEventListener({ 'onPt2:edit-item': () => {} }, 'pt2:edit-item')).toBe(true)
  })
  it('false without listeners or props', () => {
    expect(hasEventListener({}, 'pt2:edit-item')).toBe(false)
    expect(hasEventListener(null, 'pt2:edit-item')).toBe(false)
  })
})
