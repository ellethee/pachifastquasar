/** Dati dell'utente mostrati dalla pagina profilo. */
export interface IPachiProfileUser {
  id: number | string
  username: string
  email: string | null
  firstName: string
  lastName: string
  isActive?: boolean
  isStaff?: boolean
  isSuperuser?: boolean
  /** Data di verifica dell'email (ISO 8601 UTC), `null` se non verificata. */
  emailVerifiedAt?: string | null
  /** Data dell'ultimo accesso (ISO 8601 UTC). */
  lastLoginAt?: string | null
  /** Data di creazione dell'account (ISO 8601 UTC). */
  createdAt?: string | null
  /** Permessi dell'utente. */
  permissions?: string[]
  /** Dati aggiuntivi dell'utente (oggetto libero, backend pachifast 0.15.0+); nessuna UI lo usa. */
  profile?: Record<string, unknown>
}
