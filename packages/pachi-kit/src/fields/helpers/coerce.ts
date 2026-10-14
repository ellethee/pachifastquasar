import type { IFieldDef } from '../types'

/**
 * Converte il valore emesso dal componente in base al tipo del campo:
 * `type: 'number'` emette un `number` (o `null` se vuoto/non numerico), gli altri tipi restano invariati.
 *
 * @param field - definizione del campo
 * @param value - valore grezzo emesso da `q-input`
 * @returns il valore coerente col tipo
 */
export function coerce(field: Pick<IFieldDef, 'type'>, value: unknown): unknown {
  if (field.type !== 'number') return value
  if (value === '' || value === null || value === undefined) return null
  const parsed = Number(value)
  return Number.isNaN(parsed) ? null : parsed
}

/**
 * Valore da passare alle regole di validazione: un `boolean` non ancora toccato (`undefined`/`null`)
 * vale `false`, perché un toggle non ha uno stato "vuoto"; gli altri valori restano invariati.
 *
 * @param field - definizione del campo
 * @param value - valore corrente del modello
 * @returns il valore da validare
 */
export function valueForValidation(field: Pick<IFieldDef, 'type' | 'component'>, value: unknown): unknown {
  if (field.type === 'boolean' && !field.component && (value === undefined || value === null)) return false
  return value
}

/**
 * Normalizza un valore "vuoto" (`''`/`null`) a `undefined` quando il baseline non aveva il campo:
 * svuotare un campo mai valorizzato non è una modifica (`hasChanges` resta `false`).
 *
 * @param original - valore del campo nel baseline
 * @param value - nuovo valore emesso dal componente
 * @returns il valore da memorizzare nello stato
 */
export function normalizeAgainstOriginal(original: unknown, value: unknown): unknown {
  return original === undefined && (value === '' || value === null) ? undefined : value
}
