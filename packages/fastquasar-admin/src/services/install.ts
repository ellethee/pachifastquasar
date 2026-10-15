import type { App } from 'vue'
import { setPachiAdminOptions } from '../helpers/options'
import type { IPachiAdminOptions } from '../helpers/options'
import { hasRequestedAdminModels, loadAdminModels, resetAdminModels } from '../helpers/models-state'

/** Window event emitted by the shell when the authenticated user changes. */
export const AUTH_CHANGED_EVENT = 'pachi:auth-changed'

/** Options of {@link installPachiAdmin}. */
export interface IInstallPachiAdminOptions extends IPachiAdminOptions {
  /**
   * Vue app (`ctx.app` of the boot). No longer needed for the HTTP client (which comes from the global instance
   * of `@ilpachi/use-alova` or from `getHttp`): accepted and ignored, for compatibility.
   */
  app?: App
}

/** Function that undoes the previous installation. */
let uninstallPrevious: (() => void) | null = null

/**
 * Installs the package integration with the app. To be called once in the boot, after `createPachiApp`:
 *
 * ```ts
 * installPachiAdmin({ app: ctx.app })
 * ```
 *
 * - sets the options (`setPachiAdminOptions`) (the HTTP client is the global instance of `@ilpachi/use-alova`, or `getHttp`);
 * - listens to `pachi:auth-changed` (emitted by the shell): on login/restore it loads the visible models (the
 *   "Admin" menu entry appears only if there is at least one), on logout it clears the cache.
 *
 * Without this call the page works anyway, but the menu entry does not appear. The package does not import the
 * shell. A second call replaces the first.
 *
 * @param options - package options and `app`
 * @returns function that removes the listeners
 */
export function installPachiAdmin(options: IInstallPachiAdminOptions = {}): () => void {
  uninstallPrevious?.()
  const { app: _app, ...rest } = options
  setPachiAdminOptions(rest)
  resetAdminModels()

  let lastUser: string | null | undefined
  const onAuth = (e: Event): void => {
    const detail = (e as CustomEvent<{ authenticated?: boolean, userId?: string | null, username?: string | null }>).detail
    const user = detail?.authenticated ? (detail.userId ?? detail.username ?? '') : null
    // the same user (e.g. session restore after the first load) does not invalidate the already requested list
    if (user !== null && user === lastUser) return
    // first event: if the menu or the page has already requested the list with the session restored from
    // storage (in flight or succeeded), that list belongs to the same user: it is adopted instead of redoing it
    if (user !== null && lastUser === undefined && hasRequestedAdminModels()) {
      lastUser = user
      return
    }
    lastUser = user
    resetAdminModels()
    if (user !== null) void loadAdminModels()
  }
  window.addEventListener(AUTH_CHANGED_EVENT, onAuth)
  uninstallPrevious = () => {
    window.removeEventListener(AUTH_CHANGED_EVENT, onAuth)
    uninstallPrevious = null
  }
  return uninstallPrevious
}
