import { describe, expect, it } from 'vitest'
import { nextTick, ref } from 'vue'
import { isEqualValue } from '../../src/edit-dialog/utils/equal'
import { useSection } from '../../src/edit-dialog/composables/useSection'

describe('isEqualValue', () => {
  it('ignora ordine chiavi e undefined vs mancante', () => {
    expect(isEqualValue({ a: 1, b: { c: 2, d: 3 } }, { b: { d: 3, c: 2 }, a: 1 })).toBe(true)
    expect(isEqualValue({ a: 1, b: undefined }, { a: 1 })).toBe(true)
  })
  it('distingue contenuti diversi, array e date', () => {
    expect(isEqualValue({ a: 1 }, { a: 2 })).toBe(false)
    expect(isEqualValue([1, 2], [2, 1])).toBe(false)
    expect(isEqualValue([1], { 0: 1 })).toBe(false)
    expect(isEqualValue(new Date(5), new Date(5))).toBe(true)
    expect(isEqualValue(new Date(5), new Date(6))).toBe(false)
    expect(isEqualValue(NaN, NaN)).toBe(true)
    expect(isEqualValue(null, {})).toBe(false)
  })
})

describe('useSection structural / initialValue', () => {
  it('hasChanges non dipende dall ordine delle chiavi', () => {
    const s = useSection<Record<string, number>>({ a: 1, b: 2 })
    s.state.value = { b: 2, a: 1 }
    expect(s.hasChanges.value).toBe(false)
  })
  it('nuovo riferimento con stesso contenuto non cancella le modifiche', async () => {
    const src = ref<{ x: number } | undefined>({ x: 1 })
    const s = useSection<{ x: number }>({ x: 0 }, { initialValue: () => src.value })
    s.state.value.x = 5
    src.value = { x: 1 }
    await nextTick()
    expect(s.state.value.x).toBe(5)
    src.value = { x: 2 }
    await nextTick()
    expect(s.state.value.x).toBe(2)
  })
})
