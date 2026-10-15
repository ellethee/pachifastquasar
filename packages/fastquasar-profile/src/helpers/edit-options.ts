import { DEFAULT_API_BASE } from './http'
import type { IPachiProfileEditOptions } from '../types/edit'

/** Resolved profile edit options. */
export type IResolvedEditOptions = IPachiProfileEditOptions & { enabled: boolean, apiBase: string }

/**
 * Normalizes the `editable` prop: `true` = editing enabled with defaults; object = enabled unless `enabled: false`;
 * `false`/missing = read-only.
 *
 * @param input - prop value
 * @returns complete options
 */
export function resolveEditOptions(input: boolean | IPachiProfileEditOptions | undefined): IResolvedEditOptions {
  if (input === undefined || input === false) return { enabled: false, apiBase: DEFAULT_API_BASE }
  if (input === true) return { enabled: true, apiBase: DEFAULT_API_BASE }
  return { ...input, enabled: input.enabled !== false, apiBase: input.apiBase ?? DEFAULT_API_BASE }
}

let configured: boolean | IPachiProfileEditOptions | undefined

/**
 * Sets the edit options used by the package's `/user/profile` route (`PachiProfileRoute`), which has no
 * props: call it once at startup, for example `setPachiProfileEdit({ onUpdated: () => authManager.refreshUserInfo() })`.
 *
 * @param options - same value as the `editable` prop of `PachiProfilePage`
 */
export function setPachiProfileEdit(options: boolean | IPachiProfileEditOptions | undefined): void {
  configured = options
}

/**
 * Returns the options set with {@link setPachiProfileEdit}.
 *
 * @returns options, or `undefined` if not set (default: read-only)
 */
export function getPachiProfileEdit(): boolean | IPachiProfileEditOptions | undefined {
  return configured
}
