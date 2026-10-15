import { parseRetryAfter } from './retry-after'

/** Single backend error (`detail[]`). */
export interface IPachiApiErrorItem {
  /** Stable code (e.g. `auth.password_too_short`), if present. */
  code?: string
  /** Backend message (server language). */
  msg?: string
  /** Interpolation parameters (e.g. `{ min_length: 12 }`). */
  params?: Record<string, unknown>
  /** Error location (e.g. `['body', 'password']`). */
  loc?: Array<string | number>
}

/** Normalized HTTP error. */
export interface IPachiApiError {
  /** HTTP status code (0 for network errors / unknown). */
  status: number
  /** `detail` entries (empty if the body is not in the expected format). */
  items: IPachiApiErrorItem[]
  /** Seconds to wait from the `Retry-After` header (only if present and valid, typically on 429). */
  retryAfter?: number
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
 * Reads `Retry-After` from a client error: `response.headers` (`ResponseError` of `@ilpachi/use-alova`,
 * which keeps the `Response`) or `headers` (error with direct headers). Headers instance or plain object,
 * case-insensitive names.
 *
 * @param err - value thrown by the request
 * @returns seconds to wait, or `undefined` if the header is missing, invalid or unreadable
 */
export function readRetryAfter(err: object): number | undefined {
  const rec = err as { response?: { headers?: unknown }, headers?: unknown }
  const headers = rec.response?.headers ?? rec.headers
  if (headers === null || typeof headers !== 'object') return undefined
  let raw: unknown
  const getter = (headers as { get?: unknown }).get
  if (typeof getter === 'function') {
    try {
      raw = getter.call(headers, 'Retry-After')
    } catch {
      raw = undefined
    }
  } else {
    const key = Object.keys(headers).find((k) => k.toLowerCase() === 'retry-after')
    raw = key ? (headers as Record<string, unknown>)[key] : undefined
  }
  return parseRetryAfter(raw) ?? undefined
}

/**
 * Normalizes an error thrown by the HTTP client: `ResponseError` of `@ilpachi/use-alova` (reads the body with
 * `safeResponseJson`), error with numeric `status` and `body`, or anything else (status 0).
 *
 * @param err - value thrown by the request
 * @returns normalized error (never throws)
 */
export async function parseApiError(err: unknown): Promise<IPachiApiError> {
  if (err === null || typeof err !== 'object') return { status: 0, items: [] }
  const rec = err as {
    status?: unknown
    body?: unknown
    safeResponseJson?: () => Promise<unknown>
  }
  const status = typeof rec.status === 'number' ? rec.status : 0
  let body: unknown = rec.body ?? null
  if (typeof rec.safeResponseJson === 'function') {
    try {
      body = await rec.safeResponseJson()
    } catch {
      body = null
    }
  }
  const retryAfter = readRetryAfter(err)
  return retryAfter === undefined ? { status, items: parseErrorBody(body) } : { status, items: parseErrorBody(body), retryAfter }
}

/**
 * First error with a `code`, if any.
 *
 * @param error - normalized error
 * @returns the entry with a code, otherwise the first entry, otherwise `undefined`
 */
export function primaryItem(error: IPachiApiError): IPachiApiErrorItem | undefined {
  return error.items.find((i) => i.code) ?? error.items[0]
}

/** Translation functions needed by {@link resolveErrorMessage}. */
export interface IPachiErrorTranslator {
  /** `true` if the key exists (at least in one useful language). */
  te: (key: string) => boolean
  /** Translates the key with the parameters. */
  t: (key: string, params?: Record<string, unknown>) => string
}

/**
 * Package message key for a code (`auth.password_incorrect` → `pachiProfile.security.codes.auth_password_incorrect`).
 *
 * @param code - backend code
 * @returns package i18n key
 */
export function packageCodeKey(code: string): string {
  return `pachiProfile.security.codes.${code.replace(/[^A-Za-z0-9_]/g, '_')}`
}

/**
 * Message to show for an error. Order: app translation `errors.codes.<code>`, package translation for the
 * same code, backend `msg`, per-status message (429 "too many attempts"), generic.
 *
 * @param error - normalized error
 * @param tr - translation functions
 * @returns text for the user
 */
export function resolveErrorMessage(error: IPachiApiError, tr: IPachiErrorTranslator): string {
  const item = primaryItem(error)
  const params = item?.params ?? {}
  if (item?.code) {
    const appKey = `errors.codes.${item.code}`
    if (tr.te(appKey)) return tr.t(appKey, params)
    const pkgKey = packageCodeKey(item.code)
    if (tr.te(pkgKey)) return tr.t(pkgKey, params)
  }
  if (item?.msg) return item.msg
  if (error.status === 429) return tr.t('pachiProfile.security.tooManyRequests')
  if (error.status === 0) return tr.t('pachiProfile.security.networkError')
  return tr.t('pachiProfile.security.genericError')
}
