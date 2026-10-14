import { getPachiI18n } from './i18n-instance'

/**
 * Traduzione fuori da `setup()` (store, helper, Dialog/Notify) con il composer globale.
 * Se l'i18n non è ancora stato creato restituisce la chiave.
 *
 * @param key - chiave del messaggio (es. `common.save`)
 * @param params - parametri con nome del messaggio (`{name}`)
 */
export function pachiT(key: string, params?: Record<string, unknown>): string {
  const instance = getPachiI18n()
  if (!instance) return key
  return params ? instance.global.t(key, params) : instance.global.t(key)
}
