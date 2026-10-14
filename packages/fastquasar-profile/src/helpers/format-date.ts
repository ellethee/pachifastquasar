/** Opzioni di formattazione di {@link formatProfileDate}. */
export interface IFormatProfileDateOptions {
  /** Include anche l'ora (`timeStyle: 'short'`); default `false` (solo data). */
  withTime?: boolean
}

/**
 * Formatta una data ISO 8601 in modo locale-aware (`dateStyle: 'medium'`, opzionalmente `timeStyle: 'short'`).
 * Funzione pura: non lancia mai eccezioni.
 *
 * @param value - data ISO 8601 (es. `2026-10-05T14:02:23.430541Z`), `null` o `undefined`
 * @param locale - codice lingua BCP 47 (default `it`; un codice non valido ricade su `it`)
 * @param options - opzioni di formattazione
 * @returns la data formattata, o `null` se il valore è assente o non è una data valida
 */
export function formatProfileDate(
  value: string | null | undefined,
  locale = 'it',
  options: IFormatProfileDateOptions = {},
): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  const format = (loc: string): string =>
    new Intl.DateTimeFormat(loc, {
      dateStyle: 'medium',
      ...(options.withTime ? { timeStyle: 'short' as const } : {}),
    }).format(date)
  try {
    return format(locale || 'it')
  } catch {
    try {
      return format('it')
    } catch {
      return null
    }
  }
}

/**
 * Sceglie il testo da mostrare: la prop esplicita ha la precedenza, poi la data dell'utente formattata.
 *
 * @param explicit - testo passato esplicitamente (prop)
 * @param iso - data ISO dell'utente
 * @param locale - lingua corrente
 * @param options - opzioni di formattazione
 * @returns il testo, o `null` se non disponibile (il chiamante mostra "—")
 */
export function resolveProfileDate(
  explicit: string | undefined,
  iso: string | null | undefined,
  locale: string,
  options: IFormatProfileDateOptions = {},
): string | null {
  return explicit ?? formatProfileDate(iso, locale, options)
}
