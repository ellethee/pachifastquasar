import { afterEach, describe, expect, it, vi } from 'vitest'
import { camelize, describeError, itemField } from '../src/helpers/api-error'
import { fetchAdminModels, resetAdminModels } from '../src/helpers/models-state'
import { buildListQuery, filterQueryParams, nextSorts, rangeValue } from '../src/helpers/query'
import { loadRowLabels, summarizeLabels } from '../src/helpers/row-labels'
import { historyChanges } from '../src/helpers/history'
import type { IAdminApi } from '../src/helpers/api'

vi.mock('@ilpachi/pachi-i18n', () => ({ getPachiI18n: () => undefined, pachiT: (k: string) => k }))

const tr = { te: () => false, t: (k: string) => k }

afterEach(() => {
  resetAdminModels()
  vi.useRealTimers()
})

describe('multiple sorting', () => {
  it('orderBy with several comma-separated fields', () => {
    const qs = buildListQuery({ page: 1, pageSize: 25, sorts: [{ field: 'status', descending: true }, { field: 'number', descending: false }] })
    expect(new URLSearchParams(qs).get('orderBy')).toBe('-status,number')
  })

  it('plain click: asc, desc, none; replaces the multiple sorting', () => {
    let s = nextSorts([], 'a', false)
    expect(s).toEqual([{ field: 'a', descending: false }])
    s = nextSorts(s, 'a', false)
    expect(s).toEqual([{ field: 'a', descending: true }])
    expect(nextSorts(s, 'a', false)).toEqual([])
    expect(nextSorts([{ field: 'a', descending: false }, { field: 'b', descending: false }], 'a', false)).toEqual([{ field: 'a', descending: false }])
  })

  it('Shift+click accumulates, flips and removes', () => {
    let s = nextSorts([{ field: 'a', descending: true }], 'b', true)
    expect(s.map((x) => x.field)).toEqual(['a', 'b'])
    s = nextSorts(s, 'b', true)
    expect(s[1]).toEqual({ field: 'b', descending: true })
    expect(nextSorts(s, 'b', true).map((x) => x.field)).toEqual(['a'])
  })
})

describe('range filters', () => {
  it('equality without range, __gte/__lte with range', () => {
    const filters = [
      { field: 'status', component: 'input' },
      { field: 'price', component: 'number', range: true },
      { field: 'due', component: 'date', range: true },
    ]
    expect(filterQueryParams(filters, { status: 'x', 'price__gte': 10, 'due__lte': '2026-01-31', 'due__gte': '' })).toEqual({
      status: 'x', price__gte: 10, due__lte: '2026-01-31',
    })
  })

  it('datetime with the date only: start and end of day in ISO UTC', () => {
    const gte = new Date(rangeValue('datetime', 'gte', '2026-01-01') as string)
    const lte = new Date(rangeValue('datetime', 'lte', '2026-01-01') as string)
    expect(gte.getHours()).toBe(0)
    expect(lte.getHours()).toBe(23)
    expect(lte.getMinutes()).toBe(59)
    expect(rangeValue('datetime', 'gte', '2026-01-01')).toMatch(/Z$/)
    expect(rangeValue('number', 'gte', 5)).toBe(5)
  })

  it('422 on query: error on the right filter (dueDate__gte is not split)', () => {
    expect(camelize('dueDate__gte')).toBe('dueDate__gte')
    expect(itemField({ loc: ['query', 'dueDate__gte'] })).toBe('dueDate__gte')
    const d = describeError({ status: 422, items: [{ msg: 'Invalid date', loc: ['query', 'dueDate__gte'] }, { msg: 'Invalid orderBy', code: 'api.invalid_order_by', loc: ['query', 'orderBy'] }] }, tr)
    expect(d.fields).toEqual({ dueDate__gte: 'Invalid date' })
    expect(d.message).toBe('Invalid orderBy')
  })
})

describe('row titles', () => {
  it('summary with "k more"', () => {
    expect(summarizeLabels(['a', 'b', 'c', 'd', 'e', 'f'], 9)).toEqual({ shown: ['a', 'b', 'c', 'd', 'e'], more: 4 })
    expect(summarizeLabels([], 0)).toEqual({ shown: [], more: 0 })
  })

  it('a single _options?ids= call and ids order', async () => {
    const options = vi.fn().mockResolvedValue({ items: [{ value: 13, label: 'B' }, { value: 12, label: 'A' }] })
    const labels = await loadRowLabels({ options } as unknown as IAdminApi, 'demo', 'item', [12, 13])
    expect(labels).toEqual(['A', 'B'])
    expect(options).toHaveBeenCalledTimes(1)
    expect(options.mock.calls[0]![2]).toEqual({ ids: [12, 13] })
    expect(await loadRowLabels({ options: vi.fn().mockRejectedValue(new Error('x')) } as unknown as IAdminApi, 'a', 'b', [1])).toEqual([])
  })
})

describe('history', () => {
  it('empty or null changes does not crash', () => {
    expect(historyChanges({ changes: {} })).toEqual([])
    expect(historyChanges({ changes: null as never })).toEqual([])
  })
})

describe('model list: shared requests', () => {
  it('close calls use a single request', async () => {
    const listModels = vi.fn().mockResolvedValue([])
    const api = { listModels } as unknown as IAdminApi
    await Promise.all([fetchAdminModels(api), fetchAdminModels(api), fetchAdminModels(api)])
    await fetchAdminModels(api)
    expect(listModels).toHaveBeenCalledTimes(1)
  })

  it('an error is not kept in cache', async () => {
    const listModels = vi.fn().mockRejectedValueOnce(new Error('x')).mockResolvedValue([])
    const api = { listModels } as unknown as IAdminApi
    await expect(fetchAdminModels(api)).rejects.toThrow()
    await fetchAdminModels(api)
    expect(listModels).toHaveBeenCalledTimes(2)
  })
})
