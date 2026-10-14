import { getPachiI18n } from '@ilpachi/pachi-i18n'
import type { IPachiApiError, IPachiErrorTranslator } from './api-error'
import { resolveErrorMessage } from './api-error'

/** Parte dell'API globale di vue-i18n usata qui (tipo ridotto: quelli completi sono troppo profondi). */
interface I18nGlobalLite {
  te: (key: string, locale?: string) => boolean
  locale: unknown
}

/**
 * Crea il traduttore per {@link resolveErrorMessage}: `te` controlla la lingua corrente e `it`/`en`
 * (le lingue dei messaggi del package, sempre presenti), così il fallback di vue-i18n può risolvere `t`.
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
 * Messaggio tradotto per un errore (vedi {@link resolveErrorMessage}).
 *
 * @param error - errore normalizzato
 * @param t - funzione `t` del composer
 * @returns testo da mostrare
 */
export function translateApiError(
  error: IPachiApiError,
  t: (key: string, params?: Record<string, unknown>) => string
): string {
  return resolveErrorMessage(error, createErrorTranslator(t))
}
