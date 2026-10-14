/** Metodo MFA attivabile dal profilo. */
export type PachiMfaMethod = 'totp' | 'email' | 'sms'

/** Opzioni della sezione Sicurezza del profilo. */
export interface IPachiProfileSecurityOptions {
  /** Mostra il form di cambio password (default `true`). */
  password?: boolean
  /** Mostra il pannello MFA, se il backend la espone (`GET /api/mfa/status` 2xx). Default `false`. */
  mfa?: boolean
  /** Metodi MFA offerti per l'attivazione (default `['totp']`; email e SMS richiedono il canale di invio sul backend). */
  mfaMethods?: PachiMfaMethod[]
  /** Lunghezza minima della nuova password (default 12, aggiornata da `params.min_length` del 422). */
  minPasswordLength?: number
  /** Base URL delle API (default `/api`). */
  apiBase?: string
  /**
   * Chiamata dopo il cambio password riuscito (al posto del logout della shell `pachiLogout`). Va gestito il
   * logout locale e il nuovo login.
   */
  onPasswordChanged?: () => void | Promise<void>
}
