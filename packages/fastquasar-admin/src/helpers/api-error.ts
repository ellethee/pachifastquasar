/** A single backend error (`detail[]`). */
export interface IPachiApiErrorItem {
  /** Stable code (e.g. `admin.object_not_found`), if present. */
  code?: string
  /** Backend message (server language). */
  msg?: string
  /** Parameters for interpolation (e.g. `{ permissions: ['demo.item.view'] }`). */
  params?: Record<string, unknown>
  /** Error location (e.g. `['body', 'name']`). */
  loc?: Array<string | number>
}

/** Normalized HTTP error. */
export interface IPachiApiError {
  /** HTTP code (0 if network error / unknown). */
  status: number
  /** `detail` entries (empty if the body is not in the expected format). */
  items: IPachiApiErrorItem[]
}

/** Error family, useful to choose how to display it. */
export type AdminErrorKind =
  | 'validation'
  | 'conflict'
  | 'forbidden'
  | 'notFound'
  | 'unauthorized'
  | 'network'
  | 'other'

/** Translation functions needed by {@link describeError}. */
export interface IPachiErrorTranslator {
  /** `true` if the key exists. */
  te: (key: string) => boolean
  /** Translates the key with the parameters. */
  t: (key: string, params?: Record<string, unknown>) => string
}

/** Error description ready for the UI. */
export interface IAdminErrorDescription {
  kind: AdminErrorKind
  status: number
  /** General message (never empty). */
  message: string
  /** Per-field messages (only 422 with `loc` `["body", <field>]`). */
  fields: Record<string, string>
}

/**
 * Extracts the error entries from a `{ detail: [...] }` body (or `{ detail: "text" }`).
 *
 * @param body - JSON body of the error response
 * @returns the recognized entries
 */
export function parseErrorBody(body: unknown): IPachiApiErrorItem[] {
  if (body === null || typeof body !== 'object') return []
  const detail = (body as { detail?: unknown }).detail
  if (typeof detail === 'string') return [{ msg: detail }]
  if (!Array.isArray(detail)) return []
  const items: IPachiApiErrorItem[] = []
  for (const raw of detail) {
    if (raw === null || typeof raw !== 'object') continue
    const rec = raw as Record<string, unknown>
    const item: IPachiApiErrorItem = {}
    if (typeof rec.code === 'string') item.code = rec.code
    if (typeof rec.msg === 'string') item.msg = rec.msg
    if (rec.params !== null && typeof rec.params === 'object') item.params = rec.params as Record<string, unknown>
    if (Array.isArray(rec.loc)) item.loc = rec.loc as Array<string | number>
    items.push(item)
  }
  return items
}

/**
 * Normalizes an error thrown by the HTTP client: `ResponseError` of `@ilpachi/use-alova` (reads the body with
 * `safeResponseJson`), error with numeric `status` and `body`, or any other (status 0).
 *
 * @param err - value thrown by the request
 * @returns normalized error (never throws)
 */
export async function parseApiError(err: unknown): Promise<IPachiApiError> {
  if (err === null || typeof err !== 'object') return { status: 0, items: [] }
  const rec = err as { status?: unknown, body?: unknown, safeResponseJson?: () => Promise<unknown> }
  const status = typeof rec.status === 'number' ? rec.status : 0
  let body: unknown = rec.body ?? null
  if (typeof rec.safeResponseJson === 'function') {
    try {
      body = await rec.safeResponseJson()
    } catch {
      body = null
    }
  }
  return { status, items: parseErrorBody(body) }
}

/**
 * Family of an error: 422 validation, 409 conflict, 403 forbidden, 404 notFound, 401 unauthorized, 0 network.
 *
 * @param status - HTTP code
 */
export function errorKind(status: number): AdminErrorKind {
  switch (status) {
    case 422:
    case 400:
      return 'validation'
    case 409:
      return 'conflict'
    case 403:
      return 'forbidden'
    case 404:
      return 'notFound'
    case 401:
      return 'unauthorized'
    case 0:
      return 'network'
    default:
      return 'other'
  }
}

/**
 * Package message key for a code (`admin.object_not_found` → `pachiAdmin.errors.codes.admin_object_not_found`).
 *
 * @param code - backend code
 */
export function packageCodeKey(code: string): string {
  return `pachiAdmin.errors.codes.${code.replace(/[^A-Za-z0-9_]/g, '_')}`
}

/**
 * `snake_case` → `camelCase` (backend errors may cite the Python name of the field).
 *
 * @param name - field name
 */
export function camelize(name: string): string {
  return name.replace(/(?<!_)_([a-z0-9])/g, (_m, c: string) => c.toUpperCase())
}

/**
 * Parameters ready for interpolation: arrays become comma-separated text.
 *
 * @param params - backend parameters
 */
export function interpolationParams(params: Record<string, unknown> | undefined): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(params ?? {})) {
    out[key] = Array.isArray(value) ? value.join(', ') : value
  }
  return out
}

/**
 * Message of an entry. Order: app translation `errors.codes.<code>`, package translation, backend `msg`.
 *
 * @param item - error entry
 * @param tr - translation functions
 * @returns the text, or `undefined` if the entry has neither a known code nor `msg`
 */
export function itemMessage(item: IPachiApiErrorItem, tr: IPachiErrorTranslator): string | undefined {
  const params = interpolationParams(item.params)
  if (item.code) {
    const appKey = `errors.codes.${item.code}`
    if (tr.te(appKey)) return tr.t(appKey, params)
    const pkgKey = packageCodeKey(item.code)
    if (tr.te(pkgKey)) return tr.t(pkgKey, params)
  }
  return item.msg
}

/**
 * Field an entry refers to (`loc` = `["body", "<field>"]` or `["query", "<param>"]`; the parameter of a
 * range filter is `<field>__gte` / `<field>__lte`).
 *
 * @param item - error entry
 * @returns camelCase field name, or `undefined`
 */
export function itemField(item: IPachiApiErrorItem): string | undefined {
  const loc = item.loc
  if (!loc || loc.length < 2 || (loc[0] !== 'body' && loc[0] !== 'query')) return undefined
  const name = loc[1]
  return typeof name === 'string' ? camelize(name) : undefined
}

/**
 * Describes an error for the UI: family, general message and per-field messages (422).
 * 409 `admin.integrity_error`, 403 `access.permissions_missing`, 404 `admin.*_not_found` have package texts.
 *
 * @param error - normalized error
 * @param tr - translation functions
 * @returns description (never throws)
 */
export function describeError(error: IPachiApiError, tr: IPachiErrorTranslator): IAdminErrorDescription {
  const kind = errorKind(error.status)
  const fields: Record<string, string> = {}
  const general: string[] = []
  for (const item of error.items) {
    const message = itemMessage(item, tr)
    const field = kind === 'validation' ? itemField(item) : undefined
    // `orderBy` and `ids` are not form fields: they stay general messages
    const isParam = item.loc?.[1] === 'orderBy' || item.loc?.[1] === 'ids'
    if (field && message && !isParam) {
      fields[field] ??= message
    } else if (message) {
      general.push(message)
    }
  }
  let message = general[0]
  if (!message && Object.keys(fields).length) message = tr.t('pachiAdmin.errors.validation')
  if (!message) message = tr.t(`pachiAdmin.errors.${kind}`)
  return { kind, status: error.status, message, fields }
}
