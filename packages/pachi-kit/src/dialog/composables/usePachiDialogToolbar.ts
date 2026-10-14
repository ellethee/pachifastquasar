import { inject, ref } from 'vue'
import type { InjectionKey, Ref } from 'vue'

/**
 * Chiave con cui `PachiDialog` fornisce il target del portal della toolbar. Il valore runtime resta la
 * stringa storica `'pachiDialogToolbarPortal'` (compatibile con `inject('pachiDialogToolbarPortal')`).
 */
export const PACHI_DIALOG_TOOLBAR_KEY =
  'pachiDialogToolbarPortal' as unknown as InjectionKey<Ref<HTMLElement | null>>

/**
 * Restituisce il target (elemento della toolbar di `PachiDialog`) in cui teleportare i propri controlli.
 * Fuori da un `PachiDialog` il target e' un ref a `null`.
 */
export function usePachiDialogToolbar() {
  const target = inject(PACHI_DIALOG_TOOLBAR_KEY, ref<HTMLElement | null>(null))
  return { target }
}
