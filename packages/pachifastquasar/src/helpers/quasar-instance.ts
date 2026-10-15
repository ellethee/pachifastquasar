import type { QVueGlobals } from 'quasar'

let current: QVueGlobals | null = null

/**
 * Registers the app `$q` instance (called by `createPachiApp`). Quasar plugins (Dialog, Notify,
 * Loading) outside a component must be used from here and not imported from `quasar`: in development a
 * package in `node_modules` gets a different copy of the plugin, without `create` (not installed).
 *
 * @param $q - `app.config.globalProperties.$q`
 */
export function setPachiQuasar($q: QVueGlobals): void {
  current = $q
}

/**
 * `$q` instance of the app registered by `createPachiApp`.
 *
 * @returns the Quasar instance
 * @throws if `createPachiApp` has not been called yet
 */
export function getPachiQuasar(): QVueGlobals {
  if (!current) throw new Error('Quasar not initialized: call createPachiApp in the boot file')
  return current
}
