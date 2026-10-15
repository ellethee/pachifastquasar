import { getUseAlovaInstance } from '@ilpachi/use-alova'

/** Request options passed to the client (for alova: `meta` with `autoError`/`spinner`). */
export interface IPachiAdminRequestConfig {
  /** Per-request options read by the app's client (`@ilpachi/use-alova`). */
  meta?: { autoError?: boolean, spinner?: boolean }
  [key: string]: unknown
}

/**
 * Minimal HTTP client required by the package. An app alova instance (with auth, token refresh and error
 * handling) satisfies it. Responses without a body (204) may resolve `null`/`undefined`.
 */
export interface IPachiAdminHttp {
  Get<T = unknown>(url: string, config?: IPachiAdminRequestConfig): PromiseLike<T>
  Post<T = unknown>(url: string, data?: unknown, config?: IPachiAdminRequestConfig): PromiseLike<T>
  Patch<T = unknown>(url: string, data?: unknown, config?: IPachiAdminRequestConfig): PromiseLike<T>
  Delete<T = unknown>(url: string, data?: unknown, config?: IPachiAdminRequestConfig): PromiseLike<T>
}

/** Default base URL of the Admin APIs. */
export const DEFAULT_BASE_PATH = '/api/admin/models'

/** Silent read requests: no error dialog or overlay (the error is shown by the component). */
export const SILENT_REQUEST: IPachiAdminRequestConfig = { meta: { autoError: false, spinner: false } }

/** Write requests: errors handled by the component (no dialog), default overlay. */
export const WRITE_REQUEST: IPachiAdminRequestConfig = { meta: { autoError: false } }

/** Cache of created clients: one per factory returned by `getUseAlovaInstance()` and per base URL. */
const clientCache = new WeakMap<object, Map<string, IPachiAdminHttp>>()

/**
 * Default client: the global `@ilpachi/use-alova` instance (registered by `createPachiApp`), memoized by
 * factory identity and base URL.
 *
 * @param basePath - base URL of the Admin APIs
 * @returns minimal HTTP client
 * @throws Error if no `@ilpachi/use-alova` instance exists
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
 * Resolves the HTTP client. Order: `getHttp` from the options, otherwise the global `@ilpachi/use-alova` instance.
 *
 * @param basePath - base URL of the Admin APIs
 * @param getHttp - options factory, if present
 * @returns minimal HTTP client
 * @throws Error if `getHttp` is missing and no `@ilpachi/use-alova` instance exists
 */
export function resolveHttp(
  basePath: string,
  getHttp?: ((basePath: string) => IPachiAdminHttp) | undefined
): IPachiAdminHttp {
  if (getHttp) return getHttp(basePath)
  return defaultHttp(basePath)
}
