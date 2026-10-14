import type { PachiLocaleMessages } from '../types'

/**
 * Verifica che un valore sia un oggetto semplice (non array, non null).
 *
 * @param value - valore da controllare
 */
function isPlainObject(value: unknown): value is PachiLocaleMessages {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Merge profondo di due alberi di messaggi (non muta gli argomenti). In caso di conflitto vince `override`.
 *
 * @param base - messaggi di partenza
 * @param override - messaggi che prevalgono
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
 * Restituisce solo le chiavi di `incoming` che NON sono già presenti in `existing`
 * (così i messaggi dell'app hanno sempre la precedenza su quelli dei package).
 *
 * @param incoming - messaggi da aggiungere
 * @param existing - messaggi già presenti
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
