/**
 * Interpreta il valore dell'header HTTP `Retry-After`: secondi interi (`120`) oppure una data HTTP
 * (`Wed, 21 Oct 2026 07:28:00 GMT`).
 *
 * @param value - valore grezzo dell'header
 * @param now - istante di riferimento in millisecondi (default `Date.now()`), usato per le date
 * @returns i secondi di attesa (arrotondati per eccesso, mai negativi) oppure `null` se il valore manca o non è valido
 */
export function parseRetryAfter(value: unknown, now: number = Date.now()): number | null {
  if (typeof value !== 'string') return null
  const text = value.trim()
  if (!text) return null
  if (/^\d+$/.test(text)) {
    const seconds = Number(text)
    return Number.isSafeInteger(seconds) ? seconds : null
  }
  // data HTTP: deve contenere lettere (es. il giorno/mese), così "-5" o "1.5" non vengono letti come date
  if (!/[a-z]/i.test(text)) return null
  const at = Date.parse(text)
  if (Number.isNaN(at)) return null
  return Math.max(0, Math.ceil((at - now) / 1000))
}

/**
 * Legge `Retry-After` da un errore del client HTTP (`ResponseError.response.headers`).
 *
 * @param error - errore della richiesta (o altro)
 * @param now - istante di riferimento in millisecondi (default `Date.now()`)
 * @returns i secondi di attesa oppure `null` se l'header manca o non è valido
 */
export function retryAfterFromError(error: unknown, now: number = Date.now()): number | null {
  const headers = (error as { response?: { headers?: { get?: (name: string) => unknown } } } | null)
    ?.response?.headers
  if (typeof headers?.get !== 'function') return null
  return parseRetryAfter(headers.get('Retry-After'), now)
}

/**
 * Formatta i secondi come `mm:ss` (i minuti possono superare 59).
 *
 * @param seconds - secondi (i valori negativi o non finiti diventano 0)
 * @returns la stringa `mm:ss`
 */
export function formatCountdown(seconds: number): string {
  const total = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0
  const mm = String(Math.floor(total / 60)).padStart(2, '0')
  const ss = String(total % 60).padStart(2, '0')
  return `${mm}:${ss}`
}
