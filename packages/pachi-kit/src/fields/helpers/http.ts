import { getUseAlovaInstance } from '@ilpachi/use-alova'

/** Minimal HTTP client required by remote selects: a GET returning already-decoded JSON. */
export interface IPachiFieldsHttp {
  /**
   * Performs a GET.
   *
   * @param url - endpoint URL (es. `/api/genere`)
   * @param params - optional query string
   * @returns the JSON body of the response
   */
  get<T = unknown>(url: string, params?: Record<string, string | number>): PromiseLike<T>
}

let fieldsHttp: IPachiFieldsHttp | null = null
let cachedFactory: unknown = null
let cachedHttp: IPachiFieldsHttp | null = null

/**
 * Replaces the HTTP client used by remote selects (e.g. to add authentication headers
 * or app error handling). Call it once at startup.
 *
 * @param http - HTTP client implementing {@link IPachiFieldsHttp}
 */
export function setPachiFieldsHttp(http: IPachiFieldsHttp): void {
  fieldsHttp = http
}

/**
 * Returns the current HTTP client. Order: client set with `setPachiFieldsHttp`; otherwise the
 * `@ilpachi/use-alova` client (global instance created by `createUseAlova()`, wired by `createPachiApp`), with auth,
 * token refresh and errors. The derived client is memoized until the instance factory changes.
 *
 * @returns HTTP client in use
 * @throws Error if no client is registered and use-alova has not been initialized
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
