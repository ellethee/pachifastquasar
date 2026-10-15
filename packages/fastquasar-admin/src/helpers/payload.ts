import type { AdminRow, IAdminField, IAdminSchema } from '../types/admin'

/** Form mode. */
export type AdminFormMode = 'create' | 'edit'

/** Code of a client-side validation error. */
export type AdminClientError = 'required' | 'invalidJson' | 'invalidNumber' | 'invalidDate'

/** Form values by field name. */
export type AdminFormValues = Record<string, unknown>

/** Result of {@link buildPayload}. */
export interface IAdminPayloadResult {
  /** Body to send (only writable fields; in edit mode only the changed ones). */
  payload: Record<string, unknown>
  /** Errors per field (empty if the form is valid). */
  errors: Record<string, AdminClientError>
}

/**
 * Fields shown by the form. In create mode only the writable ones (no primary key nor `readonly`); in
 * edit mode all of them, in schema order (`readonly` ones are disabled).
 *
 * @param schema - model schema
 * @param mode - create or edit
 * @returns field names
 */
export function formFieldNames(schema: IAdminSchema, mode: AdminFormMode): string[] {
  return Object.entries(schema.fields)
    .filter(([, field]) => mode === 'edit' || (!field.readonly && !field.primaryKey))
    .map(([name]) => name)
}

/**
 * Tells whether a field is editable (writable).
 *
 * @param field - schema field
 */
export function isWritable(field: IAdminField): boolean {
  return !field.readonly && !field.primaryKey
}

/** Two digits. */
function two(n: number): string {
  return String(n).padStart(2, '0')
}

/**
 * From ISO 8601 to the value of `<input type="datetime-local">` (local time, no seconds).
 *
 * @param iso - ISO date/time
 * @returns `YYYY-MM-DDTHH:mm`, or `''` if invalid
 */
export function isoToLocalInput(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())}T${two(date.getHours())}:${two(date.getMinutes())}`
}

/**
 * From the value of `<input type="datetime-local">` (local time) to ISO 8601 UTC.
 *
 * @param local - `YYYY-MM-DDTHH:mm[:ss]`
 * @returns ISO string, or `null` if invalid
 */
export function localInputToIso(local: string): string | null {
  const date = new Date(local)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

/**
 * Form value for a row value (or for the schema `default`).
 *
 * @param field - schema field
 * @param raw - raw backend value
 * @returns value for the control
 */
export function toFormValue(field: IAdminField, raw: unknown): unknown {
  if (field.component === 'json' || field.type === 'json') {
    return raw === null || raw === undefined ? '' : JSON.stringify(raw, null, 2)
  }
  if (field.type === 'datetime') return typeof raw === 'string' ? isoToLocalInput(raw) : null
  if (field.type === 'boolean') return raw === null || raw === undefined ? (field.nullable ? null : false) : Boolean(raw)
  if (raw === undefined) return null
  // a Decimal arrives as a string: the numeric control works with numbers or text
  return raw
}

/**
 * Initial form values: the row (edit) or the schema `default`s (create).
 *
 * @param schema - model schema
 * @param row - row to edit; missing in create mode
 * @returns a value for each field
 */
export function initialFormValues(schema: IAdminSchema, row?: AdminRow | null): AdminFormValues {
  const values: AdminFormValues = {}
  for (const [name, field] of Object.entries(schema.fields)) {
    values[name] = toFormValue(field, row ? row[name] : field.default)
  }
  return values
}

/** `''`, `null` and `undefined` are all "empty". */
function isEmpty(value: unknown): boolean {
  return value === null || value === undefined || value === ''
}

/**
 * Comparison of two form values (empty = empty; objects by content).
 *
 * @param a - first value
 * @param b - second value
 */
export function sameFormValue(a: unknown, b: unknown): boolean {
  if (isEmpty(a) && isEmpty(b)) return true
  if (Object.is(a, b)) return true
  if (typeof a === 'number' && typeof b === 'string') return String(a) === b
  if (typeof a === 'string' && typeof b === 'number') return a === String(b)
  return JSON.stringify(a) === JSON.stringify(b)
}

/** Conversion of a form value. */
interface IConversion {
  value?: unknown
  error?: AdminClientError
}

/**
 * From form value to value to send to the backend.
 *
 * @param field - schema field
 * @param value - control value
 * @param original - original row value (an original Decimal string is sent back as a string)
 * @returns the value or a validation error
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
  // the foreign key is int, uuid or string depending on the linked model: it is sent back as is
  if (field.component === 'lookup') return { value: isEmpty(value) ? null : value }
  switch (field.type) {
    case 'integer':
    case 'number': {
      // whitespace only = empty (Number('  ') would be 0)
      if (isEmpty(value) || (typeof value === 'string' && value.trim() === '')) return { value: null }
      const n = typeof value === 'number' ? value : Number(String(value).replace(',', '.'))
      if (!Number.isFinite(n)) return { error: 'invalidNumber' }
      if (field.type === 'integer' && !Number.isInteger(n)) return { error: 'invalidNumber' }
      // integers beyond 2^53: as a number they would lose digits, they are sent as a string (the backend converts it)
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
 * Builds the create or update body.
 *
 * - `readonly` keys and the primary key are never sent;
 * - create: empty fields are omitted (the backend default applies); an empty `required` field is an error;
 * - edit (PATCH): only the fields changed compared to the initial values.
 *
 * @param schema - model schema
 * @param values - current form values
 * @param mode - create or edit
 * @param initial - initial form values (edit)
 * @param original - original row (edit)
 * @returns body and per-field errors
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
