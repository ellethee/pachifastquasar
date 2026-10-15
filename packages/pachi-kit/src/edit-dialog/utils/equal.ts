/**
 * Structural comparison of two values (used for the sections' dirty-check): independent
 * of key order; an `undefined` property is equivalent to a missing property;
 * `Date` compared by instant; primitives with `Object.is` (so `NaN` equals `NaN`).
 * @param a first value
 * @param b second value
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
