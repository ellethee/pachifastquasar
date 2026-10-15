import { describe, expect, it } from 'vitest'
import {
  REMOTE_SELECT_PAGE_SIZE,
  buildRemoteQuery,
  parseRemoteResponse,
} from '../../src/fields/helpers/remote-query'

describe('buildRemoteQuery', () => {
  it('uses the default pageSize', () => {
    expect(buildRemoteQuery({})).toEqual({ pageSize: REMOTE_SELECT_PAGE_SIZE })
  })
  it('honors a valid field.pageSize and ignores invalid ones', () => {
    expect(buildRemoteQuery({ pageSize: 50 })).toEqual({ pageSize: 50 })
    expect(buildRemoteQuery({ pageSize: 0 })).toEqual({ pageSize: REMOTE_SELECT_PAGE_SIZE })
    expect(buildRemoteQuery({ pageSize: Number.NaN })).toEqual({ pageSize: REMOTE_SELECT_PAGE_SIZE })
  })
})

describe('parseRemoteResponse', () => {
  it('accepts the paginated response', () => {
    expect(parseRemoteResponse({ items: [1, 2], total: 5, page: 1, pageSize: 2 })).toEqual({
      items: [1, 2],
      total: 5,
    })
  })
  it('accepts a plain array', () => {
    expect(parseRemoteResponse([{ id: 1 }])).toEqual({ items: [{ id: 1 }] })
  })
  it('handles empty or anomalous responses', () => {
    expect(parseRemoteResponse(null)).toEqual({ items: [] })
    expect(parseRemoteResponse({})).toEqual({ items: [] })
    expect(parseRemoteResponse({ items: 'x' })).toEqual({ items: [] })
  })
})
