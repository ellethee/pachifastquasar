import { computed, type ComputedRef, type WritableComputedRef } from 'vue'
import { requirePachiI18n } from '../services/i18n-instance'

/** Valore restituito da {@link useLocale}. */
export interface UseLocale {
  /** Lingua attiva (scrivibile). */
  locale: WritableComputedRef<string>
  /** Lingue disponibili (derivate dai messaggi registrati). */
  availableLocales: ComputedRef<string[]>
  /** Cambia la lingua attiva (ignora codici non disponibili). */
  setLocale: (code: string) => void
  /** Nome nativo della lingua (es. `it` -> `Italiano`), con fallback al codice. */
  labelOf: (code: string) => string
}

/**
 * Gestione della lingua attiva: utilizzabile anche fuori da `setup()`.
 * `createPachiI18n` deve essere già stato chiamato.
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
