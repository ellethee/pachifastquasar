/**
 * Formatta una data come `YYYY-MM-DD` usando i valori locali (non UTC):
 * `toISOString()` a mezzanotte locale darebbe il giorno prima nei fusi a est di UTC.
 * @param date data da formattare
 * @returns stringa `YYYY-MM-DD`
 */
export function formatLocalDate(date: Date): string {
  const y = String(date.getFullYear()).padStart(4, '0')
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
