/** Sorting of a column. */
export interface IAdminSort {
  field: string
  descending: boolean
}

/** Parameters of a list request. */
export interface IAdminListQuery {
  page: number
  pageSize: number
  /** Sorting chosen by the user (only one); missing = backend default. */
  sort?: IAdminSort | null | undefined
  /** Multiple sorting (priority = array order); takes precedence over `sort`. */
  sorts?: IAdminSort[] | undefined
  search?: string | undefined
  /** Filter values by field name (empty ones omitted). */
  filters?: Record<string, unknown> | undefined
}

/** Offered page sizes. */
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100, 200] as const

/** Default page size (the backend one). */
export const DEFAULT_PAGE_SIZE = 25

/**
 * Interprets an entry of `list.ordering` (`field` or `-field`).
 *
 * @param entry - sorting entry
 * @returns field and direction
 */
export function parseOrdering(entry: string): IAdminSort {
  return entry.startsWith('-') ? { field: entry.slice(1), descending: true } : { field: entry, descending: false }
}

/**
 * Next sorting after a click on a column. Without `multi` (plain click) it replaces the sorting with that
 * column: ascending, then descending, then none. With `multi` (Shift+click) it appends the column at the
 * end (or flips its direction, or removes it after descending) keeping the others.
 *
 * @param current - current sorting
 * @param field - clicked column
 * @param multi - `true` for multiple sorting
 * @returns the new sorting
 */
export function nextSorts(current: IAdminSort[], field: string, multi: boolean): IAdminSort[] {
  const existing = current.find((s) => s.field === field)
  if (!multi) {
    if (!existing || current.length > 1) return [{ field, descending: false }]
    return existing.descending ? [] : [{ field, descending: true }]
  }
  if (!existing) return [...current, { field, descending: false }]
  if (!existing.descending) return current.map((s) => (s.field === field ? { ...s, descending: true } : s))
  return current.filter((s) => s.field !== field)
}

/**
 * Value of the `orderBy` parameter (`field` or `-field`).
 *
 * @param sort - sorting
 */
export function toOrderBy(sort: IAdminSort): string {
  return `${sort.descending ? '-' : ''}${sort.field}`
}

/**
 * Query string of a list: `page`, `pageSize`, `orderBy`, `search` and one parameter for each filled filter.
 * Booleans become `true`/`false`; `null`, `undefined`, `''` and empty arrays are omitted.
 *
 * @param query - parameters
 * @returns query string without `?` (empty string if there are no parameters)
 */
export function buildListQuery(query: IAdminListQuery): string {
  const params = new URLSearchParams()
  params.set('page', String(query.page))
  params.set('pageSize', String(query.pageSize))
  const sorts = query.sorts ?? (query.sort ? [query.sort] : [])
  if (sorts.length) params.set('orderBy', sorts.map(toOrderBy).join(','))
  const search = query.search?.trim()
  if (search) params.set('search', search)
  for (const [name, value] of Object.entries(query.filters ?? {})) {
    if (value === null || value === undefined || value === '') continue
    if (Array.isArray(value)) {
      if (value.length) params.set(name, value.join(','))
      continue
    }
    params.set(name, String(value))
  }
  return params.toString()
}

/**
 * Query string of `_options` (lookup): search, page and/or `ids` to resolve already saved values.
 *
 * @param opts - `search`, `page`, `pageSize` or `ids`
 * @returns query string without `?`
 */
export function buildOptionsQuery(opts: {
  search?: string | undefined
  page?: number | undefined
  pageSize?: number | undefined
  ids?: Array<number | string> | undefined
}): string {
  const params = new URLSearchParams()
  if (opts.ids?.length) params.set('ids', opts.ids.join(','))
  const search = opts.search?.trim()
  if (search) params.set('search', search)
  if (opts.page) params.set('page', String(opts.page))
  if (opts.pageSize) params.set('pageSize', String(opts.pageSize))
  return params.toString()
}

/**
 * Value of a range bound. For a `datetime` filter with the date only, `__gte` is the start of the day and
 * `__lte` the end of the day (user's local time) in ISO UTC; a value with the time is converted to ISO UTC.
 * Other types (numbers, `date`, `time`) stay as is.
 *
 * @param component - filter type
 * @param bound - `gte` or `lte`
 * @param value - input value
 * @returns the value to send
 */
export function rangeValue(component: string, bound: 'gte' | 'lte', value: unknown): unknown {
  if (component !== 'datetime' || typeof value !== 'string') return value
  const day = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (day) {
    const [y, m, d] = [Number(day[1]), Number(day[2]) - 1, Number(day[3])]
    const date = bound === 'gte' ? new Date(y, m, d, 0, 0, 0, 0) : new Date(y, m, d, 23, 59, 59, 999)
    return date.toISOString()
  }
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toISOString()
}

/**
 * Filter parameters for the request: equality `?field=value`; for filters with `range` the parameters
 * `field__gte` and `field__lte` (the input values are in `values` with the same keys).
 *
 * @param filters - schema filters
 * @param values - input values by key (`field`, `field__gte`, `field__lte`)
 * @returns the filled parameters
 */
export function filterQueryParams(
  filters: Array<{ field: string, component: string, range?: boolean | undefined }>,
  values: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  const filled = (v: unknown): boolean => v !== null && v !== undefined && v !== ''
  for (const f of filters) {
    if (f.range) {
      for (const bound of ['gte', 'lte'] as const) {
        const v = values[`${f.field}__${bound}`]
        if (filled(v)) out[`${f.field}__${bound}`] = rangeValue(f.component, bound, v)
      }
    } else if (filled(values[f.field])) {
      out[f.field] = values[f.field]
    }
  }
  return out
}
