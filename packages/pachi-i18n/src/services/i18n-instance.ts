import { createI18n, type I18n } from 'vue-i18n'
import { watch } from 'vue'
import type { CreatePachiI18nOptions, PachiMessageMap } from '../types'
import { detectLocale, matchLocale } from '../helper/detect-locale'

/** Istanza vue-i18n creata da {@link createPachiI18n} (modalità composition). */
export type PachiI18n = I18n<Record<string, never>, Record<string, never>, Record<string, never>, string, false>

const INSTANCE_KEY = Symbol.for('@ilpachi/pachi-i18n/instance')

const STOP_KEY = Symbol.for('@ilpachi/pachi-i18n/stop')

/** Contenitore su `globalThis`: resta unico anche se il package venisse duplicato dal bundler. */
const holder = globalThis as unknown as Record<symbol, PachiI18n | (() => void) | undefined>

/**
 * Dismette l'istanza globale: ferma il watcher che persiste/applica i cambi di lingua e la dimentica
 * (`getPachiI18n()` torna `undefined`). Utile in test, HMR o per ricreare l'i18n; è idempotente.
 * `createPachiI18n` la chiama da sé prima di creare una nuova istanza.
 */
export function disposePachiI18n(): void {
  const stop = holder[STOP_KEY]
  if (typeof stop === 'function') stop()
  holder[STOP_KEY] = undefined
  holder[INSTANCE_KEY] = undefined
}

/** Restituisce l'istanza creata da {@link createPachiI18n}, oppure `undefined` se non ancora creata. */
export function getPachiI18n(): PachiI18n | undefined {
  return holder[INSTANCE_KEY] as PachiI18n | undefined
}

/** Come {@link getPachiI18n} ma solleva un errore se l'istanza non esiste. */
export function requirePachiI18n(): PachiI18n {
  const instance = getPachiI18n()
  if (!instance) throw new Error('@ilpachi/pachi-i18n: call createPachiI18n() (i18n boot) before using it.')
  return instance
}

/**
 * Risolve `fixedLocale` tra le lingue disponibili (match esatto, base, variante).
 * Se non corrisponde a nulla ripiega su `defaultLocale` (o sulla prima lingua) con un warning.
 *
 * @param fixedLocale - codice richiesto (vuoto/assente = lingua non fissa)
 * @param messages - messaggi per lingua
 * @param defaultLocale - lingua di ripiego
 * @returns il codice della lingua fissa oppure `undefined`
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
  console.warn(`[pachi-i18n] lingua fissa "${fixedLocale}" non disponibile (${available.join(', ')}): uso "${fallback}"`)
  return fallback
}

/**
 * Crea l'istanza vue-i18n (composition, `legacy: false`) e la memorizza come singleton del modulo.
 * Con `fixedLocale` usa solo quella lingua (niente rilevamento né persistenza).
 * Altrimenti rileva la lingua iniziale (localStorage, poi `navigator.languages`, poi `defaultLocale`), persiste ogni
 * cambio, aggiorna `document.documentElement.lang` e chiama `onLocaleChange`.
 * Va installata con `app.use(i18n)`.
 *
 * Pensato per una SPA (SSR non supportato: l'istanza è un singleton su `globalThis`). Ne esiste una sola alla volta:
 * una nuova chiamata dismette la precedente (vedi {@link disposePachiI18n}); installa sempre l'ultima creata, perché
 * `usePachiI18n`/`useLocale`/`pachiT` lavorano su quella globale.
 *
 * @param options - vedi {@link CreatePachiI18nOptions}
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
  // defaultLocale non presente nei messaggi dell'app: si ripiega sulla variante/prima lingua disponibile
  const matchedDefault = matchLocale(defaultLocale, available)
  const safeDefault = matchedDefault ?? available[0] ?? defaultLocale
  if (!matchedDefault && available.length > 0 && !fixed) {
    console.warn(`[pachi-i18n] defaultLocale "${defaultLocale}" non disponibile (${available.join(', ')}): uso "${safeDefault}"`)
  }
  const locale = fixed ?? forced ?? detectLocale(available, safeDefault, storageKey)

  const i18n = createI18n({
    legacy: false,
    locale,
    fallbackLocale: fixed ?? matchLocale(fallbackLocale, available) ?? fallbackLocale,
    messages: catalog as Record<string, never>,
  }) as unknown as PachiI18n
  holder[INSTANCE_KEY] = i18n

  // onLocaleChange può essere asincrona: le chiamate sono serializzate e, con cambi rapidi, le lingue
  // intermedie vengono saltate così vince sempre l'ultima richiesta (niente risoluzioni fuori ordine)
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

  /** Effetti collaterali di una lingua attiva (attributo lang, callback). */
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
      // localStorage non disponibile: la scelta vale solo per la sessione
    }
    apply(code)
  })

  return i18n
}
