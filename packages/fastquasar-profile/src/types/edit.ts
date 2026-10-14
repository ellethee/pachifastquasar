import type { IPachiProfileUser } from './profile'

/** Opzioni della modifica del profilo (`PATCH /auth/user`). */
export interface IPachiProfileEditOptions {
  /** `false` nasconde la modifica anche con un oggetto di opzioni (default `true`). */
  enabled?: boolean
  /** Base URL delle API (default `/api`). */
  apiBase?: string
  /**
   * Chiamata dopo il salvataggio, con l'utente restituito dal backend: serve ad aggiornare la copia dell'app,
   * ad esempio `() => authManager.refreshUserInfo()`.
   */
  onUpdated?: (user: IPachiProfileUser) => void | Promise<void>
}
