import type { IOrderState } from '../types/pachitable2'

/**
 * Builds the value of the `orderBy` parameter (comma-separated columns, `-` prefix for descending).
 *
 * @param sortState - multi-sort state
 * @returns string like `name,-createdAt`
 */
export function buildOrderBy(sortState: IOrderState[]): string {
  return sortState.map(s => `${s.direction === 'desc' ? '-' : ''}${s.column}`).join(',')
}

/** Inputs for building the list request parameters. */
export interface IRequestParamsInput {
  page: number
  pageSize: number
  /** With local pagination `orderBy` and `search` are not sent. */
  localPagination: boolean
  orderBy: string
  search: string | null | undefined
  /** Extra parameters: they override the standard ones with the same name. */
  extraParams?: Record<string, unknown>
}

/**
 * Builds the query parameters of the list request (`page`, `pageSize`, `orderBy`, `search` + extra).
 *
 * @param input - request inputs
 * @returns parameters object
 */
export function buildRequestParams(input: IRequestParamsInput): Record<string, unknown> {
  return {
    page: input.page,
    pageSize: input.pageSize,
    // `search` comes from a `q-input clearable`, which emits `null` when X is clicked: no "search=null"
    ...(input.localPagination ? {} : { orderBy: input.orderBy, search: input.search ?? '' }),
    ...(input.extraParams ?? {}),
  }
}

/**
 * Encodes the query parameters for alova, which concatenates them to the URL without encoding (`&`, `#`, `+`, `%` in values would break
 * the query) and converts `null` to "null". `null`/`undefined` values are omitted.
 *
 * @param params - parameters (including app extras)
 * @returns parameters with keys and values already encoded with `encodeURIComponent`
 */
export function encodeQueryParams(params: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue
    out[encodeURIComponent(key)] = encodeURIComponent(String(value))
  }
  return out
}

/**
 * Path segment for a row key (`/<key>`): the key may contain `/`, `?`, `#`.
 *
 * @param key - primary key value
 * @returns the encoded key
 */
export function encodeKey(key: unknown): string {
  return encodeURIComponent(String(key))
}

/**
 * Shallow comparison of two arrays (same length and same elements by identity).
 *
 * @param a - first array
 * @param b - second array
 * @returns true if equal
 */
export function shallowEqualArrays(a: readonly unknown[], b: readonly unknown[]): boolean {
  return a.length === b.length && a.every((v, i) => Object.is(v, b[i]))
}
