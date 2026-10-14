import { AuthManager } from '../services/auth-manager/auth-manager'

/** Chiave `provide`/`inject` del logout locale (la usano i package, es. `@ilpachi/fastquasar-profile`). */
export const PACHI_LOGOUT_KEY = 'pachiLogout'

/**
 * Logout locale fornito da `createPachiApp`: non richiede nulla al backend (dopo un cambio password ha già
 * revocato tutto), scarta token e utente, chiude il WebSocket e porta a `/auth/login`.
 */
export type PachiLogout = () => Promise<void>

/**
 * Crea la funzione {@link PachiLogout}. L'`AuthManager` è risolto in modo pigro (al primo uso).
 *
 * @returns la funzione di logout locale (non lancia mai)
 */
export function createPachiLogout(): PachiLogout {
  return async () => {
    try {
      await AuthManager.getInstance().logout(false)
    } catch {
      /* logout locale: gli errori (es. navigazione) non interessano al chiamante */
    }
  }
}
