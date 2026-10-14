import { getCurrentInstance } from 'vue'
import { Dark, Notify } from 'quasar'
import type { QNotifyCreateOptions, QVueGlobals } from 'quasar'
import type { ISettingsActionDeps } from './actions'

let cached: QVueGlobals | null = null

/**
 * Ricava l'istanza `$q` dell'app dal componente corrente (da chiamare in `setup()` o in codice eseguito
 * da `setup()`), e la ricorda per le chiamate successive fuori da un componente (watcher, callback asincrone).
 * Non usa `useQuasar()`: in sviluppo l'app e il package possono vedere copie diverse di `quasar`, e i plugin
 * importati dal package non sarebbero installati (`create is not a function`).
 *
 * @returns `$q` dell'app, o `null` se non e' mai stato disponibile (test, uso fuori da setup)
 */
export function resolveQuasar(): QVueGlobals | null {
  const $q = getCurrentInstance()?.appContext.config.globalProperties.$q as QVueGlobals | undefined
  if ($q) cached = $q
  return cached
}

/**
 * Imposta l'istanza `$q` dell'app (es. da `installPachiSettings({ app })`), per usarla fuori da `setup()`.
 *
 * @param $q - istanza `$q` dell'app
 */
export function setQuasarInstance($q: QVueGlobals | null | undefined): void {
  if ($q) cached = $q
}

/** Dimentica l'istanza `$q` ricordata (per i test). */
export function resetQuasarCache(): void {
  cached = null
}

/**
 * Mostra una notifica con `$q.notify`; senza `$q` ripiega sul plugin `Notify` importato.
 *
 * @param options - opzioni di `Notify.create`
 */
export function showNotify(options: QNotifyCreateOptions): void {
  const $q = resolveQuasar()
  if (typeof $q?.notify === 'function') $q.notify(options)
  else Notify.create(options)
}

/**
 * Indica se il tema scuro e' attivo (`$q.dark.isActive`, ripiego sul plugin `Dark` importato).
 *
 * @returns `true` se il tema scuro e' attivo
 */
export function isDarkActive(): boolean {
  return !!(resolveQuasar()?.dark ?? Dark).isActive
}

/**
 * Dipendenze per le azioni di `events`/`watch` dello schema. `Dark` e `Notify` sono risolti a ogni chiamata
 * su `$q` dell'app (`$q.dark`, `$q.notify`, anche se l'istanza diventa disponibile dopo la creazione degli
 * handler), con ripiego sui plugin importati.
 *
 * @param $q - istanza `$q` da passare alle azioni (default: quella risolta/ricordata)
 * @returns `{ Dark, Notify, $q }` per `resolveSettingsActions`
 */
export function quasarDeps($q: QVueGlobals | null = resolveQuasar()): ISettingsActionDeps {
  const dark = (): { set: (v: boolean | 'auto') => void, toggle: () => void } =>
    (resolveQuasar()?.dark ?? Dark) as never
  return {
    Dark: { set: (v) => dark().set(v), toggle: () => dark().toggle() },
    Notify: { create: (o) => showNotify(o as QNotifyCreateOptions) },
    $q: $q ?? undefined,
  }
}
