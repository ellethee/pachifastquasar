import type { IPachiApiError } from './api-error'
import { primaryItem } from './api-error'

/** MFA status (`GET /api/mfa/status`). */
export interface IMfaStatus {
  enabled: boolean
  /** `totp`, `email`, `sms` or `null`. */
  method: string | null
}

/** TOTP setup data (`POST /api/mfa/totp/setup`). */
export interface ITotpSetup {
  secret: string
  otpauthUri: string
  backupCodes: string[]
}

/**
 * Reads a field from an object accepting both snake_case and camelCase.
 *
 * @param rec - source object
 * @param snake - snake_case name
 * @param camel - camelCase name
 */
function pick(rec: Record<string, unknown>, snake: string, camel: string): unknown {
  return rec[snake] ?? rec[camel]
}

/**
 * Normalizes the status response; `null` if it does not have the expected shape.
 *
 * @param body - response (envelope already discarded by the client)
 */
export function parseMfaStatus(body: unknown): IMfaStatus | null {
  if (body === null || typeof body !== 'object') return null
  const rec = body as Record<string, unknown>
  if (typeof rec.enabled !== 'boolean') return null
  return { enabled: rec.enabled, method: typeof rec.method === 'string' ? rec.method : null }
}

/**
 * Extracts the backup codes from a response (`backup_codes`), discarding non-string values.
 *
 * @param body - backend response
 * @returns list of codes (empty if absent)
 */
export function parseBackupCodes(body: unknown): string[] {
  if (body === null || typeof body !== 'object') return []
  const raw = pick(body as Record<string, unknown>, 'backup_codes', 'backupCodes')
  return Array.isArray(raw) ? raw.filter((c): c is string => typeof c === 'string') : []
}

/**
 * Normalizes the TOTP setup response; `null` if `secret` or `otpauth_uri` is missing.
 *
 * @param body - backend response
 */
export function parseTotpSetup(body: unknown): ITotpSetup | null {
  if (body === null || typeof body !== 'object') return null
  const rec = body as Record<string, unknown>
  const secret = rec.secret
  const uri = pick(rec, 'otpauth_uri', 'otpauthUri')
  if (typeof secret !== 'string' || typeof uri !== 'string') return null
  return { secret, otpauthUri: uri, backupCodes: parseBackupCodes(body) }
}

/**
 * Groups the secret in 4-character blocks for readability (e.g. `ABCD EFGH`).
 *
 * @param secret - base32 secret
 */
export function formatSecret(secret: string): string {
  return secret.replace(/\s+/g, '').replace(/(.{4})/g, '$1 ').trim()
}

/**
 * Strips the spaces from the typed or pasted code (authenticator apps show it as "123 456").
 *
 * @param code - typed code
 * @returns the code without spaces
 */
export function normalizeTotpCode(code: string): string {
  return code.replace(/\s+/g, '')
}

/**
 * `true` if the code has 6 digits (spaces ignored).
 *
 * @param code - typed code
 */
export function isValidTotpCode(code: string): boolean {
  return /^\d{6}$/.test(normalizeTotpCode(code))
}

/** Summary outcome of an MFA error, used to choose notices and actions. */
export type MfaErrorKind =
  | 'alreadyEnabled'
  | 'codeInvalid'
  | 'noEmailSetup'
  | 'noSmsSetup'
  | 'mfaDisabled'
  | 'tooManyAttempts'
  | 'passwordIncorrect'
  | 'other'

/**
 * Classifies an MFA error by code and HTTP status (429 without a code = too many attempts).
 * `mfa.code_invalid`, `mfa.totp_invalid`, `mfa.email_code_invalid` and `mfa.sms_code_invalid` are all "wrong code";
 * `mfa.no_email_setup`/`mfa.no_sms_setup` = no setup in progress (expired), `mfa.disabled` = MFA turned off on the server.
 *
 * @param error - normalized error
 * @returns the category
 */
export function classifyMfaError(error: IPachiApiError): MfaErrorKind {
  const code = primaryItem(error)?.code
  if (code === 'mfa.already_enabled' || (!code && error.status === 409)) return 'alreadyEnabled'
  if (code === 'mfa.code_invalid' || code === 'mfa.totp_invalid' || code === 'mfa.email_code_invalid' || code === 'mfa.sms_code_invalid') return 'codeInvalid'
  if (code === 'mfa.no_email_setup') return 'noEmailSetup'
  if (code === 'mfa.no_sms_setup') return 'noSmsSetup'
  if (code === 'mfa.disabled') return 'mfaDisabled'
  if (code === 'mfa.too_many_attempts' || error.status === 429) return 'tooManyAttempts'
  if (code === 'mfa.password_incorrect') return 'passwordIncorrect'
  return 'other'
}

/**
 * Dark cells of the QR code matrix for `text` (error correction M), as rows of booleans.
 *
 * @param text - content to encode (e.g. an `otpauth://` URI)
 * @returns promise of the square matrix `modules[row][column]`
 */
export async function buildQrMatrix(text: string): Promise<boolean[][]> {
  // dynamic import: the library ends up in a separate chunk, loaded only when the QR is needed
  const { default: qrcode } = await import('qrcode-generator')
  const qr = qrcode(0, 'M')
  qr.addData(text)
  qr.make()
  const size = qr.getModuleCount()
  const rows: boolean[][] = []
  for (let r = 0; r < size; r++) {
    const row: boolean[] = []
    for (let c = 0; c < size; c++) row.push(qr.isDark(r, c))
    rows.push(row)
  }
  return rows
}

/**
 * SVG path (`d`) drawing the dark cells of the matrix (a 1x1 square per cell).
 *
 * @param matrix - matrix from {@link buildQrMatrix}
 * @returns string for the `d` attribute of a `<path>`
 */
export function qrMatrixToPath(matrix: boolean[][]): string {
  let d = ''
  matrix.forEach((row, r) => {
    row.forEach((dark, c) => {
      if (dark) d += `M${c} ${r}h1v1h-1z`
    })
  })
  return d
}

/**
 * `true` if the `POST /mfa/email/setup` response asks for confirmation with the code received by email (backend
 * 0.7.1+: `confirm_required: true`; before that the setup activated the method immediately and returned the backup codes).
 *
 * @param body - response body (already without envelope)
 */
export function emailSetupNeedsConfirm(body: unknown): boolean {
  return body !== null && typeof body === 'object' && (body as { confirm_required?: unknown }).confirm_required === true
}

/**
 * `true` if the `POST /mfa/sms/setup` response asks for confirmation with the code received by SMS
 * (backend 0.7.2+: `confirm_required: true`).
 *
 * @param body - response body (already without envelope)
 */
export function smsSetupNeedsConfirm(body: unknown): boolean {
  return body !== null && typeof body === 'object' && (body as { confirm_required?: unknown }).confirm_required === true
}

/**
 * Normalizes a typed phone number: strips spaces, hyphens, dots and parentheses (a leading `+` stays; a missing one is not added).
 *
 * @param phone - typed number
 * @returns number without separators
 */
export function normalizePhoneNumber(phone: string): string {
  return phone.replace(/[\s\-.()]+/g, '')
}

/**
 * `true` if the normalized number is in international format: leading `+` required (backend 0.15.0 answers
 * 422 without it) followed by 7-15 digits.
 *
 * @param phone - typed number
 */
export function isValidPhoneNumber(phone: string): boolean {
  return /^\+\d{7,15}$/.test(normalizePhoneNumber(phone))
}
