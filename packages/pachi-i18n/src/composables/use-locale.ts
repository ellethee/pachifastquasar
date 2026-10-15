import { computed, type ComputedRef, type WritableComputedRef } from 'vue'
import { requirePachiI18n } from '../services/i18n-instance'

/** Value returned by {@link useLocale}. */
export interface UseLocale {
  /** Active locale (writable). */
  locale: WritableComputedRef<string>
  /** Available locales (derived from the registered messages). */
  availableLocales: ComputedRef<string[]>
  /** Changes the active locale (ignores unavailable codes). */
  setLocale: (code: string) => void
  /** Native name of the locale (e.g. `it` -> `Italiano`), falling back to the code. */
  labelOf: (code: string) => string
}

/**
 * Active locale management: also usable outside `setup()`.
 * `createPachiI18n` must have already been called.
 */
export function useLocale(): UseLocale {
  const { global } = requirePachiI18n()
  const availableLocales = computed(() => [...global.availableLocales])

  const setLocale = (code: string): void => {
    if (availableLocales.value.includes(code)) global.locale.value = code
  }

  const labelOf = (code: string): string => {
    try {
      const name = new Intl.DisplayNames([code], { type: 'language' }).of(code)
      return name ? name.charAt(0).toLocaleUpperCase(code) + name.slice(1) : code
    } catch {
      return code
    }
  }

  return { locale: global.locale as WritableComputedRef<string>, availableLocales, setLocale, labelOf }
}
