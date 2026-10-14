import type { IPachiProfileUser } from '../types/profile'

/** Funzione che restituisce l'utente corrente (letta a ogni render, quindi reattiva se legge uno store). */
export type PachiProfileUserGetter = () => IPachiProfileUser | null | undefined

let getter: PachiProfileUserGetter = () => null

/**
 * Imposta la sorgente dell'utente usata dalla route `/user/profile` del package (che non conosce l'auth
 * dell'app). Va chiamata una volta all'avvio, es. `setPachiProfileUser(() => authManager.userInfo)`.
 *
 * @param fn - funzione che restituisce l'utente corrente
 */
export function setPachiProfileUser(fn: PachiProfileUserGetter): void {
  getter = fn
}

/**
 * Utente corrente secondo la sorgente impostata.
 *
 * @returns l'utente, o `null`/`undefined` se non disponibile
 */
export function getPachiProfileUser(): IPachiProfileUser | null | undefined {
  return getter()
}
