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

describe('parse delle risposte MFA', () => {
  it('stato', () => {
    expect(parseMfaStatus({ enabled: true, method: 'totp' })).toEqual({ enabled: true, method: 'totp' })
    expect(parseMfaStatus({ enabled: false, method: null })).toEqual({ enabled: false, method: null })
    expect(parseMfaStatus({})).toBeNull()
    expect(parseMfaStatus(null)).toBeNull()
  })
  it('setup TOTP (snake_case e camelCase)', () => {
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

describe('helper', () => {
  it('formatSecret raggruppa a 4', () => {
    expect(formatSecret('ABCDEFGHIJ')).toBe('ABCD EFGH IJ')
  })
  it('codice TOTP a 6 cifre', () => {
    expect(isValidTotpCode('123456')).toBe(true)
    expect(isValidTotpCode('12345')).toBe(false)
    expect(isValidTotpCode('123 456')).toBe(true)
    expect(normalizeTotpCode(' 123 456 ')).toBe('123456')
    expect(isValidTotpCode('12345a')).toBe(false)
  })
})

describe('classifyMfaError', () => {
  it('mappa codici e stati', () => {
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
  it('genera una matrice quadrata e un path SVG', async () => {
    const matrix = await buildQrMatrix('otpauth://totp/Test:user?secret=JBSWY3DPEHPK3PXP&issuer=Test')
    expect(matrix.length).toBeGreaterThanOrEqual(21)
    expect(matrix.every((r) => r.length === matrix.length)).toBe(true)
    const path = qrMatrixToPath(matrix)
    expect(path.startsWith('M')).toBe(true)
    expect(qrMatrixToPath([[true, false], [false, true]])).toBe('M0 0h1v1h-1zM1 1h1v1h-1z')
  })
})

describe('resolveSecurityOptions', () => {
  it('default: solo password', () => {
    expect(resolveSecurityOptions(undefined)).toEqual({ password: true, mfa: false })
    expect(resolveSecurityOptions(true)).toEqual({ password: true, mfa: false })
  })
  it('false nasconde tutto', () => {
    expect(resolveSecurityOptions(false)).toEqual({ password: false, mfa: false })
  })
  it('oggetto: password attiva salvo false, mfa solo se true', () => {
    expect(resolveSecurityOptions({ mfa: true, minPasswordLength: 8 })).toMatchObject({ password: true, mfa: true, minPasswordLength: 8 })
    expect(resolveSecurityOptions({ password: false })).toMatchObject({ password: false, mfa: false })
  })
})

describe('MFA via email in due passi (pachifast 0.7.1)', () => {
  const err = (status: number, code: string) => item(code, status) as never

  it('classifica i nuovi codici di errore', () => {
    expect(classifyMfaError(err(400, 'mfa.email_code_invalid'))).toBe('codeInvalid')
    expect(classifyMfaError(err(400, 'mfa.no_email_setup'))).toBe('noEmailSetup')
    expect(classifyMfaError(err(403, 'mfa.disabled'))).toBe('mfaDisabled')
  })
  it('emailSetupNeedsConfirm riconosce confirm_required (e non il setup vecchio con i backup code)', () => {
    expect(emailSetupNeedsConfirm({ ok: true, method: 'email', confirm_required: true })).toBe(true)
    expect(emailSetupNeedsConfirm({ ok: true, method: 'email', backup_codes: ['a'] })).toBe(false)
    expect(emailSetupNeedsConfirm(null)).toBe(false)
  })
})

describe('MFA via SMS', () => {
  it('riconosce la conferma richiesta', () => {
    expect(smsSetupNeedsConfirm({ confirm_required: true })).toBe(true)
    expect(smsSetupNeedsConfirm({ backup_codes: ['a'] })).toBe(false)
    expect(smsSetupNeedsConfirm(null)).toBe(false)
  })
  it('classifica gli errori SMS', () => {
    expect(classifyMfaError(item('mfa.sms_code_invalid', 400))).toBe('codeInvalid')
    expect(classifyMfaError(item('mfa.no_sms_setup', 400))).toBe('noSmsSetup')
    expect(classifyMfaError(item('mfa.disabled', 403))).toBe('mfaDisabled')
  })
  it('normalizza e valida il numero di telefono', () => {
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
