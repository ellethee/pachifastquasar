/** Funzioni di estensione di Quasar: se presenti in entrambi i lati si eseguono in sequenza (base, poi override). */
const COMPOSED_FUNCTIONS = new Set(['extendViteConf', 'extendTsConfig'])

/** Oggetto semplice (non array): unico caso in cui si fa merge ricorsivo. */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) return false
  const proto = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}

/**
 * Unisce la configurazione di base con gli override dell'app: oggetti in merge ricorsivo, array
 * concatenati (senza duplicati), `extendViteConf`/`extendTsConfig` eseguite in sequenza, qualsiasi altro
 * valore sostituito dall'override.
 *
 * @param base - configurazione del preset
 * @param override - configurazione dell'app
 * @returns nuova configurazione (gli argomenti non sono modificati)
 */
export function mergeQuasarConfig<T extends Record<string, unknown>>(
  base: T,
  override: Record<string, unknown>
): T {
  const out: Record<string, unknown> = { ...base }
  for (const [key, value] of Object.entries(override)) {
    if (value === undefined) continue
    const current = out[key]
    if (Array.isArray(current) && Array.isArray(value)) {
      out[key] = [...new Set([...current, ...value])]
    } else if (isPlainObject(current) && isPlainObject(value)) {
      out[key] = mergeQuasarConfig(current, value)
    } else if (
      COMPOSED_FUNCTIONS.has(key) &&
      typeof current === 'function' &&
      typeof value === 'function'
    ) {
      out[key] = (...args: unknown[]) => {
        ;(current as (...a: unknown[]) => void)(...args)
        ;(value as (...a: unknown[]) => void)(...args)
      }
    } else {
      out[key] = value
    }
  }
  return out as T
}
