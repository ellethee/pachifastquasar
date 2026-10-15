/** Maximum wait accepted from `Retry-After` (one day): larger values are considered invalid. */
export const MAX_RETRY_AFTER_SECONDS = 86400

/**
 * Parses the `Retry-After` header: whole seconds (`"120"`) or an HTTP date (`"Wed, 21 Oct 2026 07:28:00 GMT"`).
 * Missing, empty, negative, decimal, non-numeric values, invalid dates or values over one day are ignored.
 * A date already in the past counts as 0 seconds.
 *
 * @param value - header value (string, already-read number, `null`/`undefined`)
 * @param now - reference instant in ms (default `Date.now()`), used for HTTP dates
 * @returns seconds to wait (integer >= 0) or `null` if the value is unusable
 */
export function parseRetryAfter(value: unknown, now: number = Date.now()): number | null {
  let seconds: number | null = null
  if (typeof value === 'number') {
    seconds = Number.isInteger(value) ? value : null
  } else if (typeof value === 'string') {
    const text = value.trim()
    if (!text) return null
    if (/^\d+$/.test(text)) {
      seconds = Number(text)
    } else if (/^[A-Za-z]{3,9},/.test(text)) {
      const at = Date.parse(text)
      if (!Number.isNaN(at)) seconds = Math.max(0, Math.ceil((at - now) / 1000))
    }
  }
  if (seconds === null || !Number.isFinite(seconds) || seconds < 0 || seconds > MAX_RETRY_AFTER_SECONDS) return null
  return seconds
}

/**
 * Seconds left until a deadline, rounded up (never negative).
 *
 * @param deadline - deadline in ms (epoch)
 * @param now - current instant in ms (default `Date.now()`)
 * @returns remaining seconds (>= 0)
 */
export function remainingSeconds(deadline: number, now: number = Date.now()): number {
  return Math.max(0, Math.ceil((deadline - now) / 1000))
}

/**
 * Formats seconds as `mm:ss` (minutes may exceed 59, e.g. `75:00`).
 *
 * @param seconds - seconds (negative or non-finite values count as 0)
 * @returns `mm:ss` text
 */
export function formatCountdown(seconds: number): string {
  const total = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0
  const mm = String(Math.floor(total / 60)).padStart(2, '0')
  const ss = String(total % 60).padStart(2, '0')
  return `${mm}:${ss}`
}
