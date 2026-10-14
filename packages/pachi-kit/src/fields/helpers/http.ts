import { getUseAlovaInstance } from '@ilpachi/use-alova'

/** Client HTTP minimale richiesto dai select remoti: una GET che restituisce il JSON già decodificato. */
export interface IPachiFieldsHttp {
  /**
   * Esegue una GET.
   *
   * @param url - URL dell'endpoint (es. `/api/genere`)
   * @param params - query string opzionale
   * @returns il corpo JSON della risposta
   */
  get<T = unknown>(url: string, params?: Record<string, string | number>): PromiseLike<T>
}

let fieldsHttp: IPachiFieldsHttp | null = null
let cachedFactory: unknown = null
let cachedHttp: IPachiFieldsHttp | null = null

/**
 * Sostituisce il client HTTP usato dai select remoti (es. per aggiungere header di
 * autenticazione o gestione errori dell'app). Da chiamare una sola volta all'avvio.
 *
 * @param http - client HTTP che implementa {@link IPachiFieldsHttp}
 */
export function setPachiFieldsHttp(http: IPachiFieldsHttp): void {
  fieldsHttp = http
}

/**
 * Restituisce il client HTTP corrente. Ordine: client impostato con `setPachiFieldsHttp`; altrimenti il client di
 * `@ilpachi/use-alova` (istanza globale creata da `createUseAlova()`, cablata da `createPachiApp`), con auth,
 * refresh del token ed errori. Il client derivato è memorizzato finché la factory dell'istanza non cambia.
 *
 * @returns client HTTP in uso
 * @throws Error se non è registrato alcun client e use-alova non è stato inizializzato
 */
export function getPachiFieldsHttp(): IPachiFieldsHttp {
  if (fieldsHttp) return fieldsHttp
  let factory: ReturnType<typeof getUseAlovaInstance>
  try {
    factory = getUseAlovaInstance()
  } catch (cause) {
    throw new Error(
      '@ilpachi/pachi-kit/fields needs an @ilpachi/use-alova client: call createUseAlova() (done by createPachiApp of @ilpachi/pachifastquasar) or register a client with setPachiFieldsHttp()',
      { cause },
    )
  }
  if (cachedHttp && cachedFactory === factory) return cachedHttp
  const { alova } = factory({ url: '' })
  cachedFactory = factory
  cachedHttp = {
    get: <T>(url: string, params?: Record<string, string | number>) =>
      alova.Get<T>(url, params ? { params, cacheFor: null } : { cacheFor: null }) as PromiseLike<T>,
  }
  return cachedHttp
}
