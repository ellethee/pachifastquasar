import type { IPachiApiError } from './api-error'
import { primaryItem } from './api-error'

/**
 * Pausa minima, in secondi, tra due invii di codice email/SMS (backend pachifast 0.15.0). Vale anche come attesa di
 * ripiego quando il `429` non porta un `Retry-After` leggibile (il client lo espone solo se `ResponseError` conserva
 * la `Response` e il server lo include in `Access-Control-Expose-Headers`).
 */
export const SEND_COOLDOWN_SECONDS = 30

/**
 * `true` se l'errore è il limite sulla frequenza degli invii (`429 auth.rate_limited`, oppure `429` senza codice).
 * Il blocco per troppi tentativi (`mfa.too_many_attempts`) non conta: ha un'altra gestione.
 *
 * @param error - errore normalizzato
 */
export function isSendRateLimited(error: IPachiApiError): boolean {
  if (error.status !== 429) return false
  const code = primaryItem(error)?.code
  return !code || code === 'auth.rate_limited'
}

/**
 * Secondi di attesa prima di poter reinviare un codice dopo un `429`: `Retry-After` se valido, altrimenti
 * {@link SEND_COOLDOWN_SECONDS}.
 *
 * @param error - errore normalizzato
 * @returns secondi (intero > 0)
 */
export function sendCooldownSeconds(error: IPachiApiError): number {
  const wait = error.retryAfter
  return wait !== undefined && wait > 0 ? wait : SEND_COOLDOWN_SECONDS
}
