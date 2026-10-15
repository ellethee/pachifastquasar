import { getPachiI18n } from './i18n-instance'

/**
 * Translation outside `setup()` (stores, helpers, Dialog/Notify) using the global composer.
 * If the i18n has not been created yet it returns the key.
 *
 * @param key - message key (e.g. `common.save`)
 * @param params - named message parameters (`{name}`)
 */
export function pachiT(key: string, params?: Record<string, unknown>): string {
  const instance = getPachiI18n()
  if (!instance) return key
  return params ? instance.global.t(key, params) : instance.global.t(key)
}
