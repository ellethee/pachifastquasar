import { getUseAlovaInstance } from '@ilpachi/use-alova'

/** Factory restituita da `getUseAlovaInstance()`. */
type UseAlovaFactory = ReturnType<typeof getUseAlovaInstance>

/** Opzioni di richiesta passate al client (per alova: `meta` con `autoError`/`spinner`). */
export interface IPachiProfileRequestConfig {
  /** Opzioni per richiesta lette dal client dell'app (`@ilpachi/use-alova`). */
  meta?: { autoError?: boolean, spinner?: boolean }
  [key: string]: unknown
}

/**
 * Client HTTP minimale richiesto dalla sezione Sicurezza. Un'istanza alova dell'app (con auth, refresh del token
 * e gestione errori) lo soddisfa. Le risposte senza corpo (204) possono risolvere `null`/`undefined`.
 */
export interface IPachiProfileHttp {
  Get<T = unknown>(url: string, config?: IPachiProfileRequestConfig): PromiseLike<T>
  Post<T = unknown>(url: string, data?: unknown, config?: IPachiProfileRequestConfig): PromiseLike<T>
  /** `PATCH`: richiesto solo dalla modifica del profilo (`PachiProfileEditForm`). */
  Patch?<T = unknown>(url: string, data?: unknown, config?: IPachiProfileRequestConfig): PromiseLike<T>
}

/** Factory HTTP impostata esplicitamente con {@link setPachiProfileHttp}. */
let customFactory: ((apiBase: string) => IPachiProfileHttp) | null = null

/** Cache del client di default: valida finché `getUseAlovaInstance()` restituisce la stessa factory e lo stesso `apiBase`. */
let cache: { factory: UseAlovaFactory, apiBase: string, client: IPachiProfileHttp } | null = null

/** Base URL di default delle API (le richieste usano percorsi come `/auth/user/password`). */
export const DEFAULT_API_BASE = '/api'

/**
 * Sostituisce il client HTTP di default (test o client personalizzati). Da chiamare una volta all'avvio.
 *
 * @param factory - riceve il base URL delle API e restituisce il client, o `null` per tornare al default
 */
export function setPachiProfileHttp(factory: ((apiBase: string) => IPachiProfileHttp) | null): void {
  customFactory = factory
}

/**
 * Restituisce il client HTTP: factory impostata con {@link setPachiProfileHttp}, altrimenti il client alova
 * dell'istanza globale di `@ilpachi/use-alova` (registrata da `createPachiApp`), memorizzato in cache.
 *
 * @param apiBase - base URL delle API (default `/api`)
 * @returns client HTTP minimale
 * @throws Error se non esiste alcuna istanza `@ilpachi/use-alova`
 */
export function resolvePachiProfileHttp(apiBase: string = DEFAULT_API_BASE): IPachiProfileHttp {
  if (customFactory) return customFactory(apiBase)
  let factory: UseAlovaFactory
  try {
    factory = getUseAlovaInstance()
  } catch (cause) {
    throw new Error(
      '@ilpachi/fastquasar-profile needs an @ilpachi/use-alova client: call createUseAlova() '
        + '(done by createPachiApp of @ilpachi/pachifastquasar) or register a client with setPachiProfileHttp()',
      { cause },
    )
  }
  if (cache && cache.factory === factory && cache.apiBase === apiBase) return cache.client
  const client = factory({ url: apiBase }).alova as unknown as IPachiProfileHttp
  cache = { factory, apiBase, client }
  return client
}

/** Opzioni delle richieste silenziose: nessun dialog di errore né overlay (l'errore è mostrato nel form). */
export const SILENT_REQUEST: IPachiProfileRequestConfig = { meta: { autoError: false, spinner: false } }

/** Opzioni delle richieste di scrittura: errori gestiti dal componente (niente dialog), overlay di default. */
export const FORM_REQUEST: IPachiProfileRequestConfig = { meta: { autoError: false } }
