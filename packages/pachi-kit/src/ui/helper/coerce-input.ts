/**
 * Converte il valore emesso da `q-input` in base al suo `type`: con `type: 'number'` restituisce
 * un `number` (o `null` se vuoto/non numerico), per gli altri tipi il valore resta invariato.
 *
 * @param type - tipo dell'input (`'text'` se assente)
 * @param value - valore grezzo emesso da `q-input`
 * @returns il valore coerente col tipo
 */
export function coerceInputValue(type: string | undefined, value: string | number | null): string | number | null {
  if (type !== 'number') return value
  if (value === '' || value === null) return null
  const parsed = Number(value)
  return Number.isNaN(parsed) ? null : parsed
}
