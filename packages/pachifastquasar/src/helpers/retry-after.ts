/**
 * Parses the value of the HTTP `Retry-After` header: integer seconds (`120`) or an HTTP date
 * (`Wed, 21 Oct 2026 07:28:00 GMT`).
 *
 * @param value - raw header value
 * @param now - reference instant in milliseconds (default `Date.now()`), used for dates
 * @returns the wait seconds (rounded up, never negative) or `null` if the value is missing or not valid
 */
export function parseRetryAfter(value: unknown, now: number = Date.now()): number | null {
  if (typeof value !== 'string') return null
  const text = value.trim()
  if (!text) return null
  if (/^\d+$/.test(text)) {
    const seconds = Number(text)
    return Number.isSafeInteger(seconds) ? seconds : null
  }
  // HTTP date: must contain letters (e.g. the day/month), so "-5" or "1.5" are not read as dates
  if (!/[a-z]/i.test(text)) return null
  const at = Date.parse(text)
  if (Number.isNaN(at)) return null
  return Math.max(0, Math.ceil((at - now) / 1000))
}

/**
 * Reads `Retry-After` from an HTTP client error (`ResponseError.response.headers`).
 *
 * @param error - request error (or other)
 * @param now - reference instant in milliseconds (default `Date.now()`)
 * @returns the wait seconds or `null` if the header is missing or not valid
 */
export function retryAfterFromError(error: unknown, now: number = Date.now()): number | null {
  const headers = (error as { response?: { headers?: { get?: (name: string) => unknown } } } | null)
    ?.response?.headers
  if (typeof headers?.get !== 'function') return null
  return parseRetryAfter(headers.get('Retry-After'), now)
}

/**
 * Formats seconds as `mm:ss` (minutes can exceed 59).
 *
 * @param seconds - seconds (negative or non-finite values become 0)
 * @returns the `mm:ss` string
 */
export function formatCountdown(seconds: number): string {
  const total = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0
  const mm = String(Math.floor(total / 60)).padStart(2, '0')
  const ss = String(total % 60).padStart(2, '0')
  return `${mm}:${ss}`
}
