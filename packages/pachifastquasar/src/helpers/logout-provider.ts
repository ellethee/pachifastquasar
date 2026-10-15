import { AuthManager } from '../services/auth-manager/auth-manager'

/** `provide`/`inject` key of the local logout (used by packages, e.g. `@ilpachi/fastquasar-profile`). */
export const PACHI_LOGOUT_KEY = 'pachiLogout'

/**
 * Local logout provided by `createPachiApp`: requests nothing from the backend (after a password change it has already
 * revoked everything), discards token and user, closes the WebSocket and goes to `/auth/login`.
 */
export type PachiLogout = () => Promise<void>

/**
 * Creates the {@link PachiLogout} function. The `AuthManager` is resolved lazily (on first use).
 *
 * @returns the local logout function (never throws)
 */
export function createPachiLogout(): PachiLogout {
  return async () => {
    try {
      await AuthManager.getInstance().logout(false)
    } catch {
      /* local logout: errors (e.g. navigation) do not matter to the caller */
    }
  }
}
