import type { IPachiApiError } from './api-error'
import { primaryItem } from './api-error'

/** Lunghezza minima di default della nuova password (come il backend `pachifast`). */
export const DEFAULT_MIN_PASSWORD_LENGTH = 12

/** Valori del form di cambio password. */
export interface IPasswordFormValues {
  current: string
  next: string
  confirm: string
}

/** Chiavi di errore di validazione (tradotte da `pachiProfile.security.password.validation.<chiave>`). */
export type PasswordFieldError = 'required' | 'tooShort' | 'mismatch'

/** Errori per campo (assente = campo valido). */
export interface IPasswordFormErrors {
  current?: PasswordFieldError
  next?: PasswordFieldError
  confirm?: PasswordFieldError
}

/**
 * Valida il form: tutti i campi obbligatori, nuova password di almeno `minLength` caratteri, conferma uguale.
 *
 * @param values - valori correnti
 * @param minLength - lunghezza minima richiesta
 * @returns errori per campo (oggetto vuoto se valido)
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
 * `true` se non ci sono errori.
 *
 * @param errors - risultato di {@link validatePasswordForm}
 */
export function isPasswordFormValid(errors: IPasswordFormErrors): boolean {
  return Object.keys(errors).length === 0
}

/**
 * Nuovo minimo se l'errore è `auth.password_too_short` con `params.min_length` numerico intero positivo
 * (anche stringa numerica), altrimenti il minimo corrente.
 *
 * @param error - errore normalizzato della richiesta
 * @param current - minimo corrente
 * @returns minimo aggiornato
 */
export function minLengthFromError(error: IPachiApiError, current: number): number {
  const item = primaryItem(error)
  if (item?.code !== 'auth.password_too_short') return current
  const raw = item.params?.min_length
  const n = typeof raw === 'string' ? Number(raw) : raw
  return typeof n === 'number' && Number.isInteger(n) && n > 0 ? n : current
}

/** Dove mostrare un errore del backend nel form. */
export type PasswordErrorTarget = 'current' | 'next' | 'form'

/**
 * Campo a cui attribuire l'errore del backend: `auth.password_incorrect` → password attuale,
 * `auth.password_too_short` e `auth.password_unchanged` → nuova password, il resto → messaggio generale del form.
 *
 * @param error - errore normalizzato
 * @returns bersaglio dell'errore
 */
export function passwordErrorTarget(error: IPachiApiError): PasswordErrorTarget {
  const code = primaryItem(error)?.code
  if (code === 'auth.password_incorrect') return 'current'
  if (code === 'auth.password_too_short' || code === 'auth.password_unchanged') return 'next'
  return 'form'
}
