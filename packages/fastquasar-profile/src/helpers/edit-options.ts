import { DEFAULT_API_BASE } from './http'
import type { IPachiProfileEditOptions } from '../types/edit'

/** Opzioni risolte della modifica del profilo. */
export type IResolvedEditOptions = IPachiProfileEditOptions & { enabled: boolean, apiBase: string }

/**
 * Normalizza la prop `editable`: `true` = modifica attiva con i default; oggetto = attiva salvo `enabled: false`;
 * `false`/assente = sola lettura.
 *
 * @param input - valore della prop
 * @returns opzioni complete
 */
export function resolveEditOptions(input: boolean | IPachiProfileEditOptions | undefined): IResolvedEditOptions {
  if (input === undefined || input === false) return { enabled: false, apiBase: DEFAULT_API_BASE }
  if (input === true) return { enabled: true, apiBase: DEFAULT_API_BASE }
  return { ...input, enabled: input.enabled !== false, apiBase: input.apiBase ?? DEFAULT_API_BASE }
}

let configured: boolean | IPachiProfileEditOptions | undefined

/**
 * Imposta le opzioni di modifica usate dalla route `/user/profile` del package (`PachiProfileRoute`), che non ha
 * props: da chiamare una volta all'avvio, ad esempio `setPachiProfileEdit({ onUpdated: () => authManager.refreshUserInfo() })`.
 *
 * @param options - stesso valore della prop `editable` di `PachiProfilePage`
 */
export function setPachiProfileEdit(options: boolean | IPachiProfileEditOptions | undefined): void {
  configured = options
}

/**
 * Restituisce le opzioni impostate con {@link setPachiProfileEdit}.
 *
 * @returns opzioni, o `undefined` se non impostate (default: sola lettura)
 */
export function getPachiProfileEdit(): boolean | IPachiProfileEditOptions | undefined {
  return configured
}
