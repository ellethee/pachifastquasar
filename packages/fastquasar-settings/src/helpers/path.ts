/** Forbidden segments: they prevent prototype pollution. */
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

/**
 * Reads a nested value from a dotted path (`a.b.c`).
 *
 * @param obj - starting object
 * @param path - dot-separated path
 * @returns the value found, or `undefined`
 */
export function getByPath(obj: unknown, path: string): unknown {
  return path.split('.').reduce((o: unknown, k) => {
    if (o == null || FORBIDDEN_KEYS.has(k)) return undefined
    return (o as Record<string, unknown>)[k]
  }, obj)
}

/**
 * Writes a nested value into a dotted path, creating the intermediate objects.
 * Ignores (without writing) paths containing `__proto__`, `constructor` or `prototype`.
 *
 * @param obj - object to modify
 * @param path - dot-separated path
 * @param value - value to write
 * @returns `true` if the value was written
 */
export function setByPath(obj: unknown, path: string, value: unknown): boolean {
  const parts = path.split('.')
  if (parts.some((k) => FORBIDDEN_KEYS.has(k))) return false
  let cur = obj as Record<string, unknown>
  for (let i = 0; i < parts.length - 1; i++) {
    const k = parts[i] as string
    if (cur[k] == null || typeof cur[k] !== 'object') cur[k] = {}
    cur = cur[k] as Record<string, unknown>
  }
  cur[parts[parts.length - 1] as string] = value
  return true
}
