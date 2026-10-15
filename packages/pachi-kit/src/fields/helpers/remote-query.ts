import type { IFieldDef, IFieldsState } from '../types'

/** Default `pageSize` requested from the backend for a remote select (a single fetch, no pagination). */
export const REMOTE_SELECT_PAGE_SIZE = 1000

/**
 * Builds the query string of the options GET of a remote select.
 *
 * @param field - field definition (optional `pageSize` to override the default)
 * @returns query parameters
 */
export function buildRemoteQuery(
  field: Pick<IFieldDef, 'pageSize' | 'params' | 'dependsOn'>,
  values: IFieldsState = {},
): Record<string, string | number> {
  const size = Number(field.pageSize)
  return {
    ...resolveFieldParams(field, values),
    pageSize: Number.isFinite(size) && size > 0 ? size : REMOTE_SELECT_PAGE_SIZE,
  }
}

/** `true` if the value is considered empty (`null`, `undefined`, `''`, empty array). */
export function isEmptyValue(value: unknown): boolean {
  return value === null || value === undefined || value === '' || (Array.isArray(value) && !value.length)
}

/**
 * Names of the fields `field` depends on (`dependsOn` normalized to an array).
 *
 * @param field - definizione del campo
 * @returns list of names (empty if there are no dependencies)
 */
export function dependencyNames(field: Pick<IFieldDef, 'dependsOn'>): string[] {
  const deps = field.dependsOn
  if (!deps) return []
  return Array.isArray(deps) ? deps : [deps]
}

/**
 * `true` if all the field's dependencies have a value (a field without dependencies is always ready).
 *
 * @param field - definizione del campo
 * @param values - current values of the section
 */
export function dependenciesReady(field: Pick<IFieldDef, 'dependsOn'>, values: IFieldsState): boolean {
  return dependencyNames(field).every((name) => !isEmptyValue(values[name]))
}

/**
 * Extra query params of a field: `params` (object or function of the values) or, if absent,
 * the dependencies as `<field>=<value>`. Discards empty values; arrays become `a,b`.
 *
 * @param field - definizione del campo
 * @param values - current values of the section
 * @returns parameters ready for the query string
 */
export function resolveFieldParams(
  field: Pick<IFieldDef, 'params' | 'dependsOn'>,
  values: IFieldsState,
): Record<string, string | number> {
  const raw =
    typeof field.params === 'function'
      ? field.params(values)
      : (field.params ??
        Object.fromEntries(dependencyNames(field).map((name) => [name, values[name]])))
  const out: Record<string, string | number> = {}
  for (const [key, value] of Object.entries(raw)) {
    if (isEmptyValue(value)) continue
    out[key] = typeof value === 'number' ? value : Array.isArray(value) ? value.join(',') : String(value)
  }
  return out
}

/** Normalized result of a list response. */
export interface IParsedRemoteResponse {
  items: unknown[]
  /** Total declared by the backend (paginated response only). */
  total?: number
}

/**
 * Normalizes the backend response: accepts both `{ items, total, ... }` and a plain array.
 *
 * @param res - JSON body of the response
 * @returns items and total (if known)
 */
export function parseRemoteResponse(res: unknown): IParsedRemoteResponse {
  if (Array.isArray(res)) return { items: res }
  if (res && typeof res === 'object') {
    const { items, total } = res as { items?: unknown; total?: unknown }
    return {
      items: Array.isArray(items) ? items : [],
      ...(typeof total === 'number' ? { total } : {}),
    }
  }
  return { items: [] }
}
