import type { IPachiApiError } from './api-error'
import { primaryItem } from './api-error'

/**
 * Minimum pause, in seconds, between two email/SMS code sends (pachifast backend 0.15.0). It also serves as the
 * fallback wait when the `429` carries no readable `Retry-After` (the client exposes it only if `ResponseError` keeps
 * the `Response` and the server includes it in `Access-Control-Expose-Headers`).
 */
export const SEND_COOLDOWN_SECONDS = 30

/**
 * `true` if the error is the send-frequency limit (`429 auth.rate_limited`, or `429` without a code).
 * The lock for too many attempts (`mfa.too_many_attempts`) does not count: it is handled differently.
 *
 * @param error - normalized error
 */
export function isSendRateLimited(error: IPachiApiError): boolean {
  if (error.status !== 429) return false
  const code = primaryItem(error)?.code
  return !code || code === 'auth.rate_limited'
}

/**
 * Seconds to wait before a code can be resent after a `429`: `Retry-After` if valid, otherwise
 * {@link SEND_COOLDOWN_SECONDS}.
 *
 * @param error - normalized error
 * @returns seconds (integer > 0)
 */
export function sendCooldownSeconds(error: IPachiApiError): number {
  const wait = error.retryAfter
  return wait !== undefined && wait > 0 ? wait : SEND_COOLDOWN_SECONDS
}
