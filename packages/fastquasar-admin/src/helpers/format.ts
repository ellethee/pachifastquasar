import type { AdminRow, IAdminField, IAdminSchema } from '../types/admin'
import { fieldKey } from './model-key'
import { findFormatter } from './options'
import { fieldOptions } from './schema-text'
import type { ITextResolver } from './schema-text'

/** Text shown for a missing value. */
export const EMPTY_TEXT = '—'

/** Maximum length of the compact JSON in cells. */
const JSON_MAX = 80

/**
 * Column alignment derived from the type: numbers right, booleans center, the rest left.
 *
 * @param field - schema field
 * @returns `left`, `right` or `center`
 */
export function alignFor(field: Pick<IAdminField, 'type' | 'component'>): 'left' | 'right' | 'center' {
  if (field.type === 'integer' || field.type === 'number') return 'right'
  if (field.type === 'boolean') return 'center'
  return 'left'
}

/**
 * Interprets a `YYYY-MM-DD` date as a local date (without the timezone shift of `new Date(string)`).
 *
 * @param value - ISO string of the date only
 * @returns the date, or `null` if invalid
 */
export function parseDateOnly(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  if (!m) return null
  const date = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return Number.isNaN(date.getTime()) ? null : date
}

/**
 * Compact JSON truncated for cells.
 *
 * @param value - JSON value
 * @param max - maximum length
 */
export function compactJson(value: unknown, max = JSON_MAX): string {
  let text: string
  try {
    text = JSON.stringify(value) ?? ''
  } catch {
    text = String(value)
  }
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

/**
 * Cell text according to the field type (without the registered formatters). Booleans are drawn with an
 * icon in the component: here they produce `true`/`false`.
 *
 * - `integer`/`number` JSON: `Intl.NumberFormat` in the active language; a Decimal (string) stays as is;
 * - `date`: local date; `datetime`: local date and time; `time`: `HH:MM(:SS)`;
 * - `json`: truncated compact JSON; `select`: option label (also translated with `optionKeys`).
 *
 * @param value - raw value
 * @param field - schema field
 * @param locale - language (e.g. `it`)
 * @param resolver - resolver for the option labels
 * @returns the text (`—` if missing)
 */
export function formatValue(
  value: unknown,
  field: IAdminField,
  locale: string,
  resolver?: ITextResolver
): string {
  if (value === null || value === undefined || value === '') return EMPTY_TEXT
  if (field.component === 'select' && field.properties?.options) {
    const option = fieldOptions(field, resolver).find((o) => o.value === value)
    if (option) return option.label
  }
  switch (field.type) {
    case 'boolean':
      return String(value)
    case 'integer':
    case 'number':
      return typeof value === 'number'
        ? new Intl.NumberFormat(locale, { maximumFractionDigits: 10 }).format(value)
        : String(value)
    case 'date': {
      const date = typeof value === 'string' ? parseDateOnly(value) : null
      return date ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(date) : String(value)
    }
    case 'datetime': {
      const date = typeof value === 'string' ? new Date(value) : null
      return date && !Number.isNaN(date.getTime())
        ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
        : String(value)
    }
    case 'time':
      return typeof value === 'string' ? value.replace(/\.\d+$/, '') : String(value)
    case 'json':
      return compactJson(value)
    default:
      return typeof value === 'object' ? compactJson(value) : String(value)
  }
}

/**
 * Cell text applying the registered formatters (`setPachiAdminOptions({ formatters })`):
 * first the field one (`app.model.field`), then the type one.
 *
 * @param schema - model schema
 * @param name - field name
 * @param row - row
 * @param locale - active language
 * @param resolver - resolver for the option labels
 */
export function formatCell(
  schema: IAdminSchema,
  name: string,
  row: AdminRow,
  locale: string,
  resolver?: ITextResolver
): string {
  const field = schema.fields[name]
  const value = row[name]
  if (!field) return value === null || value === undefined ? EMPTY_TEXT : String(value)
  const defaultText = formatValue(value, field, locale, resolver)
  const custom = findFormatter(fieldKey(schema.app, schema.model, name), field.type)
  return custom ? custom({ value, row, name, field, schema, locale, defaultText }) : defaultText
}
