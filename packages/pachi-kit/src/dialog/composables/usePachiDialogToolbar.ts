import { inject, ref } from 'vue'
import type { InjectionKey, Ref } from 'vue'

/**
 * Key with which `PachiDialog` provides the toolbar portal target. The runtime value remains the
 * legacy string `'pachiDialogToolbarPortal'` (compatible with `inject('pachiDialogToolbarPortal')`).
 */
export const PACHI_DIALOG_TOOLBAR_KEY =
  'pachiDialogToolbarPortal' as unknown as InjectionKey<Ref<HTMLElement | null>>

/**
 * Returns the target (`PachiDialog` toolbar element) in which to teleport your own controls.
 * Outside a `PachiDialog` the target is a ref to `null`.
 */
export function usePachiDialogToolbar() {
  const target = inject(PACHI_DIALOG_TOOLBAR_KEY, ref<HTMLElement | null>(null))
  return { target }
}
