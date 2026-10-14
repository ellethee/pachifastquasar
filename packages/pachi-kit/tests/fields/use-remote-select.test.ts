import { describe, expect, it, vi } from 'vitest'
import { nextTick, reactive } from 'vue'
import { useRemoteSelect } from '../../src/fields/composables/use-remote-select'
import { setPachiFieldsHttp } from '../../src/fields/helpers/http'
import type { IFieldDef } from '../../src/fields/types'

vi.mock('@ilpachi/pachi-i18n', () => ({ usePachiI18n: () => ({ t: (key: string) => key }),
  collectLocales: () => ({}),
}))
vi.mock('quasar', () => ({ Notify: { create: () => undefined } }))

describe('useRemoteSelect con dependsOn', () => {
  it('non carica senza dipendenza e ricarica con i params al cambio', async () => {
    const calls: Record<string, string | number>[] = []
    setPachiFieldsHttp({
      get: (async (_url: string, params?: Record<string, string | number>) => {
        calls.push(params ?? {})
        return { items: [{ value: 1, label: 'x' }], total: 1 }
      }) as never,
    })
    const values = reactive<Record<string, unknown>>({ countryId: null })
    const field: IFieldDef = {
      field: 'cityId',
      label: 'Città',
      type: 'select',
      url: '/api/cities',
      dependsOn: 'countryId',
      params: (v) => ({ country: v.countryId }),
    }
    const api = useRemoteSelect(field, values)
    await nextTick()
    expect(calls).toHaveLength(0)
    expect(api.options.value).toEqual([])

    values.countryId = 5
    await new Promise((r) => setTimeout(r, 0))
    expect(calls).toEqual([{ country: 5, pageSize: 1000 }])
    expect(api.options.value).toHaveLength(1)

    values.countryId = 6
    await new Promise((r) => setTimeout(r, 0))
    expect(calls).toHaveLength(2)

    values.countryId = null
    await new Promise((r) => setTimeout(r, 0))
    expect(calls).toHaveLength(2)
    expect(api.options.value).toEqual([])
  })
})

describe('useRemoteSelect senza client HTTP', () => {
  it('un campo non select non richiede alcun client (nessun throw al setup)', async () => {
    const { useRemoteSelect: use } = await import('../../src/fields/composables/use-remote-select')
    const api = use({ field: 'nome', label: 'Nome' })
    await nextTick()
    expect(api.error.value).toBe(false)
    expect(api.options.value).toEqual([])
  })

  it('un select locale non richiede alcun client', () => {
    const api = useRemoteSelect({ field: 's', label: 'S', type: 'select', options: [{ value: 1, label: 'a' }] })
    expect(api.options.value).toHaveLength(1)
  })

  it('un select remoto senza client non lancia: imposta error', async () => {
    vi.resetModules()
    const fresh = await import('../../src/fields/composables/use-remote-select')
    const api = fresh.useRemoteSelect({ field: 'r', label: 'R', type: 'select', url: '/api/x' })
    await new Promise((r) => setTimeout(r, 0))
    expect(api.error.value).toBe(true)
    expect(api.loading.value).toBe(false)
  })
})

describe('useRemoteSelect opzioni virtuali', () => {
  it('createValueFn con optionLabel funzione che lancia non lancia e le virtuali sopravvivono al ricalcolo', async () => {
    const field = reactive<IFieldDef>({
      field: 't',
      label: 'T',
      type: 'select',
      useInput: true,
      options: [{ value: 1, label: 'a' }],
      optionLabel: (item) => (item as { label: { x: string } }).label.x,
    })
    const api = useRemoteSelect(field)
    const done = vi.fn()
    expect(() => api.createValueFn('nuovo', done)).not.toThrow()
    expect(done).toHaveBeenCalledWith('nuovo', 'add-unique')
    field.options = [{ value: 1, label: 'a' }]
    await nextTick()
    expect(api.options.value).toHaveLength(2)
  })
})
