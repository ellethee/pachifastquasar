import { describe, expect, it } from 'vitest'
import {
  buildQrMatrix,
  classifyMfaError,
  emailSetupNeedsConfirm,
  formatSecret,
  isValidPhoneNumber,
  isValidTotpCode,
  normalizePhoneNumber,
  normalizeTotpCode,
  parseBackupCodes,
  parseMfaStatus,
  parseTotpSetup,
  qrMatrixToPath,
  smsSetupNeedsConfirm,
} from '../src/helpers/mfa'
import { resolveSecurityOptions } from '../src/helpers/security-options'

const item = (code: string, status: number) => ({ status, items: [{ code }] })

describe('parsing of MFA responses', () => {
  it('status', () => {
    expect(parseMfaStatus({ enabled: true, method: 'totp' })).toEqual({ enabled: true, method: 'totp' })
    expect(parseMfaStatus({ enabled: false, method: null })).toEqual({ enabled: false, method: null })
    expect(parseMfaStatus({})).toBeNull()
    expect(parseMfaStatus(null)).toBeNull()
  })
  it('TOTP setup (snake_case and camelCase)', () => {
    const snake = { secret: 'ABCD', otpauth_uri: 'otpauth://totp/x?secret=ABCD', backup_codes: ['a', 'b'] }
    expect(parseTotpSetup(snake)).toEqual({ secret: 'ABCD', otpauthUri: snake.otpauth_uri, backupCodes: ['a', 'b'] })
    expect(parseTotpSetup({ secret: 'A', otpauthUri: 'u' })?.backupCodes).toEqual([])
    expect(parseTotpSetup({ secret: 'A' })).toBeNull()
  })
  it('backup codes', () => {
    expect(parseBackupCodes({ backup_codes: ['x', 1, 'y'] })).toEqual(['x', 'y'])
    expect(parseBackupCodes(undefined)).toEqual([])
  })
})

describe('helpers', () => {
  it('formatSecret groups by 4', () => {
    expect(formatSecret('ABCDEFGHIJ')).toBe('ABCD EFGH IJ')
  })
  it('6-digit TOTP code', () => {
    expect(isValidTotpCode('123456')).toBe(true)
    expect(isValidTotpCode('12345')).toBe(false)
    expect(isValidTotpCode('123 456')).toBe(true)
    expect(normalizeTotpCode(' 123 456 ')).toBe('123456')
    expect(isValidTotpCode('12345a')).toBe(false)
  })
})

describe('classifyMfaError', () => {
  it('maps codes and statuses', () => {
    expect(classifyMfaError(item('mfa.already_enabled', 409))).toBe('alreadyEnabled')
    expect(classifyMfaError(item('mfa.code_invalid', 401))).toBe('codeInvalid')
    expect(classifyMfaError(item('mfa.totp_invalid', 400))).toBe('codeInvalid')
    expect(classifyMfaError(item('mfa.too_many_attempts', 429))).toBe('tooManyAttempts')
    expect(classifyMfaError({ status: 429, items: [] })).toBe('tooManyAttempts')
    expect(classifyMfaError(item('mfa.password_incorrect', 400))).toBe('passwordIncorrect')
    expect(classifyMfaError({ status: 500, items: [] })).toBe('other')
  })
})

describe('QR code', () => {
  it('builds a square matrix and an SVG path', async () => {
    const matrix = await buildQrMatrix('otpauth://totp/Test:user?secret=JBSWY3DPEHPK3PXP&issuer=Test')
    expect(matrix.length).toBeGreaterThanOrEqual(21)
    expect(matrix.every((r) => r.length === matrix.length)).toBe(true)
    const path = qrMatrixToPath(matrix)
    expect(path.startsWith('M')).toBe(true)
    expect(qrMatrixToPath([[true, false], [false, true]])).toBe('M0 0h1v1h-1zM1 1h1v1h-1z')
  })
})

describe('resolveSecurityOptions', () => {
  it('default: password only', () => {
    expect(resolveSecurityOptions(undefined)).toEqual({ password: true, mfa: false })
    expect(resolveSecurityOptions(true)).toEqual({ password: true, mfa: false })
  })
  it('false hides everything', () => {
    expect(resolveSecurityOptions(false)).toEqual({ password: false, mfa: false })
  })
  it('object: password on unless false, mfa only if true', () => {
    expect(resolveSecurityOptions({ mfa: true, minPasswordLength: 8 })).toMatchObject({ password: true, mfa: true, minPasswordLength: 8 })
    expect(resolveSecurityOptions({ password: false })).toMatchObject({ password: false, mfa: false })
  })
})

describe('email MFA in two steps (pachifast 0.7.1)', () => {
  const err = (status: number, code: string) => item(code, status) as never

  it('classifies the new error codes', () => {
    expect(classifyMfaError(err(400, 'mfa.email_code_invalid'))).toBe('codeInvalid')
    expect(classifyMfaError(err(400, 'mfa.no_email_setup'))).toBe('noEmailSetup')
    expect(classifyMfaError(err(403, 'mfa.disabled'))).toBe('mfaDisabled')
  })
  it('emailSetupNeedsConfirm recognizes confirm_required (and not the old setup with backup codes)', () => {
    expect(emailSetupNeedsConfirm({ ok: true, method: 'email', confirm_required: true })).toBe(true)
    expect(emailSetupNeedsConfirm({ ok: true, method: 'email', backup_codes: ['a'] })).toBe(false)
    expect(emailSetupNeedsConfirm(null)).toBe(false)
  })
})

describe('SMS MFA', () => {
  it('recognizes the required confirmation', () => {
    expect(smsSetupNeedsConfirm({ confirm_required: true })).toBe(true)
    expect(smsSetupNeedsConfirm({ backup_codes: ['a'] })).toBe(false)
    expect(smsSetupNeedsConfirm(null)).toBe(false)
  })
  it('classifies SMS errors', () => {
    expect(classifyMfaError(item('mfa.sms_code_invalid', 400))).toBe('codeInvalid')
    expect(classifyMfaError(item('mfa.no_sms_setup', 400))).toBe('noSmsSetup')
    expect(classifyMfaError(item('mfa.disabled', 403))).toBe('mfaDisabled')
  })
  it('normalizes and validates the phone number', () => {
    expect(normalizePhoneNumber('+39 333-123 4567')).toBe('+393331234567')
    expect(isValidPhoneNumber('+39 333 123 4567')).toBe(true)
    expect(isValidPhoneNumber('3331234567')).toBe(false)
    expect(isValidPhoneNumber('0039 333 123 4567')).toBe(false)
    expect(normalizePhoneNumber('3331234567')).toBe('3331234567')
    expect(isValidPhoneNumber('+12345')).toBe(false)
    expect(isValidPhoneNumber('abc')).toBe(false)
    expect(isValidPhoneNumber('+1234567890123456')).toBe(false)
  })
})
