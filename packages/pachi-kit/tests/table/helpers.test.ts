import { describe, expect, it } from 'vitest'
import { multiSort } from '../../src/table/helpers/sort-helper'
import { buildOrderBy, buildRequestParams, encodeKey, encodeQueryParams, shallowEqualArrays } from '../../src/table/helpers/request-helper'

interface Row { id: number, name: string | null, age?: number | null }

describe('multiSort', () => {
  const rows: Row[] = [
    { id: 1, name: 'b', age: 30 },
    { id: 2, name: 'a', age: 30 },
    { id: 3, name: 'c', age: 20 },
  ]

  it('sorts by one column and does not mutate the input', () => {
    const out = multiSort(rows, [{ column: 'name', direction: 'desc' }])
    expect(out.map(r => r.id)).toEqual([3, 1, 2])
    expect(rows.map(r => r.id)).toEqual([1, 2, 3])
  })

  it('uses the following columns on ties', () => {
    const out = multiSort(rows, [{ column: 'age', direction: 'desc' }, { column: 'name', direction: 'asc' }])
    expect(out.map(r => r.id)).toEqual([2, 1, 3])
  })

  it('natural numeric comparison', () => {
    const items = [{ v: '10' }, { v: '9' }, { v: '1' }]
    expect(multiSort(items, [{ column: 'v', direction: 'asc' }]).map(r => r.v)).toEqual(['1', '9', '10'])
  })

  it('nullsLast puts nulls last, also in descending order', () => {
    const items: Row[] = [{ id: 1, name: null }, { id: 2, name: 'a' }, { id: 3, name: 'b' }]
    expect(multiSort(items, [{ column: 'name', direction: 'asc' }], true).map(r => r.id)).toEqual([2, 3, 1])
    expect(multiSort(items, [{ column: 'name', direction: 'desc' }], true).map(r => r.id)).toEqual([3, 2, 1])
  })

  it('nullsLast for specific columns', () => {
    const items: Row[] = [{ id: 1, name: null }, { id: 2, name: 'z' }]
    expect(multiSort(items, [{ column: 'name', direction: 'asc' }], ['other']).map(r => r.id)).toEqual([1, 2])
    expect(multiSort(items, [{ column: 'name', direction: 'asc' }], ['name']).map(r => r.id)).toEqual([2, 1])
  })

  it('without state it returns the original order', () => {
    expect(multiSort(rows, []).map(r => r.id)).toEqual([1, 2, 3])
  })
})

describe('buildOrderBy', () => {
  it('prefixes - for descending and separates with a comma', () => {
    expect(buildOrderBy([{ column: 'name', direction: 'asc' }, { column: 'age', direction: 'desc' }])).toBe('name,-age')
  })
  it('empty string without sorting', () => {
    expect(buildOrderBy([])).toBe('')
  })
})

describe('buildRequestParams', () => {
  it('remote mode: sends orderBy and search', () => {
    expect(buildRequestParams({ page: 2, pageSize: 50, localPagination: false, orderBy: '-id', search: 'x' }))
      .toEqual({ page: 2, pageSize: 50, orderBy: '-id', search: 'x' })
  })
  it('local mode: no orderBy/search', () => {
    expect(buildRequestParams({ page: 1, pageSize: 0, localPagination: true, orderBy: '-id', search: 'x' }))
      .toEqual({ page: 1, pageSize: 0 })
  })
  it('extraParams override the standard parameters', () => {
    expect(buildRequestParams({ page: 1, pageSize: 10, localPagination: false, orderBy: '', search: '', extraParams: { search: 'forzato', tenant: 3 } }))
      .toMatchObject({ search: 'forzato', tenant: 3 })
  })
})

describe('null search and query encoding', () => {
  it('null search (clearable) becomes an empty string, never "null"', () => {
    expect(buildRequestParams({ page: 1, pageSize: 10, localPagination: false, orderBy: '', search: null }).search).toBe('')
  })
  it('encodeQueryParams encodes keys and values and omits null/undefined', () => {
    expect(encodeQueryParams({ search: 'a&b=c#d+e%', skip: null, none: undefined, n: 3, 'x y': true }))
      .toEqual({ search: 'a%26b%3Dc%23d%2Be%25', n: '3', 'x%20y': 'true' })
  })
  it('encodeKey protects / ? # in row keys', () => {
    expect(encodeKey('a/b?c#d')).toBe('a%2Fb%3Fc%23d')
    expect(encodeKey(7)).toBe('7')
  })
})

describe('shallowEqualArrays', () => {
  it('equal by element identity', () => {
    expect(shallowEqualArrays([1, 'a'], [1, 'a'])).toBe(true)
    expect(shallowEqualArrays([1], [1, 2])).toBe(false)
    expect(shallowEqualArrays([{}], [{}])).toBe(false)
  })
})
