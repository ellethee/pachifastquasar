import { getCurrentInstance } from 'vue'
import { Notify } from 'quasar'
import type { QNotifyCreateOptions, QVueGlobals } from 'quasar'

/**
 * Gets the app's `$q` instance from the current component (call it in `setup()` or in a composable
 * called by `setup()`). It does not use `useQuasar()`: in development the app and the package may see
 * different copies of `quasar`, and plugins imported by the package would not be installed (`create is not a function`).
 *
 * @returns the app's `$q`, or `null` outside a component (tests, use outside setup)
 */
export function resolveQuasar(): QVueGlobals | null {
  const $q = getCurrentInstance()?.appContext.config.globalProperties.$q as QVueGlobals | undefined
  return $q ?? null
}

/**
 * Shows a notification with `$q.notify`; if `$q` is not available it falls back to the imported `Notify` plugin.
 *
 * @param $q - instance from `resolveQuasar()`
 * @param options - `Notify.create` options
 */
export function showNotify($q: QVueGlobals | null, options: QNotifyCreateOptions): void {
  if (typeof $q?.notify === 'function') $q.notify(options)
  else Notify.create(options)
}
