import type { AdminRow, IAdminField, IAdminSchema } from '../types/admin'
import { fieldKey } from './model-key'
import { findFormatter } from './options'
import { fieldOptions } from './schema-text'
import type { ITextResolver } from './schema-text'

/** Testo mostrato per un valore assente. */
export const EMPTY_TEXT = '—'

/** Lunghezza massima del JSON compatto nelle celle. */
const JSON_MAX = 80

/**
 * Allineamento di una colonna dedotto dal tipo: numeri a destra, booleani al centro, il resto a sinistra.
 *
 * @param field - campo dello schema
 * @returns `left`, `right` o `center`
 */
export function alignFor(field: Pick<IAdminField, 'type' | 'component'>): 'left' | 'right' | 'center' {
  if (field.type === 'integer' || field.type === 'number') return 'right'
  if (field.type === 'boolean') return 'center'
  return 'left'
}

/**
 * Interpreta una data `YYYY-MM-DD` come data locale (senza lo scarto di fuso di `new Date(string)`).
 *
 * @param value - stringa ISO della sola data
 * @returns la data, o `null` se non valida
 */
export function parseDateOnly(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  if (!m) return null
  const date = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return Number.isNaN(date.getTime()) ? null : date
}

/**
 * JSON compatto troncato per le celle.
 *
 * @param value - valore JSON
 * @param max - lunghezza massima
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
 * Testo di una cella secondo il tipo del campo (senza i formatter registrati). I booleani si disegnano con
 * un'icona nel componente: qui producono `true`/`false`.
 *
 * - `integer`/`number` JSON: `Intl.NumberFormat` nella lingua attiva; un Decimal (stringa) resta com'è;
 * - `date`: data locale; `datetime`: data e ora locali; `time`: `HH:MM(:SS)`;
 * - `json`: JSON compatto troncato; `select`: etichetta dell'opzione (anche tradotta con `optionKeys`).
 *
 * @param value - valore grezzo
 * @param field - campo dello schema
 * @param locale - lingua (es. `it`)
 * @param resolver - risolutore per le etichette delle opzioni
 * @returns il testo (`—` se assente)
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
 * Testo di una cella applicando i formatter registrati (`setPachiAdminOptions({ formatters })`):
 * prima quello del campo (`app.model.campo`), poi quello del tipo.
 *
 * @param schema - schema del modello
 * @param name - nome del campo
 * @param row - riga
 * @param locale - lingua attiva
 * @param resolver - risolutore per le etichette delle opzioni
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
