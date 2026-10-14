import { getCurrentInstance } from 'vue'
import { Dialog, Notify } from 'quasar'
import type { QDialogOptions, QNotifyCreateOptions, QVueGlobals } from 'quasar'

/**
 * Ricava l'istanza `$q` dell'app dal componente corrente (da chiamare in `setup()` o in un composable
 * chiamato da `setup()`). Non usa `useQuasar()`: in sviluppo l'app e il package possono vedere copie
 * diverse di `quasar`, e i plugin importati dal package non sarebbero installati (`create is not a function`).
 *
 * @returns `$q` dell'app, o `null` fuori da un componente (test, uso fuori da setup)
 */
export function resolveQuasar(): QVueGlobals | null {
  const $q = getCurrentInstance()?.appContext.config.globalProperties.$q as QVueGlobals | undefined
  return $q ?? null
}

/**
 * Apre un dialog con `$q.dialog`; se `$q` non e' disponibile ripiega sul plugin `Dialog` importato.
 *
 * @param $q - istanza di `resolveQuasar()`
 * @param options - opzioni di `Dialog.create`
 * @returns l'oggetto concatenabile del dialog
 */
export function openDialog($q: QVueGlobals | null, options: QDialogOptions): ReturnType<typeof Dialog.create> {
  return typeof $q?.dialog === 'function' ? $q.dialog(options) : Dialog.create(options)
}

/**
 * Mostra una notifica con `$q.notify`; se `$q` non e' disponibile ripiega sul plugin `Notify` importato.
 *
 * @param $q - istanza di `resolveQuasar()`
 * @param options - opzioni di `Notify.create`
 */
export function showNotify($q: QVueGlobals | null, options: QNotifyCreateOptions): void {
  if (typeof $q?.notify === 'function') $q.notify(options)
  else Notify.create(options)
}
