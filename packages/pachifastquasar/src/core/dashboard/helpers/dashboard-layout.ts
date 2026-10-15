/** Columns value allowed by configuration and `route.meta`: number of columns or a full `grid-template-columns`. */
export type PachiDashboardColumns = number | string

/**
 * Converts the dashboard columns into a CSS `grid-template-columns` value.
 * An integer (also as a string, e.g. `'3'`) becomes `repeat(n, 1fr)`; any other string
 * (e.g. `'repeat(auto-fill, minmax(220px, 1fr))'`) is used as is.
 *
 * @param value - number of columns or CSS value
 * @returns the CSS value, or `undefined` if absent or invalid (number < 1)
 */
export function resolveDashboardColumns(value: unknown): string | undefined {
  if (typeof value === 'number') {
    return Number.isInteger(value) && value >= 1 ? `repeat(${value}, 1fr)` : undefined
  }
  if (typeof value !== 'string') return undefined
  const text = value.trim()
  if (text === '') return undefined
  if (/^\d+$/.test(text)) return resolveDashboardColumns(Number(text))
  return text
}

/**
 * Maximum dashboard width as a CSS value.
 *
 * @param value - CSS length (e.g. `'1400px'`, `'90%'`, `'none'`) or number of pixels
 * @returns the CSS value, or `undefined` if absent or empty
 */
export function resolveDashboardMaxWidth(value: unknown): string | undefined {
  if (typeof value === 'number') return Number.isFinite(value) && value > 0 ? `${value}px` : undefined
  if (typeof value !== 'string') return undefined
  const text = value.trim()
  return text === '' ? undefined : /^\d+(\.\d+)?$/.test(text) ? `${text}px` : text
}
