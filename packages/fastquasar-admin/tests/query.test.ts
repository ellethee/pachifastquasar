import { describe, expect, it } from 'vitest'
import { buildListQuery, buildOptionsQuery, parseOrdering, toOrderBy } from '../src/helpers/query'

describe('query', () => {
  it('parseOrdering / toOrderBy', () => {
    expect(parseOrdering('-id')).toEqual({ field: 'id', descending: true })
    expect(parseOrdering('name')).toEqual({ field: 'name', descending: false })
    expect(toOrderBy({ field: 'id', descending: true })).toBe('-id')
  })

  it('list: page, order, search and filled filters', () => {
    const qs = buildListQuery({
      page: 2, pageSize: 50, sort: { field: 'price', descending: true }, search: ' foo ',
      filters: { active: false, category: 'toys', empty: '', none: null, ids: [1, 2], nope: [] },
    })
    const p = new URLSearchParams(qs)
    expect(p.get('page')).toBe('2')
    expect(p.get('pageSize')).toBe('50')
    expect(p.get('orderBy')).toBe('-price')
    expect(p.get('search')).toBe('foo')
    expect(p.get('active')).toBe('false')
    expect(p.get('category')).toBe('toys')
    expect(p.get('ids')).toBe('1,2')
    expect(p.has('empty') || p.has('none') || p.has('nope')).toBe(false)
  })

  it('without sorting or search it does not send orderBy/search', () => {
    expect(buildListQuery({ page: 1, pageSize: 25 })).toBe('page=1&pageSize=25')
  })

  it('options: ids and search', () => {
    expect(buildOptionsQuery({ ids: [1, 'a'] })).toBe('ids=1%2Ca')
    expect(buildOptionsQuery({ search: 'x', page: 1, pageSize: 20 })).toBe('search=x&page=1&pageSize=20')
  })
})
