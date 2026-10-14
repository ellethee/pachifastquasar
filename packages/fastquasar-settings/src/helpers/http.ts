import { getUseAlovaInstance } from '@ilpachi/use-alova'

/** Opzioni di richiesta minime supportate dal client HTTP delle impostazioni. */
export interface IPachiSettingsRequestConfig {
  /** Per alova: `null` disabilita la cache della richiesta. */
  cacheFor?: number | null
  [key: string]: unknown
}

/**
 * Client HTTP minimale richiesto dal package. Un'istanza alova dell'app
 * (con auth/gestione errori) lo soddisfa avvolgendo `Get` e `Put`.
 */
export interface IPachiSettingsHttp {
  Get<T = unknown>(url: string, config?: IPachiSettingsRequestConfig): PromiseLike<T>
  Put(url: string, data?: unknown, config?: IPachiSettingsRequestConfig): PromiseLike<unknown>
}

/** Opzioni globali del package (da impostare una volta all'avvio con `setPachiSettingsOptions`). */
export interface IPachiSettingsOptions {
  /** Restituisce il client HTTP (base URL già impostata, es. `/api/auth`). Default: istanza di `@ilpachi/use-alova` registrata dall'app (`getUseAlovaInstance()({ url: baseUrl }).alova`). */
  getHttp?: () => IPachiSettingsHttp
  /** Indica se l'utente è autenticato (le chiamate al backend sono saltate se `false`). Default: sempre `true`. */
  isAuthenticated?: () => boolean
  /**
   * Utente corrente (`id` o `username`), usato come chiave della cache per utente al boot e quando il caricamento
   * parte senza l'evento `pachi:auth-changed`. Es. `() => AuthManager.getInstance().userInfo`.
   */
  getUser?: () => { id?: string | null; username?: string | null } | null
  /** `url` passato a `@ilpachi/use-alova` per creare il client di default (non ha effetto con `getHttp` personalizzato). Default: `/api/auth`. */
  baseUrl?: string
  /**
   * Abilita il fallback che esegue come codice (`new Function`) le stringhe `events`/`watch` dello schema
   * non riconducibili ad azioni nominate. Richiede `unsafe-eval` nella CSP ed esegue codice proveniente dal backend:
   * lasciare `false` (default) salvo schemi di cui ci si fida. Vedi `registerSettingsActions`.
   */
  allowScriptStrings?: boolean
}

/** Factory di `@ilpachi/use-alova` (tipo restituito da `getUseAlovaInstance`). */
type UseAlovaFactory = ReturnType<typeof getUseAlovaInstance>

/** Cache del client di default: valida finché restano uguali la factory registrata e la base URL. */
let cache: { factory: UseAlovaFactory, baseUrl: string, http: IPachiSettingsHttp } | null = null

/**
 * Client HTTP di default: l'istanza alova di `@ilpachi/use-alova` registrata dall'app (lo fa `createPachiApp`
 * di `@ilpachi/pachifastquasar`), creata con `url: baseUrl`. Il client è memorizzato e ricreato solo se cambiano
 * la factory registrata o `baseUrl`.
 *
 * @returns client HTTP (con auth, refresh ed errori gestiti dall'app)
 * @throws Error se non è stata creata nessuna istanza di `@ilpachi/use-alova`
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
 * Configura il package (client HTTP, stato di autenticazione, base URL). In assenza di `getHttp` si usa il client
 * di `@ilpachi/use-alova` registrato dall'app (`createPachiApp`).
 * Da chiamare una sola volta all'avvio dell'app (es. in un boot file).
 *
 * @param opts - opzioni parziali, unite a quelle correnti
 */
export function setPachiSettingsOptions(opts: IPachiSettingsOptions): void {
  options = { ...options, ...opts }
}

/**
 * Restituisce le opzioni correnti del package.
 *
 * @returns opzioni complete
 */
export function getPachiSettingsOptions(): Required<IPachiSettingsOptions> {
  return options
}
