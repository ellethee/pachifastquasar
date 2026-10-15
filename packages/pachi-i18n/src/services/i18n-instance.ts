import { createI18n, type I18n } from 'vue-i18n'
import { watch } from 'vue'
import type { CreatePachiI18nOptions, PachiMessageMap } from '../types'
import { detectLocale, matchLocale } from '../helper/detect-locale'

/** vue-i18n instance created by {@link createPachiI18n} (composition mode). */
export type PachiI18n = I18n<Record<string, never>, Record<string, never>, Record<string, never>, string, false>

const INSTANCE_KEY = Symbol.for('@ilpachi/pachi-i18n/instance')

const STOP_KEY = Symbol.for('@ilpachi/pachi-i18n/stop')

/** Holder on `globalThis`: stays unique even if the bundler duplicates the package. */
const holder = globalThis as unknown as Record<symbol, PachiI18n | (() => void) | undefined>

/**
 * Disposes the global instance: stops the watcher that persists/applies locale changes and forgets it
 * (`getPachiI18n()` returns `undefined`). Useful in tests, HMR or to recreate the i18n; it is idempotent.
 * `createPachiI18n` calls it by itself before creating a new instance.
 */
export function disposePachiI18n(): void {
  const stop = holder[STOP_KEY]
  if (typeof stop === 'function') stop()
  holder[STOP_KEY] = undefined
  holder[INSTANCE_KEY] = undefined
}

/** Returns the instance created by {@link createPachiI18n}, or `undefined` if not created yet. */
export function getPachiI18n(): PachiI18n | undefined {
  return holder[INSTANCE_KEY] as PachiI18n | undefined
}

/** Like {@link getPachiI18n} but throws if the instance does not exist. */
export function requirePachiI18n(): PachiI18n {
  const instance = getPachiI18n()
  if (!instance) throw new Error('@ilpachi/pachi-i18n: call createPachiI18n() (i18n boot) before using it.')
  return instance
}

/**
 * Resolves `fixedLocale` among the available locales (exact, base, variant match).
 * If nothing matches it falls back to `defaultLocale` (or the first locale) with a warning.
 *
 * @param fixedLocale - requested code (empty/missing = no fixed locale)
 * @param messages - messages per locale
 * @param defaultLocale - fallback locale
 * @returns the fixed locale code or `undefined`
 */
function resolveFixedLocale(
  fixedLocale: string | undefined,
  messages: PachiMessageMap,
  defaultLocale: string,
): string | undefined {
  if (!fixedLocale?.trim()) return undefined
  const available = Object.keys(messages)
  const match = matchLocale(fixedLocale.trim(), available)
  if (match) return match
  const fallback = matchLocale(defaultLocale, available) ?? available[0] ?? defaultLocale
  console.warn(`[pachi-i18n] fixed locale "${fixedLocale}" not available (${available.join(', ')}): using "${fallback}"`)
  return fallback
}

/**
 * Creates the vue-i18n instance (composition, `legacy: false`) and stores it as the module singleton.
 * With `fixedLocale` it uses only that locale (no detection nor persistence).
 * Otherwise it detects the initial locale (localStorage, then `navigator.languages`, then `defaultLocale`), persists
 * every change, updates `document.documentElement.lang` and calls `onLocaleChange`.
 * It must be installed with `app.use(i18n)`.
 *
 * Meant for a SPA (SSR not supported: the instance is a singleton on `globalThis`). Only one exists at a time:
 * a new call disposes the previous one (see {@link disposePachiI18n}); always install the last one created, because
 * `usePachiI18n`/`useLocale`/`pachiT` work on the global one.
 *
 * @param options - see {@link CreatePachiI18nOptions}
 */
export function createPachiI18n(options: CreatePachiI18nOptions): PachiI18n {
  const {
    messages,
    defaultLocale = 'it',
    fallbackLocale = 'en',
    storageKey = 'pachi-prefs-locale',
    initialLocale,
    fixedLocale,
    onLocaleChange,
  } = options
  disposePachiI18n()
  const fixed = resolveFixedLocale(fixedLocale, messages, defaultLocale)
  const catalog = fixed ? { [fixed]: messages[fixed] ?? {} } : messages
  const available = Object.keys(catalog)
  const forced = initialLocale ? matchLocale(initialLocale, available) : undefined
  // defaultLocale not present in the app messages: fall back to the variant/first available locale
  const matchedDefault = matchLocale(defaultLocale, available)
  const safeDefault = matchedDefault ?? available[0] ?? defaultLocale
  if (!matchedDefault && available.length > 0 && !fixed) {
    console.warn(`[pachi-i18n] defaultLocale "${defaultLocale}" not available (${available.join(', ')}): using "${safeDefault}"`)
  }
  const locale = fixed ?? forced ?? detectLocale(available, safeDefault, storageKey)

  const i18n = createI18n({
    legacy: false,
    locale,
    fallbackLocale: fixed ?? matchLocale(fallbackLocale, available) ?? fallbackLocale,
    messages: catalog as Record<string, never>,
  }) as unknown as PachiI18n
  holder[INSTANCE_KEY] = i18n

  // onLocaleChange may be async: calls are serialized and, on rapid changes, intermediate locales
  // are skipped so the last request always wins (no out-of-order resolutions)
  let latest = locale
  let running = false
  const flush = async (): Promise<void> => {
    if (running) return
    running = true
    let done: string | undefined
    try {
      while (done !== latest) {
        done = latest
        try {
          await onLocaleChange?.(done)
        } catch (error) {
          console.error('[pachi-i18n] onLocaleChange failed', error)
        }
      }
    } finally {
      running = false
    }
  }

  /** Side effects of an active locale (lang attribute, callback). */
  const apply = (code: string): void => {
    if (typeof document !== 'undefined') document.documentElement.lang = code
    latest = code
    void flush()
  }

  apply(locale)
  if (fixed) return i18n
  holder[STOP_KEY] = watch(i18n.global.locale, (code) => {
    try {
      localStorage.setItem(storageKey, code)
    } catch {
      // localStorage unavailable: the choice only lasts for the session
    }
    apply(code)
  })

  return i18n
}
