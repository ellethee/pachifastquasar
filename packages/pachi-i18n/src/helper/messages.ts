import type { PachiLocaleMessages } from '../types'

/**
 * Checks that a value is a plain object (not an array, not null).
 *
 * @param value - value to check
 */
function isPlainObject(value: unknown): value is PachiLocaleMessages {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Deep merge of two message trees (does not mutate the arguments). On conflict `override` wins.
 *
 * @param base - starting messages
 * @param override - messages that take precedence
 */
export function deepMerge(base: PachiLocaleMessages, override: PachiLocaleMessages): PachiLocaleMessages {
  const result: PachiLocaleMessages = { ...base }
  for (const [key, value] of Object.entries(override)) {
    const current = result[key]
    result[key] = isPlainObject(current) && isPlainObject(value) ? deepMerge(current, value) : value
  }
  return result
}

/**
 * Returns only the keys of `incoming` that are NOT already present in `existing`
 * (so the app messages always take precedence over the packages' ones).
 *
 * @param incoming - messages to add
 * @param existing - messages already present
 */
export function omitExisting(incoming: PachiLocaleMessages, existing: PachiLocaleMessages): PachiLocaleMessages {
  const result: PachiLocaleMessages = {}
  for (const [key, value] of Object.entries(incoming)) {
    const current = existing[key]
    if (current === undefined) {
      result[key] = value
    } else if (isPlainObject(current) && isPlainObject(value)) {
      const nested = omitExisting(value, current)
      if (Object.keys(nested).length > 0) result[key] = nested
    }
  }
  return result
}
