import type { IFieldDef } from '../types'

/**
 * Converts the value emitted by the component according to the field type:
 * `type: 'number'` emits a `number` (or `null` if empty/non-numeric), other types are left unchanged.
 *
 * @param field - field definition
 * @param value - raw value emitted by `q-input`
 * @returns the value consistent with the type
 */
export function coerce(field: Pick<IFieldDef, 'type'>, value: unknown): unknown {
  if (field.type !== 'number') return value
  if (value === '' || value === null || value === undefined) return null
  const parsed = Number(value)
  return Number.isNaN(parsed) ? null : parsed
}

/**
 * Value to pass to the validation rules: an untouched `boolean` (`undefined`/`null`)
 * is `false`, because a toggle has no "empty" state; other values are left unchanged.
 *
 * @param field - field definition
 * @param value - current model value
 * @returns the value to validate
 */
export function valueForValidation(field: Pick<IFieldDef, 'type' | 'component'>, value: unknown): unknown {
  if (field.type === 'boolean' && !field.component && (value === undefined || value === null)) return false
  return value
}

/**
 * Normalizes an "empty" value (`''`/`null`) to `undefined` when the baseline did not have the field:
 * clearing a never-set field is not a change (`hasChanges` stays `false`).
 *
 * @param original - value of the field in the baseline
 * @param value - new value emitted by the component
 * @returns the value to store in the state
 */
export function normalizeAgainstOriginal(original: unknown, value: unknown): unknown {
  return original === undefined && (value === '' || value === null) ? undefined : value
}
