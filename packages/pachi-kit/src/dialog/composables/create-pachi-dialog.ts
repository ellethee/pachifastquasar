import { getCurrentInstance } from 'vue'
import { Dialog } from 'quasar'
import type { QVueGlobals } from 'quasar'
import PachiDialog from '../components/PachiDialog.vue'
import type { ICreatePachiDialogOptions } from '../types/PachiDialog'

/** Oggetto concatenabile restituito da `Dialog.create` (`onOk`, `onCancel`, `onDismiss`, `hide`, `update`). */
export type PachiDialogHandle = ReturnType<typeof Dialog.create>

/** Parte di `$q` usata per aprire il dialog (utile anche per passare un sostituto nei test). */
export type PachiDialogQuasar = Pick<QVueGlobals, 'dialog'>

/**
 * Apre un `PachiDialog` in modo programmatico (`Dialog.create`) con contenuto custom:
 * `content` (componente o render function) e `contentProps` fanno le veci dello slot di default,
 * che con `Dialog.create({ component })` non e' passabile. Richiede il plugin Quasar `Dialog`.
 *
 * Senza il secondo argomento usa il plugin `Dialog` importato da `quasar`: in sviluppo con Vite, se app e
 * package vedono copie diverse di `quasar`, quel plugin non e' installato e la chiamata fallisce
 * (`Dialog.create is not a function`). In quel caso usare `usePachiDialog()` (in `setup()`) oppure passare
 * `$q` dell'app come secondo argomento.
 *
 * Eventi: `.onOk(({ data, onSuccess, onError }) => ...)` (chiama `onSuccess()` per chiudere),
 * `.onCancel()`, `.onDismiss()`.
 *
 * @param options - props di `PachiDialog` (`title` obbligatorio) piu' `content`/`contentProps`
 * @param $q - facoltativo: istanza `$q` dell'app (usa `$q.dialog` al posto del plugin importato)
 * @returns oggetto concatenabile di `Dialog.create` (`onOk`, `onCancel`, `onDismiss`, `hide`, `update`)
 */
export function createPachiDialog(
  options: ICreatePachiDialogOptions,
  $q?: PachiDialogQuasar | null,
): PachiDialogHandle {
  const config = { component: PachiDialog, componentProps: { ...options } }
  return typeof $q?.dialog === 'function' ? $q.dialog(config) : Dialog.create(config)
}

/**
 * Da chiamare in `setup()`: ricava `$q` dell'app (`getCurrentInstance()`, indipendente dalla copia di
 * `quasar` vista dal package) e restituisce `create(options)` legato ad esso, richiamabile poi da event handler.
 * Fuori da un componente ripiega sul plugin `Dialog` importato.
 *
 * @returns funzione `create(options)` equivalente a `createPachiDialog(options, $q)`
 */
export function usePachiDialog(): (options: ICreatePachiDialogOptions) => PachiDialogHandle {
  const $q = getCurrentInstance()?.appContext.config.globalProperties.$q as QVueGlobals | undefined
  return (options) => createPachiDialog(options, $q)
}
