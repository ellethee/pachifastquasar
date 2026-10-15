import { getCurrentInstance } from 'vue'
import { Dialog, Notify } from 'quasar'
import type { QDialogOptions, QNotifyCreateOptions, QVueGlobals } from 'quasar'

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
 * Opens a dialog with `$q.dialog`; if `$q` is not available it falls back to the imported `Dialog` plugin.
 *
 * @param $q - instance from `resolveQuasar()`
 * @param options - `Dialog.create` options
 * @returns the dialog's chainable object
 */
export function openDialog($q: QVueGlobals | null, options: QDialogOptions): ReturnType<typeof Dialog.create> {
  return typeof $q?.dialog === 'function' ? $q.dialog(options) : Dialog.create(options)
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
