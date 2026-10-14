import { createUseAlova, defaultErrorHandlers } from '@ilpachi/use-alova'
import { fileSuccessHandlers } from '@ilpachi/use-alova/files'
import { getPachiConfig } from '../core/config'
import { AuthManager } from '../services/auth-manager'
import { errorMessage } from '../helpers/errormessages-helper'
import { getPachiQuasar } from '../helpers/quasar-instance'

/** Factory `useAlova` restituita da {@link createPachiHttp} (`useAlova({ url }).alova.Get/Post/...`). */
export type PachiUseAlova = ReturnType<typeof createUseAlova>

/** Ritardo (ms) prima di mostrare lo spinner: le risposte veloci non lampeggiano. */
const SPINNER_DELAY = 300

/** Opzioni di {@link createPachiHttp}. */
export interface CreatePachiHttpOptions {
  /**
   * `true` (default): le risposte `{ success, message, data }` vengono scartate e si ottiene solo `data`.
   * `false` per un backend con `PACHIFAST_ENVELOPE_ENABLED=false` (corpo semplice). Se omessa si usa
   * `http.envelope` della configurazione della shell.
   */
  envelope?: boolean
}

/**
 * Crea il client HTTP `@ilpachi/use-alova` cablato con la shell: header di autenticazione (solo verso
 * l'origine dell'app) e refresh del token su 401 con `retry()` (`AuthManager`), spinner con ritardo
 * (Quasar `Loading`) e messaggi di errore (Dialog/Notify). Le GET non sono mai in cache (come con
 * httpachi): una richiesta può chiederla con `cacheFor` esplicito. Le richieste possono usare
 * `meta: { autoError: false, spinner: false }` (alias letti da use-alova).
 *
 * @param options - vedi {@link CreatePachiHttpOptions}
 * @returns factory `useAlova` (alova + adapter fetch)
 */
export function createPachiHttp(options: CreatePachiHttpOptions = {}): PachiUseAlova {
  const envelope = options.envelope ?? getPachiConfig().http.envelope
  return createUseAlova({
    // `token_type` del backend (di norma "bearer"); il token va solo a richieste same-origin / baseURL
    token: () => AuthManager.getAccessToken(),
    authType: () => AuthManager.getTokenType() ?? undefined,
    errorHandlers: [AuthManager.handleErrors(), ...defaultErrorHandlers],
    // blob/DOM oltre al JSON: serve a `withFiles(...).$download` (@ilpachi/use-alova/files)
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
