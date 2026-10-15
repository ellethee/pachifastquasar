import { toRaw, unref } from 'vue'

/**
 * Deep clone of a value, even if it contains nested reactive Proxies
 * (`structuredClone` throws `DataCloneError` on Proxies): every level goes through `toRaw`.
 * Supports arrays, plain objects, `Date`; other objects are delegated to `structuredClone`.
 * @param value value (or ref) to clone
 * @returns independent, non-reactive copy
 */
export function cloneValue<T>(value: T): T {
  const raw = toRaw(unref(value)) as unknown
  if (raw === null || typeof raw !== 'object') return raw as T
  if (Array.isArray(raw)) return raw.map(item => cloneValue(item)) as T
  if (raw instanceof Date) return new Date(raw.getTime()) as T
  const proto = Object.getPrototypeOf(raw)
  if (proto === Object.prototype || proto === null) {
    const out: Record<string, unknown> = {}
    for (const [key, item] of Object.entries(raw)) out[key] = cloneValue(item)
    return out as T
  }
  return structuredClone(raw) as T
}
