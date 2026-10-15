import type { IPachiApiError } from './api-error'
import { primaryItem } from './api-error'

/** Default minimum length of the new password (same as the `pachifast` backend). */
export const DEFAULT_MIN_PASSWORD_LENGTH = 12

/** Change password form values. */
export interface IPasswordFormValues {
  current: string
  next: string
  confirm: string
}

/** Validation error keys (translated from `pachiProfile.security.password.validation.<key>`). */
export type PasswordFieldError = 'required' | 'tooShort' | 'mismatch'

/** Errors per field (missing = valid field). */
export interface IPasswordFormErrors {
  current?: PasswordFieldError
  next?: PasswordFieldError
  confirm?: PasswordFieldError
}

/**
 * Validates the form: all fields required, new password of at least `minLength` characters, matching confirmation.
 *
 * @param values - current values
 * @param minLength - required minimum length
 * @returns errors per field (empty object if valid)
 */
export function validatePasswordForm(values: IPasswordFormValues, minLength: number): IPasswordFormErrors {
  const errors: IPasswordFormErrors = {}
  if (!values.current) errors.current = 'required'
  if (!values.next) errors.next = 'required'
  else if (values.next.length < minLength) errors.next = 'tooShort'
  if (!values.confirm) errors.confirm = 'required'
  else if (values.confirm !== values.next) errors.confirm = 'mismatch'
  return errors
}

/**
 * `true` if there are no errors.
 *
 * @param errors - result of {@link validatePasswordForm}
 */
export function isPasswordFormValid(errors: IPasswordFormErrors): boolean {
  return Object.keys(errors).length === 0
}

/**
 * New minimum if the error is `auth.password_too_short` with a positive integer numeric `params.min_length`
 * (a numeric string is accepted too), otherwise the current minimum.
 *
 * @param error - normalized request error
 * @param current - current minimum
 * @returns updated minimum
 */
export function minLengthFromError(error: IPachiApiError, current: number): number {
  const item = primaryItem(error)
  if (item?.code !== 'auth.password_too_short') return current
  const raw = item.params?.min_length
  const n = typeof raw === 'string' ? Number(raw) : raw
  return typeof n === 'number' && Number.isInteger(n) && n > 0 ? n : current
}

/** Where to show a backend error in the form. */
export type PasswordErrorTarget = 'current' | 'next' | 'form'

/**
 * Field to which the backend error is attributed: `auth.password_incorrect` → current password,
 * `auth.password_too_short` and `auth.password_unchanged` → new password, anything else → general form message.
 *
 * @param error - normalized error
 * @returns error target
 */
export function passwordErrorTarget(error: IPachiApiError): PasswordErrorTarget {
  const code = primaryItem(error)?.code
  if (code === 'auth.password_incorrect') return 'current'
  if (code === 'auth.password_too_short' || code === 'auth.password_unchanged') return 'next'
  return 'form'
}
