import { createAdminApi } from './api'
import type { IAdminApi } from './api'
import { resolveHttp } from './http'
import { getPachiAdminOptions, isModelHidden } from './options'
import { sharedState } from './shared-state'
import type { IAdminModelInfo } from '../types/admin'


/** Finestra (ms) in cui un elenco già richiesto è riusato invece di rifare la richiesta. */
const LIST_REUSE_MS = 30_000

/** Attesa (ms) prima di ritentare dopo un errore transitorio (rete, 5xx). */
const RETRY_AFTER_FAILURE_MS = 10_000

/** Stati che dicono in modo definitivo "nessun accesso all'admin" (l'elenco resta vuoto, niente nuovi tentativi). */
const DEFINITIVE_STATUSES = new Set([401, 403, 404])

/**
 * Elenco grezzo dei modelli con una sola richiesta in volo: menu e pagina che partono insieme (o a pochi
 * istanti di distanza) condividono la stessa promise. Un errore non resta in cache.
 *
 * @param api - client API
 * @param force - ignora l'elenco già richiesto (pulsante «Riprova»)
 * @returns i modelli restituiti dal backend
 */
export function fetchAdminModels(api: IAdminApi, force = false): Promise<IAdminModelInfo[]> {
  const state = sharedState()
  if (!force && state.list && Date.now() - state.list.at < LIST_REUSE_MS) return state.list.promise
  const promise = api.listModels()
  const entry = { at: Date.now(), promise }
  state.list = entry
  promise.catch(() => {
    if (state.list === entry) state.list = null
  })
  return promise
}

/**
 * Filtra i modelli con `permissions.view` e quelli nascosti dalle opzioni (`hideModels`).
 *
 * @param list - risposta di `GET /admin/models`
 * @returns i modelli da mostrare
 */
export function visibleModels(list: IAdminModelInfo[]): IAdminModelInfo[] {
  return list.filter((m) => m.permissions?.view !== false && !isModelHidden(m))
}

/**
 * Salva l'elenco dei modelli (lo fa la pagina quando lo carica, così il menu resta allineato).
 *
 * @param list - modelli già filtrati
 */
export function setAdminModels(list: IAdminModelInfo[] | null): void {
  sharedState().models.value = list
}

/**
 * Elenco dei modelli in cache (reattivo).
 *
 * @returns i modelli, o `null` se non ancora caricati
 */
export function getAdminModels(): IAdminModelInfo[] | null {
  return sharedState().models.value
}

/**
 * Carica i modelli dal backend FUORI da un componente (usa `getHttp` o l'istanza globale di
 * `@ilpachi/use-alova`). Gli errori (401/403/rete) sono silenziosi: l'elenco resta vuoto.
 *
 * @param force - ricarica anche se già in cache
 */
export function loadAdminModels(force = false): Promise<void> {
  if (!force && sharedState().models.value !== null) return Promise.resolve()
  const state = sharedState()
  if (state.inflight) return state.inflight
  if (!force && state.failedAt && Date.now() - state.failedAt < RETRY_AFTER_FAILURE_MS) return Promise.resolve()
  const { getHttp, basePath } = getPachiAdminOptions()
  const epoch = state.epoch
  let api: IAdminApi
  try {
    api = createAdminApi(resolveHttp(basePath, getHttp))
  } catch {
    // nessun client (es. `@ilpachi/use-alova` non ancora creato): niente richieste, nuovo tentativo dopo una pausa
    state.failedAt = Date.now()
    return Promise.resolve()
  }
  const run = fetchAdminModels(api)
    .then((list) => {
      // risposta di un utente precedente (logout/login durante la richiesta): scartata
      if (state.epoch !== epoch) return
      state.failedAt = 0
      state.models.value = visibleModels(list)
    })
    .catch((err: unknown) => {
      if (state.epoch !== epoch) return
      const status = (err as { status?: unknown } | null)?.status
      if (typeof status === 'number' && DEFINITIVE_STATUSES.has(status)) {
        state.models.value = []
        return
      }
      // errore transitorio: l'elenco resta "non noto" e si riprova dopo una pausa (non diventa un "nessun modello")
      state.failedAt = Date.now()
    })
    .finally(() => {
      if (state.inflight === run) state.inflight = null
    })
  state.inflight = run
  return run
}

/**
 * Vero se l'utente vede almeno un modello. Reattivo; la prima lettura avvia il caricamento (silenzioso).
 *
 * @returns `true` solo con almeno un modello visibile
 */
export function hasAdminModels(): boolean {
  if (sharedState().models.value === null) void loadAdminModels()
  return (sharedState().models.value?.length ?? 0) > 0
}

/**
 * Vero se un elenco è già stato richiesto e non è fallito (richiesta in volo o riuscita nella finestra di
 * riuso): `fetchAdminModels` toglie dalla cache le richieste fallite.
 *
 * @returns `true` se un nuovo caricamento sarebbe una richiesta duplicata
 */
export function hasRequestedAdminModels(): boolean {
  const list = sharedState().list
  return list !== null && Date.now() - list.at < LIST_REUSE_MS
}

/** Svuota la cache (cambio utente o logout). */
export function resetAdminModels(): void {
  const state = sharedState()
  state.epoch += 1
  state.list = null
  state.inflight = null
  state.failedAt = 0
  state.models.value = null
}
