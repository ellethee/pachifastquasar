/** Quasar extension functions: if present on both sides they run in sequence (base, then override). */
const COMPOSED_FUNCTIONS = new Set(['extendViteConf', 'extendTsConfig'])

/** Plain object (not an array): the only case where a recursive merge is done. */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) return false
  const proto = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}

/**
 * Merges the base configuration with the app overrides: objects merged recursively, arrays
 * concatenated (without duplicates), `extendViteConf`/`extendTsConfig` run in sequence, any other
 * value replaced by the override.
 *
 * @param base - preset configuration
 * @param override - app configuration
 * @returns new configuration (the arguments are not modified)
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
