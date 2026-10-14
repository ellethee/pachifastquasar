import { describe, expect, it } from 'vitest'
import {
  REMOTE_SELECT_PAGE_SIZE,
  buildRemoteQuery,
  parseRemoteResponse,
} from '../../src/fields/helpers/remote-query'

describe('buildRemoteQuery', () => {
  it('usa il pageSize di default', () => {
    expect(buildRemoteQuery({})).toEqual({ pageSize: REMOTE_SELECT_PAGE_SIZE })
  })
  it('rispetta field.pageSize valido e ignora quelli non validi', () => {
    expect(buildRemoteQuery({ pageSize: 50 })).toEqual({ pageSize: 50 })
    expect(buildRemoteQuery({ pageSize: 0 })).toEqual({ pageSize: REMOTE_SELECT_PAGE_SIZE })
    expect(buildRemoteQuery({ pageSize: Number.NaN })).toEqual({ pageSize: REMOTE_SELECT_PAGE_SIZE })
  })
})

describe('parseRemoteResponse', () => {
  it('accetta la risposta paginata', () => {
    expect(parseRemoteResponse({ items: [1, 2], total: 5, page: 1, pageSize: 2 })).toEqual({
      items: [1, 2],
      total: 5,
    })
  })
  it('accetta un array puro', () => {
    expect(parseRemoteResponse([{ id: 1 }])).toEqual({ items: [{ id: 1 }] })
  })
  it('gestisce risposte vuote o anomale', () => {
    expect(parseRemoteResponse(null)).toEqual({ items: [] })
    expect(parseRemoteResponse({})).toEqual({ items: [] })
    expect(parseRemoteResponse({ items: 'x' })).toEqual({ items: [] })
  })
})
