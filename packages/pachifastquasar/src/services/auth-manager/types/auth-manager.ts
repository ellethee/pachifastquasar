export interface IToken {
  access_token: string
  token_type: string
  /** New refresh token (rotation: single-use, replaces the previous one); absent with rotation disabled. */
  refresh_token?: string
}
export interface ITokenResponse extends IToken {
  refresh_token: string
}
/** Response of `POST /api/auth/token` when the user has MFA enabled (the second step is required). */
export interface IMfaRequiredResponse {
  mfa_required: true
  /** Short-lived MFA challenge token (to be kept in memory only). */
  mfa_token: string
}
/** Outcome of `AuthManager.login`: `mfaRequired` true if the second step is missing (`verifyMfa`). */
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
  /** User UUID. */
  id: string
  /** Date (ISO 8601 UTC) of the email verification, `null` if not verified. */
  emailVerifiedAt?: string | null
  /** Date (ISO 8601 UTC) of the last access. */
  lastLoginAt?: string | null
  /** Date (ISO 8601 UTC) of the account creation. */
  createdAt?: string | null
  permissions: string[]
}
export interface IEngineInfo {
  serverType: string
  scope: 'production' | 'development' | 'local'
  host: string
  dbname: string
}
