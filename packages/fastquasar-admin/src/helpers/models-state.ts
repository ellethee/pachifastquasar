import { createAdminApi } from './api'
import type { IAdminApi } from './api'
import { resolveHttp } from './http'
import { getPachiAdminOptions, isModelHidden } from './options'
import { sharedState } from './shared-state'
import type { IAdminModelInfo } from '../types/admin'


/** Window (ms) in which an already requested list is reused instead of making the request again. */
const LIST_REUSE_MS = 30_000

/** Wait (ms) before retrying after a transient error (network, 5xx). */
const RETRY_AFTER_FAILURE_MS = 10_000

/** Statuses that definitively mean "no access to the admin" (the list stays empty, no retries). */
const DEFINITIVE_STATUSES = new Set([401, 403, 404])

/**
 * Raw list of models with a single in-flight request: menu and page starting together (or a few moments
 * apart) share the same promise. An error is not kept in cache.
 *
 * @param api - API client
 * @param force - ignores the already requested list ("Retry" button)
 * @returns the models returned by the backend
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
 * Filters the models with `permissions.view` and those hidden by the options (`hideModels`).
 *
 * @param list - response of `GET /admin/models`
 * @returns the models to show
 */
export function visibleModels(list: IAdminModelInfo[]): IAdminModelInfo[] {
  return list.filter((m) => m.permissions?.view !== false && !isModelHidden(m))
}

/**
 * Stores the list of models (the page does it when it loads it, so the menu stays aligned).
 *
 * @param list - already filtered models
 */
export function setAdminModels(list: IAdminModelInfo[] | null): void {
  sharedState().models.value = list
}

/**
 * Cached list of models (reactive).
 *
 * @returns the models, or `null` if not yet loaded
 */
export function getAdminModels(): IAdminModelInfo[] | null {
  return sharedState().models.value
}

/**
 * Loads the models from the backend OUTSIDE a component (uses `getHttp` or the global instance of
 * `@ilpachi/use-alova`). Errors (401/403/network) are silent: the list stays empty.
 *
 * @param force - reload even if already cached
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
    // no client (e.g. `@ilpachi/use-alova` not yet created): no requests, retry after a pause
    state.failedAt = Date.now()
    return Promise.resolve()
  }
  const run = fetchAdminModels(api)
    .then((list) => {
      // response of a previous user (logout/login during the request): discarded
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
      // transient error: the list stays "unknown" and is retried after a pause (it does not become "no models")
      state.failedAt = Date.now()
    })
    .finally(() => {
      if (state.inflight === run) state.inflight = null
    })
  state.inflight = run
  return run
}

/**
 * True if the user sees at least one model. Reactive; the first read starts the (silent) loading.
 *
 * @returns `true` only with at least one visible model
 */
export function hasAdminModels(): boolean {
  if (sharedState().models.value === null) void loadAdminModels()
  return (sharedState().models.value?.length ?? 0) > 0
}

/**
 * True if a list has already been requested and has not failed (in-flight request or succeeded within the
 * reuse window): `fetchAdminModels` removes failed requests from the cache.
 *
 * @returns `true` if a new load would be a duplicate request
 */
export function hasRequestedAdminModels(): boolean {
  const list = sharedState().list
  return list !== null && Date.now() - list.at < LIST_REUSE_MS
}

/** Clears the cache (user change or logout). */
export function resetAdminModels(): void {
  const state = sharedState()
  state.epoch += 1
  state.list = null
  state.inflight = null
  state.failedAt = 0
  state.models.value = null
}
