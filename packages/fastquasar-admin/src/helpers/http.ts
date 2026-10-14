import { getUseAlovaInstance } from '@ilpachi/use-alova'

/** Opzioni di richiesta passate al client (per alova: `meta` con `autoError`/`spinner`). */
export interface IPachiAdminRequestConfig {
  /** Opzioni per richiesta lette dal client dell'app (`@ilpachi/use-alova`). */
  meta?: { autoError?: boolean, spinner?: boolean }
  [key: string]: unknown
}

/**
 * Client HTTP minimale richiesto dal package. Un'istanza alova dell'app (con auth, refresh del token e gestione
 * errori) lo soddisfa. Le risposte senza corpo (204) possono risolvere `null`/`undefined`.
 */
export interface IPachiAdminHttp {
  Get<T = unknown>(url: string, config?: IPachiAdminRequestConfig): PromiseLike<T>
  Post<T = unknown>(url: string, data?: unknown, config?: IPachiAdminRequestConfig): PromiseLike<T>
  Patch<T = unknown>(url: string, data?: unknown, config?: IPachiAdminRequestConfig): PromiseLike<T>
  Delete<T = unknown>(url: string, data?: unknown, config?: IPachiAdminRequestConfig): PromiseLike<T>
}

/** Base URL di default delle API Admin. */
export const DEFAULT_BASE_PATH = '/api/admin/models'

/** Richieste di lettura silenziose: nessun dialog di errore né overlay (l'errore è mostrato dal componente). */
export const SILENT_REQUEST: IPachiAdminRequestConfig = { meta: { autoError: false, spinner: false } }

/** Richieste di scrittura: errori gestiti dal componente (niente dialog), overlay di default. */
export const WRITE_REQUEST: IPachiAdminRequestConfig = { meta: { autoError: false } }

/** Cache dei client creati: per factory restituita da `getUseAlovaInstance()` e per base URL. */
const clientCache = new WeakMap<object, Map<string, IPachiAdminHttp>>()

/**
 * Client di default: l'istanza globale di `@ilpachi/use-alova` (registrata da `createPachiApp`), memorizzata per
 * identità della factory e base URL.
 *
 * @param basePath - base URL delle API Admin
 * @returns client HTTP minimale
 * @throws Error se non esiste nessuna istanza di `@ilpachi/use-alova`
 */
function defaultHttp(basePath: string): IPachiAdminHttp {
  let factory: ReturnType<typeof getUseAlovaInstance>
  try {
    factory = getUseAlovaInstance()
  } catch {
    throw new Error(
      '@ilpachi/fastquasar-admin needs an @ilpachi/use-alova client: call createUseAlova() (done by createPachiApp '
        + 'of @ilpachi/pachifastquasar) or pass getHttp to setPachiAdminOptions()'
    )
  }
  let perUrl = clientCache.get(factory)
  if (!perUrl) {
    perUrl = new Map()
    clientCache.set(factory, perUrl)
  }
  let client = perUrl.get(basePath)
  if (!client) {
    client = factory({ url: basePath }).alova as unknown as IPachiAdminHttp
    perUrl.set(basePath, client)
  }
  return client
}

/**
 * Risolve il client HTTP. Ordine: `getHttp` delle opzioni, altrimenti l'istanza globale di `@ilpachi/use-alova`.
 *
 * @param basePath - base URL delle API Admin
 * @param getHttp - factory delle opzioni, se presente
 * @returns client HTTP minimale
 * @throws Error se manca `getHttp` e non esiste un'istanza di `@ilpachi/use-alova`
 */
export function resolveHttp(
  basePath: string,
  getHttp?: ((basePath: string) => IPachiAdminHttp) | undefined
): IPachiAdminHttp {
  if (getHttp) return getHttp(basePath)
  return defaultHttp(basePath)
}
