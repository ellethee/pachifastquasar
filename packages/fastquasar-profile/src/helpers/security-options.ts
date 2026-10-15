import type { IPachiProfileSecurityOptions } from '../types/security'

/** Resolved options: the two blocks are always booleans. */
export type IResolvedSecurityOptions = IPachiProfileSecurityOptions & { password: boolean, mfa: boolean }

/**
 * Normalizes the `security` prop: `true`/missing = password only; `false` = nothing; object = password enabled
 * unless `password: false`, MFA enabled only with `mfa: true`.
 *
 * @param input - prop value
 * @returns complete options for the blocks
 */
export function resolveSecurityOptions(input: boolean | IPachiProfileSecurityOptions | undefined): IResolvedSecurityOptions {
  if (input === false) return { password: false, mfa: false }
  if (input === undefined || input === true) return { password: true, mfa: false }
  return { ...input, password: input.password !== false, mfa: input.mfa === true }
}

let configured: boolean | IPachiProfileSecurityOptions | undefined

/**
 * Sets the Security section options used by the package's `/user/profile` route (`PachiProfileRoute`),
 * which has no props: call it once at app startup, for example `setPachiProfileSecurity({ mfa: true })`.
 *
 * @param options - same value as the `security` prop of `PachiProfilePage`
 */
export function setPachiProfileSecurity(options: boolean | IPachiProfileSecurityOptions | undefined): void {
  configured = options
}

/**
 * Returns the options set with {@link setPachiProfileSecurity}.
 *
 * @returns options, or `undefined` if not set (default: password change only)
 */
export function getPachiProfileSecurity(): boolean | IPachiProfileSecurityOptions | undefined {
  return configured
}
