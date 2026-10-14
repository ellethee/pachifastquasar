/** Attesa massima accettata da `Retry-After` (un giorno): valori oltre sono considerati non validi. */
export const MAX_RETRY_AFTER_SECONDS = 86400

/**
 * Interpreta l'header `Retry-After`: secondi interi (`"120"`) oppure data HTTP (`"Wed, 21 Oct 2026 07:28:00 GMT"`).
 * I valori assenti, vuoti, negativi, decimali, non numerici, con data non valida o oltre un giorno sono ignorati.
 * Una data già passata vale 0 secondi.
 *
 * @param value - valore dell'header (stringa, numero già letto, `null`/`undefined`)
 * @param now - istante di riferimento in ms (default `Date.now()`), usato per le date HTTP
 * @returns secondi di attesa (intero >= 0) oppure `null` se il valore non è utilizzabile
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
 * Secondi che mancano a una scadenza, arrotondati per eccesso (mai negativi).
 *
 * @param deadline - scadenza in ms (epoch)
 * @param now - istante corrente in ms (default `Date.now()`)
 * @returns secondi residui (>= 0)
 */
export function remainingSeconds(deadline: number, now: number = Date.now()): number {
  return Math.max(0, Math.ceil((deadline - now) / 1000))
}

/**
 * Formatta i secondi come `mm:ss` (i minuti possono superare 59, es. `75:00`).
 *
 * @param seconds - secondi (valori negativi o non finiti valgono 0)
 * @returns testo `mm:ss`
 */
export function formatCountdown(seconds: number): string {
  const total = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0
  const mm = String(Math.floor(total / 60)).padStart(2, '0')
  const ss = String(total % 60).padStart(2, '0')
  return `${mm}:${ss}`
}
