import { getCurrentInstance } from 'vue'
import { Notify } from 'quasar'
import type { QNotifyCreateOptions, QVueGlobals } from 'quasar'

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
 * Mostra una notifica con `$q.notify`; se `$q` non e' disponibile ripiega sul plugin `Notify` importato.
 *
 * @param $q - istanza di `resolveQuasar()`
 * @param options - opzioni di `Notify.create`
 */
export function showNotify($q: QVueGlobals | null, options: QNotifyCreateOptions): void {
  if (typeof $q?.notify === 'function') $q.notify(options)
  else Notify.create(options)
}
