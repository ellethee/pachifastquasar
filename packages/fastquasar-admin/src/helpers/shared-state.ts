import { ref } from 'vue'
import type { Ref } from 'vue'
import type { IAdminModelInfo } from '../types/admin'
import type { IResolvedAdminOptions } from './options'

/** Shared state of the package. */
export interface IAdminSharedState {
  /** Current options (`undefined` = defaults). */
  options: IResolvedAdminOptions | undefined
  /** Visible models of the user; `null` = not yet known. */
  models: Ref<IAdminModelInfo[] | null>
  /** Model loading in progress. */
  inflight: Promise<void> | null
  /** Last request of the model list (shared between menu and page). */
  list: { at: number, promise: Promise<IAdminModelInfo[]> } | null
  /** Incremented on every reset (user change/logout): a response from a previous epoch must be discarded. */
  epoch: number
  /** Instant (ms) of the last load that failed with a transient error (network, 5xx), to limit retries. */
  failedAt: number
}

const KEY = Symbol.for('@ilpachi/fastquasar-admin/state')

/**
 * Shared state, anchored to `globalThis`: the shell loads `menu`/`routes` with `import.meta.glob` (often from
 * `dist/`) while the app imports the package from the entry point; in development there can be two copies of
 * the module and they must still see the same options, the same HTTP client and the same model list.
 *
 * @returns the single state of the process/window
 */
export function sharedState(): IAdminSharedState {
  const g = globalThis as unknown as Record<symbol, IAdminSharedState | undefined>
  g[KEY] ??= { options: undefined, models: ref<IAdminModelInfo[] | null>(null), inflight: null, list: null, epoch: 0, failedAt: 0 }
  return g[KEY]
}
