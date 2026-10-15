/** Messages of a locale: nested object with string values. */
export type PachiLocaleMessages = Record<string, unknown>

/** Messages of all locales: `{ localeCode: messages }` (e.g. `{ it: {...}, en: {...} }`). */
export type PachiMessageMap = Record<string, PachiLocaleMessages>

/**
 * Deep structure of `T` with string values: used to force a translation to have the same
 * keys as the reference locale (`const en: PachiMessages<typeof it> = { ... }`).
 */
export type PachiMessages<T> = {
  [K in keyof T]: T[K] extends string ? string : PachiMessages<T[K]>
}

/** Options of {@link createPachiI18n}. */
export interface CreatePachiI18nOptions {
  /** App messages per locale. The locales offered to the user are the keys of this object. */
  messages: PachiMessageMap
  /** Locale used when nothing better is found (default `it`). */
  defaultLocale?: string
  /** Fallback locale for missing keys (default `en`). */
  fallbackLocale?: string
  /** localStorage key where the choice is stored (default `pachi-prefs-locale`). */
  storageKey?: string
  /**
   * Fixed locale: the app uses only this locale (no detection, no persistence, a single set of
   * registered messages, `availableLocales` with a single element, hence no selector). If the code does not
   * match any available locale `defaultLocale` is used and a warning is logged.
   */
  fixedLocale?: string | undefined
  /** Forces the initial locale (ignores localStorage and navigator); useful in tests. */
  initialLocale?: string
  /** Called (even async) on the initial locale and on every change, e.g. to sync Quasar's language. */
  onLocaleChange?: (code: string) => void | Promise<void>
}
