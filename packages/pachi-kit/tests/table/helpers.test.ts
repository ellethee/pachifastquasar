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

  it('ordina per una colonna e non muta l\'input', () => {
    const out = multiSort(rows, [{ column: 'name', direction: 'desc' }])
    expect(out.map(r => r.id)).toEqual([3, 1, 2])
    expect(rows.map(r => r.id)).toEqual([1, 2, 3])
  })

  it('usa le colonne successive a parita\'', () => {
    const out = multiSort(rows, [{ column: 'age', direction: 'desc' }, { column: 'name', direction: 'asc' }])
    expect(out.map(r => r.id)).toEqual([2, 1, 3])
  })

  it('confronto numerico naturale', () => {
    const items = [{ v: '10' }, { v: '9' }, { v: '1' }]
    expect(multiSort(items, [{ column: 'v', direction: 'asc' }]).map(r => r.v)).toEqual(['1', '9', '10'])
  })

  it('nullsLast mette i null in fondo, anche in discendente', () => {
    const items: Row[] = [{ id: 1, name: null }, { id: 2, name: 'a' }, { id: 3, name: 'b' }]
    expect(multiSort(items, [{ column: 'name', direction: 'asc' }], true).map(r => r.id)).toEqual([2, 3, 1])
    expect(multiSort(items, [{ column: 'name', direction: 'desc' }], true).map(r => r.id)).toEqual([3, 2, 1])
  })

  it('nullsLast per colonne specifiche', () => {
    const items: Row[] = [{ id: 1, name: null }, { id: 2, name: 'z' }]
    expect(multiSort(items, [{ column: 'name', direction: 'asc' }], ['other']).map(r => r.id)).toEqual([1, 2])
    expect(multiSort(items, [{ column: 'name', direction: 'asc' }], ['name']).map(r => r.id)).toEqual([2, 1])
  })

  it('senza stato restituisce l\'ordine originale', () => {
    expect(multiSort(rows, []).map(r => r.id)).toEqual([1, 2, 3])
  })
})

describe('buildOrderBy', () => {
  it('prefissa - per il discendente e separa con virgola', () => {
    expect(buildOrderBy([{ column: 'name', direction: 'asc' }, { column: 'age', direction: 'desc' }])).toBe('name,-age')
  })
  it('stringa vuota senza ordinamento', () => {
    expect(buildOrderBy([])).toBe('')
  })
})

describe('buildRequestParams', () => {
  it('modalita remota: invia orderBy e search', () => {
    expect(buildRequestParams({ page: 2, pageSize: 50, localPagination: false, orderBy: '-id', search: 'x' }))
      .toEqual({ page: 2, pageSize: 50, orderBy: '-id', search: 'x' })
  })
  it('modalita locale: niente orderBy/search', () => {
    expect(buildRequestParams({ page: 1, pageSize: 0, localPagination: true, orderBy: '-id', search: 'x' }))
      .toEqual({ page: 1, pageSize: 0 })
  })
  it('gli extraParams sovrascrivono i parametri standard', () => {
    expect(buildRequestParams({ page: 1, pageSize: 10, localPagination: false, orderBy: '', search: '', extraParams: { search: 'forzato', tenant: 3 } }))
      .toMatchObject({ search: 'forzato', tenant: 3 })
  })
})

describe('search nullo e codifica della query', () => {
  it('search null (clearable) diventa stringa vuota, mai "null"', () => {
    expect(buildRequestParams({ page: 1, pageSize: 10, localPagination: false, orderBy: '', search: null }).search).toBe('')
  })
  it('encodeQueryParams codifica chiavi e valori e omette null/undefined', () => {
    expect(encodeQueryParams({ search: 'a&b=c#d+e%', skip: null, none: undefined, n: 3, 'x y': true }))
      .toEqual({ search: 'a%26b%3Dc%23d%2Be%25', n: '3', 'x%20y': 'true' })
  })
  it('encodeKey protegge / ? # nelle chiavi di riga', () => {
    expect(encodeKey('a/b?c#d')).toBe('a%2Fb%3Fc%23d')
    expect(encodeKey(7)).toBe('7')
  })
})

describe('shallowEqualArrays', () => {
  it('uguali per identita degli elementi', () => {
    expect(shallowEqualArrays([1, 'a'], [1, 'a'])).toBe(true)
    expect(shallowEqualArrays([1], [1, 2])).toBe(false)
    expect(shallowEqualArrays([{}], [{}])).toBe(false)
  })
})
