/** Messaggi di una lingua: oggetto annidato con valori stringa. */
export type PachiLocaleMessages = Record<string, unknown>

/** Messaggi di tutte le lingue: `{ codiceLingua: messaggi }` (es. `{ it: {...}, en: {...} }`). */
export type PachiMessageMap = Record<string, PachiLocaleMessages>

/**
 * Struttura profonda di `T` con valori stringa: usata per obbligare una traduzione ad avere le stesse
 * chiavi della lingua di riferimento (`const en: PachiMessages<typeof it> = { ... }`).
 */
export type PachiMessages<T> = {
  [K in keyof T]: T[K] extends string ? string : PachiMessages<T[K]>
}

/** Opzioni di {@link createPachiI18n}. */
export interface CreatePachiI18nOptions {
  /** Messaggi dell'app per lingua. Le lingue offerte all'utente sono le chiavi di questo oggetto. */
  messages: PachiMessageMap
  /** Lingua usata se non si trova nulla di meglio (default `it`). */
  defaultLocale?: string
  /** Lingua di fallback per le chiavi mancanti (default `en`). */
  fallbackLocale?: string
  /** Chiave localStorage in cui memorizzare la scelta (default `pachi-prefs-locale`). */
  storageKey?: string
  /**
   * Lingua fissa: l'app usa solo questa lingua (nessun rilevamento, nessuna persistenza, un solo set di
   * messaggi registrato, `availableLocales` con un solo elemento, quindi nessun selettore). Se il codice non
   * corrisponde a nessuna lingua disponibile si usa `defaultLocale` e si segnala un warning.
   */
  fixedLocale?: string | undefined
  /** Forza la lingua iniziale (ignora localStorage e navigator); utile in test. */
  initialLocale?: string
  /** Chiamata (anche async) alla lingua iniziale e a ogni cambio, es. per sincronizzare la lingua di Quasar. */
  onLocaleChange?: (code: string) => void | Promise<void>
}
