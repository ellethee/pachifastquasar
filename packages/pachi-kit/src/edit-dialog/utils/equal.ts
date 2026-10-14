/**
 * Confronto strutturale tra due valori (usato per il dirty-check delle sezioni): indipendente
 * dall'ordine delle chiavi; una proprieta' `undefined` equivale a una proprieta' mancante;
 * `Date` confrontate per istante; primitivi con `Object.is` (quindi `NaN` e' uguale a `NaN`).
 * @param a primo valore
 * @param b secondo valore
 */
export function isEqualValue(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false
  if (a instanceof Date || b instanceof Date) {
    return a instanceof Date && b instanceof Date && a.getTime() === b.getTime()
  }
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false
    return a.every((item, i) => isEqualValue(item, b[i]))
  }
  const ra = a as Record<string, unknown>
  const rb = b as Record<string, unknown>
  const keys = new Set([...Object.keys(ra), ...Object.keys(rb)])
  for (const key of keys) {
    if (!isEqualValue(ra[key], rb[key])) return false
  }
  return true
}
