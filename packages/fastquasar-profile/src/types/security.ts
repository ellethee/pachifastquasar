/** MFA method that can be enabled from the profile. */
export type PachiMfaMethod = 'totp' | 'email' | 'sms'

/** Options of the profile Security section. */
export interface IPachiProfileSecurityOptions {
  /** Shows the change-password form (default `true`). */
  password?: boolean
  /** Shows the MFA panel, if the backend exposes it (`GET /api/mfa/status` 2xx). Default `false`. */
  mfa?: boolean
  /** MFA methods offered for activation (default `['totp']`; email and SMS require the sending channel on the backend). */
  mfaMethods?: PachiMfaMethod[]
  /** Minimum length of the new password (default 12, updated from the 422 `params.min_length`). */
  minPasswordLength?: number
  /** API base URL (default `/api`). */
  apiBase?: string
  /**
   * Called after a successful password change (instead of the shell's `pachiLogout` logout). The local
   * logout and the new login must be handled.
   */
  onPasswordChanged?: () => void | Promise<void>
}
