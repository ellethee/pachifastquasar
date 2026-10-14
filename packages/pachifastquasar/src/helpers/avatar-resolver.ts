import { getPachiConfig } from '../core/config'
import { gravatarHash, gravatarUrl } from './gravatar-helper'

/** Chiave `provide`/`inject` del resolver dell'avatar (la usano i package, es. `@ilpachi/fastquasar-profile`). */
export const PACHI_AVATAR_URL_KEY = 'pachiAvatarUrl'

/**
 * Funzione che restituisce l'URL dell'avatar di un utente: `null` se non c'è (Gravatar disattivato,
 * email vuota) e il chiamante deve mostrare le iniziali.
 *
 * @param email - email dell'utente
 * @param size - lato in pixel richiesto (default 200)
 */
export type PachiAvatarResolver = (
  email: string | null | undefined,
  size?: number
) => Promise<string | null>

/**
 * Crea il resolver dell'avatar della shell: Gravatar solo con `app.gravatar: true` (opt-in,
 * `QCLI_APP_GRAVATAR=true`; di default nessuna richiesta esterna). La configurazione è letta a ogni chiamata.
 * `createPachiApp` lo fornisce con `app.provide('pachiAvatarUrl', ...)`: i package che non importano
 * la shell lo ricevono con `inject`.
 *
 * @returns il resolver
 */
export function createPachiAvatarResolver(): PachiAvatarResolver {
  return async (email, size = 200) => {
    if (getPachiConfig().app.gravatar !== true || !email) return null
    const hash = await gravatarHash(email)
    return hash ? gravatarUrl(hash, size) : null
  }
}
