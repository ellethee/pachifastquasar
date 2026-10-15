import { getPachiI18n } from '@ilpachi/pachi-i18n'
import type { IPachiApiError, IPachiErrorTranslator } from './api-error'
import { resolveErrorMessage } from './api-error'

/** Part of the vue-i18n global API used here (reduced type: the full ones are too deep). */
interface I18nGlobalLite {
  te: (key: string, locale?: string) => boolean
  locale: unknown
}

/**
 * Creates the translator for {@link resolveErrorMessage}: `te` checks the current language and `it`/`en`
 * (the package message languages, always present), so the vue-i18n fallback can resolve `t`.
 *
 * @param t - composer `t` function
 * @returns translator for error messages
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
 * Translated message for an error (see {@link resolveErrorMessage}).
 *
 * @param error - normalized error
 * @param t - composer `t` function
 * @returns text to show
 */
export function translateApiError(
  error: IPachiApiError,
  t: (key: string, params?: Record<string, unknown>) => string
): string {
  return resolveErrorMessage(error, createErrorTranslator(t))
}
