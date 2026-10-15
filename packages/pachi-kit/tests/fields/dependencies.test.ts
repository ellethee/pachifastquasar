import { describe, expect, it } from 'vitest'
import {
  buildRemoteQuery,
  dependenciesReady,
  dependencyNames,
  isEmptyValue,
  resolveFieldParams,
} from '../../src/fields/helpers/remote-query'

describe('dependencyNames', () => {
  it('normalizes dependsOn', () => {
    expect(dependencyNames({})).toEqual([])
    expect(dependencyNames({ dependsOn: 'a' })).toEqual(['a'])
    expect(dependencyNames({ dependsOn: ['a', 'b'] })).toEqual(['a', 'b'])
  })
})

describe('isEmptyValue / dependenciesReady', () => {
  it('treats null, undefined, empty string and empty array as empty (0 and false are not)', () => {
    expect([null, undefined, '', []].every(isEmptyValue)).toBe(true)
    expect([0, false, 'x', [1]].some(isEmptyValue)).toBe(false)
  })
  it('is ready only with all dependencies set', () => {
    expect(dependenciesReady({}, {})).toBe(true)
    expect(dependenciesReady({ dependsOn: ['a', 'b'] }, { a: 1 })).toBe(false)
    expect(dependenciesReady({ dependsOn: ['a', 'b'] }, { a: 1, b: 0 })).toBe(true)
  })
})

describe('resolveFieldParams', () => {
  it('without params it sends the dependencies as query', () => {
    expect(resolveFieldParams({ dependsOn: 'countryId' }, { countryId: 7 })).toEqual({ countryId: 7 })
  })
  it('uses the params function and discards empty values', () => {
    const field = { params: (v: Record<string, unknown>) => ({ country_id: v.countryId, q: '', x: null }) }
    expect(resolveFieldParams(field, { countryId: 3 })).toEqual({ country_id: 3 })
  })
  it('accepts a fixed object, converts arrays and booleans', () => {
    expect(resolveFieldParams({ params: { a: [1, 2], b: true } }, {})).toEqual({ a: '1,2', b: 'true' })
  })
})

describe('buildRemoteQuery with dependencies', () => {
  it('merges params and pageSize (pageSize cannot be overridden by params)', () => {
    expect(
      buildRemoteQuery({ dependsOn: 'c', params: () => ({ pageSize: 1, c: 2 }) }, {}),
    ).toEqual({ c: 2, pageSize: 1000 })
  })
})
