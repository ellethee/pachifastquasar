/** Segmenti vietati: evitano la prototype pollution. */
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

/**
 * Legge un valore annidato da un percorso con punti (`a.b.c`).
 *
 * @param obj - oggetto di partenza
 * @param path - percorso separato da punti
 * @returns valore trovato o `undefined`
 */
export function getByPath(obj: unknown, path: string): unknown {
  return path.split('.').reduce((o: unknown, k) => {
    if (o == null || FORBIDDEN_KEYS.has(k)) return undefined
    return (o as Record<string, unknown>)[k]
  }, obj)
}

/**
 * Scrive un valore annidato in un percorso con punti, creando gli oggetti intermedi.
 * Ignora (senza scrivere) i percorsi che contengono `__proto__`, `constructor` o `prototype`.
 *
 * @param obj - oggetto da modificare
 * @param path - percorso separato da punti
 * @param value - valore da scrivere
 * @returns `true` se il valore è stato scritto
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
