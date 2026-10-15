import { getCurrentInstance } from 'vue'
import { Dialog } from 'quasar'
import type { QVueGlobals } from 'quasar'
import PachiDialog from '../components/PachiDialog.vue'
import type { ICreatePachiDialogOptions } from '../types/PachiDialog'

/** Chainable object returned by `Dialog.create` (`onOk`, `onCancel`, `onDismiss`, `hide`, `update`). */
export type PachiDialogHandle = ReturnType<typeof Dialog.create>

/** Part of `$q` used to open the dialog (also useful to pass a substitute in tests). */
export type PachiDialogQuasar = Pick<QVueGlobals, 'dialog'>

/**
 * Opens a `PachiDialog` programmatically (`Dialog.create`) with custom content:
 * `content` (component or render function) and `contentProps` stand in for the default slot,
 * which cannot be passed with `Dialog.create({ component })`. Requires the Quasar `Dialog` plugin.
 *
 * Without the second argument it uses the `Dialog` plugin imported from `quasar`: in development with Vite, if the app and
 * the package see different copies of `quasar`, that plugin is not installed and the call fails
 * (`Dialog.create is not a function`). In that case use `usePachiDialog()` (in `setup()`) or pass
 * the app's `$q` as the second argument.
 *
 * Eventi: `.onOk(({ data, onSuccess, onError }) => ...)` (call `onSuccess()` to close),
 * `.onCancel()`, `.onDismiss()`.
 *
 * @param options - `PachiDialog` props (`title` required) plus `content`/`contentProps`
 * @param $q - optional: the app's `$q` instance (uses `$q.dialog` instead of the imported plugin)
 * @returns chainable object of `Dialog.create` (`onOk`, `onCancel`, `onDismiss`, `hide`, `update`)
 */
export function createPachiDialog(
  options: ICreatePachiDialogOptions,
  $q?: PachiDialogQuasar | null,
): PachiDialogHandle {
  const config = { component: PachiDialog, componentProps: { ...options } }
  return typeof $q?.dialog === 'function' ? $q.dialog(config) : Dialog.create(config)
}

/**
 * To be called in `setup()`: gets the app's `$q` (`getCurrentInstance()`, independent of the copy of
 * `quasar` seen by the package) and returns `create(options)` bound to it, callable later from event handlers.
 * Outside a component it falls back to the imported `Dialog` plugin.
 *
 * @returns `create(options)` function equivalent to `createPachiDialog(options, $q)`
 */
export function usePachiDialog(): (options: ICreatePachiDialogOptions) => PachiDialogHandle {
  const $q = getCurrentInstance()?.appContext.config.globalProperties.$q as QVueGlobals | undefined
  return (options) => createPachiDialog(options, $q)
}
