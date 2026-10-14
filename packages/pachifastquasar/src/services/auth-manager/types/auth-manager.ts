export interface IToken {
  access_token: string
  token_type: string
  /** Nuovo refresh token (rotazione: monouso, sostituisce il precedente); assente con la rotazione disattivata. */
  refresh_token?: string
}
export interface ITokenResponse extends IToken {
  refresh_token: string
}
/** Risposta di `POST /api/auth/token` quando l'utente ha l'MFA attiva (serve il secondo step). */
export interface IMfaRequiredResponse {
  mfa_required: true
  /** Token di breve durata della sfida MFA (da tenere solo in memoria). */
  mfa_token: string
}
/** Esito di `AuthManager.login`: `mfaRequired` true se manca il secondo step (`verifyMfa`). */
export interface LoginResult {
  mfaRequired: boolean
}
export interface IUserInfo {
  username: string
  email: string | null
  firstName: string
  lastName: string
  isActive: boolean
  isStaff: boolean
  isSuperuser: boolean
  /** UUID dell'utente. */
  id: string
  /** Data (ISO 8601 UTC) della verifica dell'email, `null` se non verificata. */
  emailVerifiedAt?: string | null
  /** Data (ISO 8601 UTC) dell'ultimo accesso. */
  lastLoginAt?: string | null
  /** Data (ISO 8601 UTC) di creazione dell'account. */
  createdAt?: string | null
  permissions: string[]
}
export interface IEngineInfo {
  serverType: string
  scope: 'production' | 'development' | 'local'
  host: string
  dbname: string
}
