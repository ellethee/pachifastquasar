import { inject, provide } from 'vue'
import type { InjectionKey } from 'vue'
import { getPachiI18n } from '@ilpachi/pachi-i18n'
import { createAdminApi } from './api'
import type { IAdminApi } from './api'
import { describeError, parseApiError } from './api-error'
import type { IAdminErrorDescription, IPachiErrorTranslator } from './api-error'
import { resolveHttp } from './http'
import { getPachiAdminOptions } from './options'

/** Chiave con cui la pagina fornisce il client API ai componenti figli. */
export const ADMIN_API_KEY: InjectionKey<IAdminApi> = Symbol('pachiAdminApi')

/**
 * Client delle API Admin per i componenti: quello fornito dalla pagina antenata, altrimenti uno nuovo costruito
 * con il client HTTP risolto (da chiamare dentro `setup()`).
 *
 * @returns il client API
 */
export function useAdminApi(): IAdminApi {
  const injected = inject(ADMIN_API_KEY, null)
  if (injected) return injected
  const { getHttp, basePath } = getPachiAdminOptions()
  return createAdminApi(resolveHttp(basePath, getHttp))
}

/**
 * Crea il client API e lo fornisce ai discendenti (da chiamare nella pagina radice, dentro `setup()`).
 *
 * @returns il client API
 */
export function provideAdminApi(): IAdminApi {
  const { getHttp, basePath } = getPachiAdminOptions()
  const api = createAdminApi(resolveHttp(basePath, getHttp))
  provide(ADMIN_API_KEY, api)
  return api
}

/** Parte dell'API globale di vue-i18n usata qui (tipo ridotto: quelli completi sono troppo profondi). */
interface I18nGlobalLite {
  te: (key: string, locale?: string) => boolean
  locale: unknown
}

/**
 * Traduttore per {@link describeError}: `te` controlla la lingua corrente e `it`/`en` (lingue dei messaggi del
 * package, sempre presenti), così il fallback di vue-i18n può risolvere `t`.
 *
 * @param t - funzione `t` del composer
 * @returns traduttore per i messaggi d'errore
 */
export function createErrorTranslator(
  t: (key: string, params?: Record<string, unknown>) => string
): IPachiErrorTranslator {
  const global = getPachiI18n()?.global as I18nGlobalLite | undefined
  return {
    t,
    te: (key) => {
      if (!global) return false
      const current = typeof global.locale === 'string' ? global.locale : undefined
      return [current, 'en', 'it'].some((l) => (l ? global.te(key, l) : global.te(key)))
    },
  }
}

/**
 * Descrive un errore lanciato da una richiesta (normalizza e traduce).
 *
 * @param err - valore lanciato
 * @param t - funzione `t` del composer
 * @returns descrizione per la UI
 */
export async function describeRequestError(
  err: unknown,
  t: (key: string, params?: Record<string, unknown>) => string
): Promise<IAdminErrorDescription> {
  return describeError(await parseApiError(err), createErrorTranslator(t))
}
