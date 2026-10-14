import { toRaw, unref } from 'vue'

/**
 * Clone profondo di un valore, anche se contiene Proxy reattivi annidati
 * (`structuredClone` lancia `DataCloneError` sui Proxy): ogni livello passa da `toRaw`.
 * Supporta array, oggetti semplici, `Date`; gli altri oggetti sono delegati a `structuredClone`.
 * @param value valore (o ref) da clonare
 * @returns copia indipendente e non reattiva
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
