import { describe, expect, it } from 'vitest'
import {
  buildRemoteQuery,
  dependenciesReady,
  dependencyNames,
  isEmptyValue,
  resolveFieldParams,
} from '../../src/fields/helpers/remote-query'

describe('dependencyNames', () => {
  it('normalizza dependsOn', () => {
    expect(dependencyNames({})).toEqual([])
    expect(dependencyNames({ dependsOn: 'a' })).toEqual(['a'])
    expect(dependencyNames({ dependsOn: ['a', 'b'] })).toEqual(['a', 'b'])
  })
})

describe('isEmptyValue / dependenciesReady', () => {
  it('considera vuoti null, undefined, stringa vuota e array vuoto (0 e false no)', () => {
    expect([null, undefined, '', []].every(isEmptyValue)).toBe(true)
    expect([0, false, 'x', [1]].some(isEmptyValue)).toBe(false)
  })
  it('è pronto solo con tutte le dipendenze valorizzate', () => {
    expect(dependenciesReady({}, {})).toBe(true)
    expect(dependenciesReady({ dependsOn: ['a', 'b'] }, { a: 1 })).toBe(false)
    expect(dependenciesReady({ dependsOn: ['a', 'b'] }, { a: 1, b: 0 })).toBe(true)
  })
})

describe('resolveFieldParams', () => {
  it('senza params invia le dipendenze come query', () => {
    expect(resolveFieldParams({ dependsOn: 'countryId' }, { countryId: 7 })).toEqual({ countryId: 7 })
  })
  it('usa la funzione params e scarta i valori vuoti', () => {
    const field = { params: (v: Record<string, unknown>) => ({ country_id: v.countryId, q: '', x: null }) }
    expect(resolveFieldParams(field, { countryId: 3 })).toEqual({ country_id: 3 })
  })
  it('accetta un oggetto fisso, converte array e booleani', () => {
    expect(resolveFieldParams({ params: { a: [1, 2], b: true } }, {})).toEqual({ a: '1,2', b: 'true' })
  })
})

describe('buildRemoteQuery con dipendenze', () => {
  it('unisce params e pageSize (pageSize non sovrascrivibile da params)', () => {
    expect(
      buildRemoteQuery({ dependsOn: 'c', params: () => ({ pageSize: 1, c: 2 }) }, {}),
    ).toEqual({ c: 2, pageSize: 1000 })
  })
})
