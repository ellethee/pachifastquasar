import { getPachiConfig } from '../core/config'
import { gravatarHash, gravatarUrl } from './gravatar-helper'

/** `provide`/`inject` key of the avatar resolver (used by packages, e.g. `@ilpachi/fastquasar-profile`). */
export const PACHI_AVATAR_URL_KEY = 'pachiAvatarUrl'

/**
 * Function returning the avatar URL of a user: `null` if there is none (Gravatar disabled,
 * empty email) and the caller must show the initials.
 *
 * @param email - user email
 * @param size - requested side in pixels (default 200)
 */
export type PachiAvatarResolver = (
  email: string | null | undefined,
  size?: number
) => Promise<string | null>

/**
 * Creates the shell avatar resolver: Gravatar only with `app.gravatar: true` (opt-in,
 * `QCLI_APP_GRAVATAR=true`; no external request by default). The configuration is read on every call.
 * `createPachiApp` provides it with `app.provide('pachiAvatarUrl', ...)`: packages that do not import
 * the shell receive it with `inject`.
 *
 * @returns the resolver
 */
export function createPachiAvatarResolver(): PachiAvatarResolver {
  return async (email, size = 200) => {
    if (getPachiConfig().app.gravatar !== true || !email) return null
    const hash = await gravatarHash(email)
    return hash ? gravatarUrl(hash, size) : null
  }
}
