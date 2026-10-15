import { getUseAlovaInstance } from '@ilpachi/use-alova'

/** Minimal request options supported by the settings HTTP client. */
export interface IPachiSettingsRequestConfig {
  /** For alova: `null` disables the request cache. */
  cacheFor?: number | null
  [key: string]: unknown
}

/**
 * Minimal HTTP client required by the package. The app's alova instance
 * (with auth/error handling) satisfies it by wrapping `Get` and `Put`.
 */
export interface IPachiSettingsHttp {
  Get<T = unknown>(url: string, config?: IPachiSettingsRequestConfig): PromiseLike<T>
  Put(url: string, data?: unknown, config?: IPachiSettingsRequestConfig): PromiseLike<unknown>
}

/** Global package options (to be set once at startup with `setPachiSettingsOptions`). */
export interface IPachiSettingsOptions {
  /** Returns the HTTP client (base URL already set, e.g. `/api/auth`). Default: the `@ilpachi/use-alova` instance registered by the app (`getUseAlovaInstance()({ url: baseUrl }).alova`). */
  getHttp?: () => IPachiSettingsHttp
  /** Tells whether the user is authenticated (backend calls are skipped if `false`). Default: always `true`. */
  isAuthenticated?: () => boolean
  /**
   * Current user (`id` or `username`), used as the per-user cache key at boot and when loading
   * starts without the `pachi:auth-changed` event. E.g. `() => AuthManager.getInstance().userInfo`.
   */
  getUser?: () => { id?: string | null; username?: string | null } | null
  /** `url` passed to `@ilpachi/use-alova` to create the default client (no effect with a custom `getHttp`). Default: `/api/auth`. */
  baseUrl?: string
  /**
   * Enables the fallback that executes as code (`new Function`) the schema `events`/`watch` strings
   * that cannot be mapped to named actions. Requires `unsafe-eval` in the CSP and runs code coming from the backend:
   * leave `false` (default) unless you trust the schemas. See `registerSettingsActions`.
   */
  allowScriptStrings?: boolean
}

/** `@ilpachi/use-alova` factory (type returned by `getUseAlovaInstance`). */
type UseAlovaFactory = ReturnType<typeof getUseAlovaInstance>

/** Default client cache: valid as long as the registered factory and the base URL stay the same. */
let cache: { factory: UseAlovaFactory, baseUrl: string, http: IPachiSettingsHttp } | null = null

/**
 * Default HTTP client: the alova instance of `@ilpachi/use-alova` registered by the app (done by `createPachiApp`
 * of `@ilpachi/pachifastquasar`), created with `url: baseUrl`. The client is memoized and recreated only if
 * the registered factory or `baseUrl` change.
 *
 * @returns HTTP client (with auth, refresh and errors handled by the app)
 * @throws Error if no `@ilpachi/use-alova` instance has been created
 */
export function defaultGetHttp(): IPachiSettingsHttp {
  let factory: UseAlovaFactory
  try {
    factory = getUseAlovaInstance()
  } catch (cause) {
    throw new Error(
      '@ilpachi/fastquasar-settings needs an @ilpachi/use-alova client: call createUseAlova() '
      + '(done by createPachiApp of @ilpachi/pachifastquasar) or pass getHttp to setPachiSettingsOptions()',
      { cause },
    )
  }
  const { baseUrl } = options
  if (!cache || cache.factory !== factory || cache.baseUrl !== baseUrl) {
    cache = { factory, baseUrl, http: factory({ url: baseUrl }).alova as IPachiSettingsHttp }
  }
  return cache.http
}

let options: Required<IPachiSettingsOptions> = {
  getHttp: defaultGetHttp,
  isAuthenticated: () => true,
  getUser: () => null,
  baseUrl: '/api/auth',
  allowScriptStrings: false,
}

/**
 * Configures the package (HTTP client, authentication state, base URL). Without `getHttp` the
 * `@ilpachi/use-alova` client registered by the app (`createPachiApp`) is used.
 * To be called once at app startup (e.g. in a boot file).
 *
 * @param opts - partial options, merged with the current ones
 */
export function setPachiSettingsOptions(opts: IPachiSettingsOptions): void {
  options = { ...options, ...opts }
}

/**
 * Returns the current package options.
 *
 * @returns complete options
 */
export function getPachiSettingsOptions(): Required<IPachiSettingsOptions> {
  return options
}
