import { getUseAlovaInstance } from '@ilpachi/use-alova'

/** Factory returned by `getUseAlovaInstance()`. */
type UseAlovaFactory = ReturnType<typeof getUseAlovaInstance>

/** Request options passed to the client (for alova: `meta` with `autoError`/`spinner`). */
export interface IPachiProfileRequestConfig {
  /** Per-request options read by the app client (`@ilpachi/use-alova`). */
  meta?: { autoError?: boolean, spinner?: boolean }
  [key: string]: unknown
}

/**
 * Minimal HTTP client required by the Security section. The app's alova instance (with auth, token refresh
 * and error handling) satisfies it. Responses without a body (204) may resolve `null`/`undefined`.
 */
export interface IPachiProfileHttp {
  Get<T = unknown>(url: string, config?: IPachiProfileRequestConfig): PromiseLike<T>
  Post<T = unknown>(url: string, data?: unknown, config?: IPachiProfileRequestConfig): PromiseLike<T>
  /** `PATCH`: required only by profile editing (`PachiProfileEditForm`). */
  Patch?<T = unknown>(url: string, data?: unknown, config?: IPachiProfileRequestConfig): PromiseLike<T>
}

/** HTTP factory explicitly set with {@link setPachiProfileHttp}. */
let customFactory: ((apiBase: string) => IPachiProfileHttp) | null = null

/** Default client cache: valid as long as `getUseAlovaInstance()` returns the same factory and the same `apiBase`. */
let cache: { factory: UseAlovaFactory, apiBase: string, client: IPachiProfileHttp } | null = null

/** Default API base URL (requests use paths such as `/auth/user/password`). */
export const DEFAULT_API_BASE = '/api'

/**
 * Replaces the default HTTP client (tests or custom clients). Call once at startup.
 *
 * @param factory - receives the API base URL and returns the client, or `null` to go back to the default
 */
export function setPachiProfileHttp(factory: ((apiBase: string) => IPachiProfileHttp) | null): void {
  customFactory = factory
}

/**
 * Returns the HTTP client: the factory set with {@link setPachiProfileHttp}, otherwise the alova client
 * of the global `@ilpachi/use-alova` instance (registered by `createPachiApp`), cached.
 *
 * @param apiBase - API base URL (default `/api`)
 * @returns minimal HTTP client
 * @throws Error if no `@ilpachi/use-alova` instance exists
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

/** Options for silent requests: no error dialog or overlay (the error is shown in the form). */
export const SILENT_REQUEST: IPachiProfileRequestConfig = { meta: { autoError: false, spinner: false } }

/** Options for write requests: errors handled by the component (no dialog), default overlay. */
export const FORM_REQUEST: IPachiProfileRequestConfig = { meta: { autoError: false } }
