import type { IPachiProfileSecurityOptions } from '../types/security'

/** Opzioni risolte: i due blocchi sono sempre booleani. */
export type IResolvedSecurityOptions = IPachiProfileSecurityOptions & { password: boolean, mfa: boolean }

/**
 * Normalizza la prop `security`: `true`/assente = solo password; `false` = niente; oggetto = password attiva
 * salvo `password: false`, MFA attiva solo con `mfa: true`.
 *
 * @param input - valore della prop
 * @returns opzioni complete per i blocchi
 */
export function resolveSecurityOptions(input: boolean | IPachiProfileSecurityOptions | undefined): IResolvedSecurityOptions {
  if (input === false) return { password: false, mfa: false }
  if (input === undefined || input === true) return { password: true, mfa: false }
  return { ...input, password: input.password !== false, mfa: input.mfa === true }
}

let configured: boolean | IPachiProfileSecurityOptions | undefined

/**
 * Imposta le opzioni della sezione Sicurezza usate dalla route `/user/profile` del package (`PachiProfileRoute`),
 * che non ha props: da chiamare una volta all'avvio dell'app, ad esempio `setPachiProfileSecurity({ mfa: true })`.
 *
 * @param options - stesso valore della prop `security` di `PachiProfilePage`
 */
export function setPachiProfileSecurity(options: boolean | IPachiProfileSecurityOptions | undefined): void {
  configured = options
}

/**
 * Restituisce le opzioni impostate con {@link setPachiProfileSecurity}.
 *
 * @returns opzioni, o `undefined` se non impostate (default: solo cambio password)
 */
export function getPachiProfileSecurity(): boolean | IPachiProfileSecurityOptions | undefined {
  return configured
}
