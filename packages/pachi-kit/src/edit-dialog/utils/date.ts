/**
 * Formats a date as `YYYY-MM-DD` using local values (not UTC):
 * `toISOString()` at local midnight would give the previous day in time zones east of UTC.
 * @param date date to format
 * @returns `YYYY-MM-DD` string
 */
export function formatLocalDate(date: Date): string {
  const y = String(date.getFullYear()).padStart(4, '0')
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
