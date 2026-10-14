import { describe, expect, it } from 'vitest'
import { nextTick, reactive, ref } from 'vue'
import { useSection } from '../../src/edit-dialog/composables/useSection'

describe('useSection', () => {
  it('hasChanges / reset / commit', () => {
    const s = useSection({ list: ['a'], n: 1 })
    expect(s.hasChanges.value).toBe(false)
    s.state.value.list.push('b')
    expect(s.hasChanges.value).toBe(true)
    s.reset()
    expect(s.state.value.list).toEqual(['a'])
    expect(s.hasChanges.value).toBe(false)
    s.state.value.n = 2
    s.commit()
    expect(s.hasChanges.value).toBe(false)
    s.state.value.n = 3
    s.reset()
    expect(s.state.value.n).toBe(2)
  })

  it('accetta stato iniziale reattivo (nessun DataCloneError)', () => {
    const s = useSection(reactive({ a: { b: 1 } }))
    expect(s.state.value).toEqual({ a: { b: 1 } })
    s.setOriginalState(reactive({ a: { b: 2 } }))
    expect(s.state.value.a.b).toBe(2)
  })

  it('segue initialValue arrivato dopo (record asincrono)', async () => {
    const source = ref<{ x: number } | undefined>(undefined)
    const s = useSection({ x: 0 }, { initialValue: () => source.value })
    expect(s.state.value.x).toBe(0)
    source.value = { x: 7 }
    await nextTick()
    expect(s.state.value.x).toBe(7)
    expect(s.hasChanges.value).toBe(false)
  })
})
