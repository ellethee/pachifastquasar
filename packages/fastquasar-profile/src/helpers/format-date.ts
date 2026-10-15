/** Formatting options for {@link formatProfileDate}. */
export interface IFormatProfileDateOptions {
  /** Also include the time (`timeStyle: 'short'`); default `false` (date only). */
  withTime?: boolean
}

/**
 * Formats an ISO 8601 date in a locale-aware way (`dateStyle: 'medium'`, optionally `timeStyle: 'short'`).
 * Pure function: never throws.
 *
 * @param value - ISO 8601 date (e.g. `2026-10-05T14:02:23.430541Z`), `null` or `undefined`
 * @param locale - BCP 47 language code (default `it`; an invalid code falls back to `it`)
 * @param options - formatting options
 * @returns the formatted date, or `null` if the value is missing or not a valid date
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
 * Picks the text to show: the explicit prop takes precedence, then the formatted user date.
 *
 * @param explicit - explicitly passed text (prop)
 * @param iso - user ISO date
 * @param locale - current language
 * @param options - formatting options
 * @returns the text, or `null` if unavailable (the caller shows "—")
 */
export function resolveProfileDate(
  explicit: string | undefined,
  iso: string | null | undefined,
  locale: string,
  options: IFormatProfileDateOptions = {},
): string | null {
  return explicit ?? formatProfileDate(iso, locale, options)
}
