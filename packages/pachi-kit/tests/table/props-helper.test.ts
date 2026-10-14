import { describe, expect, it } from 'vitest'
import { hasEventListener, resolveRowFlag, shouldShowActionsColumn } from '../../src/table/helpers/props-helper'

describe('resolveRowFlag', () => {
  it('undefined vale true', () => expect(resolveRowFlag(undefined, {})).toBe(true))
  it('booleano fisso', () => {
    expect(resolveRowFlag(false, {})).toBe(false)
    expect(resolveRowFlag(true, {})).toBe(true)
  })
  it('funzione per riga', () => {
    expect(resolveRowFlag((r: { id: number }) => r.id > 1, { id: 1 })).toBe(false)
    expect(resolveRowFlag((r: { id: number }) => r.id > 1, { id: 2 })).toBe(true)
  })
})

describe('shouldShowActionsColumn', () => {
  it('serve useColActions', () => expect(shouldShowActionsColumn(false, true, true)).toBe(false))
  it('visibile di default e con emit-delete', () => {
    expect(shouldShowActionsColumn(true, undefined, undefined)).toBe(true)
    expect(shouldShowActionsColumn('emit-delete', true, true)).toBe(true)
  })
  it('nascosta solo se edit e delete sono entrambi false', () => {
    expect(shouldShowActionsColumn(true, false, false)).toBe(false)
    expect(shouldShowActionsColumn(true, false, true)).toBe(true)
    expect(shouldShowActionsColumn(true, () => false, false)).toBe(true)
  })
})

describe('hasEventListener', () => {
  it('trova camelCase (SFC: @pt2:edit-item e @pt2:editItem) e kebab (JSX)', () => {
    expect(hasEventListener({ 'onPt2:editItem': () => {} }, 'pt2:edit-item')).toBe(true)
    expect(hasEventListener({ 'onPt2:edit-item': () => {} }, 'pt2:edit-item')).toBe(true)
  })
  it('false senza listener o props', () => {
    expect(hasEventListener({}, 'pt2:edit-item')).toBe(false)
    expect(hasEventListener(null, 'pt2:edit-item')).toBe(false)
  })
})
