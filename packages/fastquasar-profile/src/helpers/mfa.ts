import type { IPachiApiError } from './api-error'
import { primaryItem } from './api-error'

/** Stato MFA (`GET /api/mfa/status`). */
export interface IMfaStatus {
  enabled: boolean
  /** `totp`, `email`, `sms` o `null`. */
  method: string | null
}

/** Dati del setup TOTP (`POST /api/mfa/totp/setup`). */
export interface ITotpSetup {
  secret: string
  otpauthUri: string
  backupCodes: string[]
}

/**
 * Legge un campo da un oggetto accettando snake_case e camelCase.
 *
 * @param rec - oggetto sorgente
 * @param snake - nome snake_case
 * @param camel - nome camelCase
 */
function pick(rec: Record<string, unknown>, snake: string, camel: string): unknown {
  return rec[snake] ?? rec[camel]
}

/**
 * Normalizza la risposta di stato; `null` se non ha la forma attesa.
 *
 * @param body - risposta (envelope già scartato dal client)
 */
export function parseMfaStatus(body: unknown): IMfaStatus | null {
  if (body === null || typeof body !== 'object') return null
  const rec = body as Record<string, unknown>
  if (typeof rec.enabled !== 'boolean') return null
  return { enabled: rec.enabled, method: typeof rec.method === 'string' ? rec.method : null }
}

/**
 * Estrae i backup code da una risposta (`backup_codes`), scartando valori non stringa.
 *
 * @param body - risposta del backend
 * @returns elenco dei codici (vuoto se assenti)
 */
export function parseBackupCodes(body: unknown): string[] {
  if (body === null || typeof body !== 'object') return []
  const raw = pick(body as Record<string, unknown>, 'backup_codes', 'backupCodes')
  return Array.isArray(raw) ? raw.filter((c): c is string => typeof c === 'string') : []
}

/**
 * Normalizza la risposta del setup TOTP; `null` se mancano `secret` o `otpauth_uri`.
 *
 * @param body - risposta del backend
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
 * Raggruppa il secret in blocchi da 4 caratteri per la lettura (es. `ABCD EFGH`).
 *
 * @param secret - secret base32
 */
export function formatSecret(secret: string): string {
  return secret.replace(/\s+/g, '').replace(/(.{4})/g, '$1 ').trim()
}

/**
 * Toglie gli spazi dal codice digitato o incollato (le app di autenticazione lo mostrano come "123 456").
 *
 * @param code - codice digitato
 * @returns il codice senza spazi
 */
export function normalizeTotpCode(code: string): string {
  return code.replace(/\s+/g, '')
}

/**
 * `true` se il codice ha 6 cifre (spazi ignorati).
 *
 * @param code - codice digitato
 */
export function isValidTotpCode(code: string): boolean {
  return /^\d{6}$/.test(normalizeTotpCode(code))
}

/** Esito sintetico di un errore MFA, per scegliere avvisi e azioni. */
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
 * Classifica un errore MFA per codice e stato HTTP (429 senza codice = troppi tentativi).
 * `mfa.code_invalid`, `mfa.totp_invalid`, `mfa.email_code_invalid` e `mfa.sms_code_invalid` sono tutti «codice errato»;
 * `mfa.no_email_setup`/`mfa.no_sms_setup` = nessun setup in corso (scaduto), `mfa.disabled` = MFA spenta sul server.
 *
 * @param error - errore normalizzato
 * @returns la categoria
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
 * Celle scure della matrice del QR code per `text` (correzione errori M), in righe di booleani.
 *
 * @param text - contenuto da codificare (es. URI `otpauth://`)
 * @returns promessa della matrice quadrata `modules[riga][colonna]`
 */
export async function buildQrMatrix(text: string): Promise<boolean[][]> {
  // import dinamico: la libreria finisce in un chunk separato, caricato solo quando serve il QR
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
 * Percorso SVG (`d`) che disegna le celle scure della matrice (un quadrato 1x1 per cella).
 *
 * @param matrix - matrice da {@link buildQrMatrix}
 * @returns stringa per l'attributo `d` di un `<path>`
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
 * `true` se la risposta di `POST /mfa/email/setup` chiede la conferma con il codice ricevuto per email (backend
 * 0.7.1+: `confirm_required: true`; prima il setup attivava subito il metodo e restituiva i backup code).
 *
 * @param body - corpo della risposta (già senza envelope)
 */
export function emailSetupNeedsConfirm(body: unknown): boolean {
  return body !== null && typeof body === 'object' && (body as { confirm_required?: unknown }).confirm_required === true
}

/**
 * `true` se la risposta di `POST /mfa/sms/setup` chiede la conferma con il codice ricevuto via SMS
 * (backend 0.7.2+: `confirm_required: true`).
 *
 * @param body - corpo della risposta (già senza envelope)
 */
export function smsSetupNeedsConfirm(body: unknown): boolean {
  return body !== null && typeof body === 'object' && (body as { confirm_required?: unknown }).confirm_required === true
}

/**
 * Normalizza un numero di telefono digitato: toglie spazi, trattini, punti e parentesi (il `+` iniziale resta; non ne aggiunge uno mancante).
 *
 * @param phone - numero digitato
 * @returns numero senza separatori
 */
export function normalizePhoneNumber(phone: string): string {
  return phone.replace(/[\s\-.()]+/g, '')
}

/**
 * `true` se il numero, normalizzato, è in formato internazionale: `+` iniziale obbligatorio (il backend 0.15.0 risponde
 * 422 senza) seguito da 7-15 cifre.
 *
 * @param phone - numero digitato
 */
export function isValidPhoneNumber(phone: string): boolean {
  return /^\+\d{7,15}$/.test(normalizePhoneNumber(phone))
}
