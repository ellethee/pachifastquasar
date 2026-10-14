import type { AdminRow, IAdminField, IAdminSchema } from '../types/admin'

/** Modalità del form. */
export type AdminFormMode = 'create' | 'edit'

/** Codice di un errore di validazione lato client. */
export type AdminClientError = 'required' | 'invalidJson' | 'invalidNumber' | 'invalidDate'

/** Valori del form per nome di campo. */
export type AdminFormValues = Record<string, unknown>

/** Risultato di {@link buildPayload}. */
export interface IAdminPayloadResult {
  /** Corpo da inviare (solo i campi scrivibili; in modifica solo quelli cambiati). */
  payload: Record<string, unknown>
  /** Errori per campo (vuoto se il form è valido). */
  errors: Record<string, AdminClientError>
}

/**
 * Campi mostrati dal form. In creazione solo quelli scrivibili (niente chiave primaria né `readonly`); in
 * modifica tutti, nell'ordine dello schema (i `readonly` sono disabilitati).
 *
 * @param schema - schema del modello
 * @param mode - creazione o modifica
 * @returns nomi dei campi
 */
export function formFieldNames(schema: IAdminSchema, mode: AdminFormMode): string[] {
  return Object.entries(schema.fields)
    .filter(([, field]) => mode === 'edit' || (!field.readonly && !field.primaryKey))
    .map(([name]) => name)
}

/**
 * Indica se un campo è modificabile (scrivibile).
 *
 * @param field - campo dello schema
 */
export function isWritable(field: IAdminField): boolean {
  return !field.readonly && !field.primaryKey
}

/** Due cifre. */
function two(n: number): string {
  return String(n).padStart(2, '0')
}

/**
 * Da ISO 8601 a valore di `<input type="datetime-local">` (ora locale, senza secondi).
 *
 * @param iso - data/ora ISO
 * @returns `YYYY-MM-DDTHH:mm`, o `''` se non valida
 */
export function isoToLocalInput(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())}T${two(date.getHours())}:${two(date.getMinutes())}`
}

/**
 * Da valore di `<input type="datetime-local">` (ora locale) a ISO 8601 UTC.
 *
 * @param local - `YYYY-MM-DDTHH:mm[:ss]`
 * @returns stringa ISO, o `null` se non valida
 */
export function localInputToIso(local: string): string | null {
  const date = new Date(local)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

/**
 * Valore del form per un valore della riga (o per il `default` dello schema).
 *
 * @param field - campo dello schema
 * @param raw - valore grezzo del backend
 * @returns valore per il controllo
 */
export function toFormValue(field: IAdminField, raw: unknown): unknown {
  if (field.component === 'json' || field.type === 'json') {
    return raw === null || raw === undefined ? '' : JSON.stringify(raw, null, 2)
  }
  if (field.type === 'datetime') return typeof raw === 'string' ? isoToLocalInput(raw) : null
  if (field.type === 'boolean') return raw === null || raw === undefined ? (field.nullable ? null : false) : Boolean(raw)
  if (raw === undefined) return null
  // un Decimal arriva come stringa: il controllo numerico lavora con numeri o testo
  return raw
}

/**
 * Valori iniziali del form: la riga (modifica) oppure i `default` dello schema (creazione).
 *
 * @param schema - schema del modello
 * @param row - riga da modificare; assente in creazione
 * @returns un valore per ogni campo
 */
export function initialFormValues(schema: IAdminSchema, row?: AdminRow | null): AdminFormValues {
  const values: AdminFormValues = {}
  for (const [name, field] of Object.entries(schema.fields)) {
    values[name] = toFormValue(field, row ? row[name] : field.default)
  }
  return values
}

/** `''`, `null` e `undefined` sono tutti "vuoto". */
function isEmpty(value: unknown): boolean {
  return value === null || value === undefined || value === ''
}

/**
 * Confronto tra due valori di form (vuoto = vuoto; oggetti per contenuto).
 *
 * @param a - primo valore
 * @param b - secondo valore
 */
export function sameFormValue(a: unknown, b: unknown): boolean {
  if (isEmpty(a) && isEmpty(b)) return true
  if (Object.is(a, b)) return true
  if (typeof a === 'number' && typeof b === 'string') return String(a) === b
  if (typeof a === 'string' && typeof b === 'number') return a === String(b)
  return JSON.stringify(a) === JSON.stringify(b)
}

/** Conversione di un valore del form. */
interface IConversion {
  value?: unknown
  error?: AdminClientError
}

/**
 * Da valore del form a valore da inviare al backend.
 *
 * @param field - campo dello schema
 * @param value - valore del controllo
 * @param original - valore originale della riga (un Decimal originale stringa si rimanda come stringa)
 * @returns il valore o un errore di validazione
 */
export function fromFormValue(field: IAdminField, value: unknown, original?: unknown): IConversion {
  if (field.component === 'json' || field.type === 'json') {
    if (typeof value !== 'string' || value.trim() === '') return { value: null }
    try {
      return { value: JSON.parse(value) as unknown }
    } catch {
      return { error: 'invalidJson' }
    }
  }
  // la chiave esterna è int, uuid o stringa secondo il modello collegato: si rimanda com'è
  if (field.component === 'lookup') return { value: isEmpty(value) ? null : value }
  switch (field.type) {
    case 'integer':
    case 'number': {
      // solo spazi = vuoto (Number('  ') varrebbe 0)
      if (isEmpty(value) || (typeof value === 'string' && value.trim() === '')) return { value: null }
      const n = typeof value === 'number' ? value : Number(String(value).replace(',', '.'))
      if (!Number.isFinite(n)) return { error: 'invalidNumber' }
      if (field.type === 'integer' && !Number.isInteger(n)) return { error: 'invalidNumber' }
      // interi oltre 2^53: come numero perderebbero cifre, si inviano come stringa (il backend la converte)
      if (field.type === 'integer' && typeof value === 'string' && !Number.isSafeInteger(n) && /^-?\d+$/.test(value.trim())) {
        return { value: value.trim() }
      }
      return { value: typeof original === 'string' ? String(value).trim().replace(',', '.') : n }
    }
    case 'boolean':
      return { value: value === null || value === undefined ? null : Boolean(value) }
    case 'datetime': {
      if (isEmpty(value)) return { value: null }
      const iso = localInputToIso(String(value))
      return iso ? { value: iso } : { error: 'invalidDate' }
    }
    case 'date':
    case 'time':
      return { value: isEmpty(value) ? null : value }
    default:
      if (value === '') return { value: field.nullable ? null : '' }
      return { value: value === undefined ? null : value }
  }
}

/**
 * Costruisce il corpo di creazione o di modifica.
 *
 * - le chiavi `readonly` e la chiave primaria non si inviano mai;
 * - creazione: i campi vuoti sono omessi (vale il default del backend); un campo `required` vuoto è un errore;
 * - modifica (PATCH): solo i campi cambiati rispetto ai valori iniziali.
 *
 * @param schema - schema del modello
 * @param values - valori correnti del form
 * @param mode - creazione o modifica
 * @param initial - valori iniziali del form (modifica)
 * @param original - riga originale (modifica)
 * @returns corpo ed errori per campo
 */
export function buildPayload(
  schema: IAdminSchema,
  values: AdminFormValues,
  mode: AdminFormMode,
  initial: AdminFormValues = {},
  original: AdminRow | null = null
): IAdminPayloadResult {
  const payload: Record<string, unknown> = {}
  const errors: Record<string, AdminClientError> = {}
  for (const [name, field] of Object.entries(schema.fields)) {
    if (!isWritable(field)) continue
    const current = values[name]
    if (mode === 'edit' && sameFormValue(current, initial[name])) continue
    if (mode === 'create' && field.required && isEmpty(current) && field.type !== 'boolean') {
      errors[name] = 'required'
      continue
    }
    const converted = fromFormValue(field, current, original ? original[name] : undefined)
    if (converted.error) {
      errors[name] = converted.error
      continue
    }
    if (mode === 'create' && (converted.value === null || converted.value === undefined)) continue
    if (mode === 'create' && converted.value === '' && !field.required) continue
    payload[name] = converted.value
  }
  return { payload, errors }
}
