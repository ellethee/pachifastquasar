/**
 * Converts the value emitted by `q-input` based on its `type`: with `type: 'number'` it returns
 * a `number` (or `null` if empty/non-numeric), for other types the value is left unchanged.
 *
 * @param type - input type (`'text'` if absent)
 * @param value - raw value emitted by `q-input`
 * @returns the value consistent with the type
 */
export function coerceInputValue(type: string | undefined, value: string | number | null): string | number | null {
  if (type !== 'number') return value
  if (value === '' || value === null) return null
  const parsed = Number(value)
  return Number.isNaN(parsed) ? null : parsed
}
