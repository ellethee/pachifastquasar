import { inject, provide } from 'vue'
import type { InjectionKey } from 'vue'
import { getPachiI18n } from '@ilpachi/pachi-i18n'
import { createAdminApi } from './api'
import type { IAdminApi } from './api'
import { describeError, parseApiError } from './api-error'
import type { IAdminErrorDescription, IPachiErrorTranslator } from './api-error'
import { resolveHttp } from './http'
import { getPachiAdminOptions } from './options'

/** Key with which the page provides the API client to child components. */
export const ADMIN_API_KEY: InjectionKey<IAdminApi> = Symbol('pachiAdminApi')

/**
 * Admin API client for components: the one provided by the ancestor page, otherwise a new one built
 * with the resolved HTTP client (to be called inside `setup()`).
 *
 * @returns the API client
 */
export function useAdminApi(): IAdminApi {
  const injected = inject(ADMIN_API_KEY, null)
  if (injected) return injected
  const { getHttp, basePath } = getPachiAdminOptions()
  return createAdminApi(resolveHttp(basePath, getHttp))
}

/**
 * Creates the API client and provides it to descendants (to be called in the root page, inside `setup()`).
 *
 * @returns the API client
 */
export function provideAdminApi(): IAdminApi {
  const { getHttp, basePath } = getPachiAdminOptions()
  const api = createAdminApi(resolveHttp(basePath, getHttp))
  provide(ADMIN_API_KEY, api)
  return api
}

/** Part of the vue-i18n global API used here (reduced type: the full ones are too deep). */
interface I18nGlobalLite {
  te: (key: string, locale?: string) => boolean
  locale: unknown
}

/**
 * Translator for {@link describeError}: `te` checks the current language and `it`/`en` (the package message
 * languages, always present), so the vue-i18n fallback can resolve `t`.
 *
 * @param t - `t` function of the composer
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
 * Describes an error thrown by a request (normalizes and translates).
 *
 * @param err - thrown value
 * @param t - `t` function of the composer
 * @returns description for the UI
 */
export async function describeRequestError(
  err: unknown,
  t: (key: string, params?: Record<string, unknown>) => string
): Promise<IAdminErrorDescription> {
  return describeError(await parseApiError(err), createErrorTranslator(t))
}
