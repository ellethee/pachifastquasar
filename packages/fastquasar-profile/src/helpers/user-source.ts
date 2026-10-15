import type { IPachiProfileUser } from '../types/profile'

/** Function returning the current user (read on every render, so reactive if it reads a store). */
export type PachiProfileUserGetter = () => IPachiProfileUser | null | undefined

let getter: PachiProfileUserGetter = () => null

/**
 * Sets the user source used by the package's `/user/profile` route (which does not know the app's
 * auth). Call it once at startup, e.g. `setPachiProfileUser(() => authManager.userInfo)`.
 *
 * @param fn - function returning the current user
 */
export function setPachiProfileUser(fn: PachiProfileUserGetter): void {
  getter = fn
}

/**
 * Current user according to the configured source.
 *
 * @returns the user, or `null`/`undefined` if unavailable
 */
export function getPachiProfileUser(): IPachiProfileUser | null | undefined {
  return getter()
}
