import { getUseAlovaInstance } from '@ilpachi/use-alova'

/** Minimal HTTP client required by the widgets (an app alova instance satisfies it if wrapped). */
export interface IPachiWidgetsHttp {
  Get<T = unknown>(url: string, config?: Record<string, unknown>): PromiseLike<T>
}

/** Returns the widgets HTTP client. */
export type PachiWidgetsHttpFactory = () => IPachiWidgetsHttp

let factory: PachiWidgetsHttpFactory | null = null

/** Cache of the client obtained from `@ilpachi/use-alova`, tied to the identity of the factory that produced it. */
let cached: { source: unknown; client: IPachiWidgetsHttp } | null = null

/**
 * Replaces the default HTTP client (e.g. to add auth and error handling).
 * Call it only once at app startup.
 *
 * @param f - factory returning the HTTP client
 */
export function setPachiWidgetsHttp(f: PachiWidgetsHttpFactory): void {
  factory = f
}

/**
 * Returns the current HTTP client. Order: factory set with `setPachiWidgetsHttp`; otherwise
 * the global `@ilpachi/use-alova` instance (`getUseAlovaInstance()`, registered by `createPachiApp`),
 * with auth, token refresh and errors. The obtained client is cached until the global factory changes.
 *
 * @returns HTTP client
 * @throws Error if there is neither a registered client nor a use-alova instance
 */
export function getPachiWidgetsHttp(): IPachiWidgetsHttp {
  if (factory) return factory()
  let source: ReturnType<typeof getUseAlovaInstance>
  try {
    source = getUseAlovaInstance()
  } catch (cause) {
    throw new Error(
      '@ilpachi/fastquasar-dashboard-widgets needs an @ilpachi/use-alova client: call createUseAlova() ' +
        '(done by createPachiApp of @ilpachi/pachifastquasar) or register a client with setPachiWidgetsHttp()',
      { cause },
    )
  }
  if (!cached || cached.source !== source) {
    cached = { source, client: source().alova as unknown as IPachiWidgetsHttp }
  }
  return cached.client
}

/** Tests only: resets the registered client and the cache. */
export function resetPachiWidgetsHttp(): void {
  factory = null
  cached = null
}
