import { createUseAlova, defaultErrorHandlers } from '@ilpachi/use-alova'
import { fileSuccessHandlers } from '@ilpachi/use-alova/files'
import { getPachiConfig } from '../core/config'
import { AuthManager } from '../services/auth-manager'
import { errorMessage } from '../helpers/errormessages-helper'
import { getPachiQuasar } from '../helpers/quasar-instance'

/** `useAlova` factory returned by {@link createPachiHttp} (`useAlova({ url }).alova.Get/Post/...`). */
export type PachiUseAlova = ReturnType<typeof createUseAlova>

/** Delay (ms) before showing the spinner: fast responses do not flicker. */
const SPINNER_DELAY = 300

/** Options of {@link createPachiHttp}. */
export interface CreatePachiHttpOptions {
  /**
   * `true` (default): `{ success, message, data }` responses are unwrapped and only `data` is returned.
   * `false` for a backend with `PACHIFAST_ENVELOPE_ENABLED=false` (plain body). If omitted, the shell
   * configuration `http.envelope` is used.
   */
  envelope?: boolean
}

/**
 * Creates the `@ilpachi/use-alova` HTTP client wired to the shell: authentication header (only towards
 * the app origin) and token refresh on 401 with `retry()` (`AuthManager`), delayed spinner
 * (Quasar `Loading`) and error messages (Dialog/Notify). GETs are never cached (as with
 * httpachi): a request can ask for caching with an explicit `cacheFor`. Requests can use
 * `meta: { autoError: false, spinner: false }` (aliases read by use-alova).
 *
 * @param options - see {@link CreatePachiHttpOptions}
 * @returns `useAlova` factory (alova + fetch adapter)
 */
export function createPachiHttp(options: CreatePachiHttpOptions = {}): PachiUseAlova {
  const envelope = options.envelope ?? getPachiConfig().http.envelope
  return createUseAlova({
    // backend `token_type` (usually "bearer"); the token goes only to same-origin / baseURL requests
    token: () => AuthManager.getAccessToken(),
    authType: () => AuthManager.getTokenType() ?? undefined,
    errorHandlers: [AuthManager.handleErrors(), ...defaultErrorHandlers],
    // blob/DOM besides JSON: needed by `withFiles(...).$download` (@ilpachi/use-alova/files)
    successHandlers: [...fileSuccessHandlers],
    errorMessageFunction: errorMessage,
    unwrapEnvelope: envelope,
    cacheFor: { GET: null },
    overlay: {
      mode: 'auto',
      delay: SPINNER_DELAY,
      show: () => getPachiQuasar().loading.show(),
      hide: () => getPachiQuasar().loading.hide()
    }
  })
}
