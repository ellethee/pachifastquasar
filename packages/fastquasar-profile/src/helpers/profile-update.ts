import type { IPachiApiError } from './api-error'
import { primaryItem } from './api-error'
import type { IPachiProfileUser } from '../types/profile'

/** Campi modificabili dall'utente nel profilo. */
export interface IProfileEditValues {
  firstName: string
  lastName: string
  email: string
}

/** Corpo di `PATCH /auth/user`: solo i campi cambiati, più `currentPassword` se cambia l'email. */
export interface IProfilePatchBody {
  firstName?: string
  lastName?: string
  email?: string
  currentPassword?: string
}

/** Chiavi di errore di validazione (tradotte da `pachiProfile.edit.validation.<chiave>`). */
export type ProfileFieldError = 'required' | 'emailInvalid' | 'passwordRequired'

/** Errori per campo (assente = campo valido). */
export interface IProfileEditErrors {
  firstName?: ProfileFieldError
  lastName?: ProfileFieldError
  email?: ProfileFieldError
  currentPassword?: ProfileFieldError
}

/** Dove mostrare un errore del backend nel form. */
export type ProfileErrorTarget = 'currentPassword' | 'email' | 'form'

/**
 * Valori iniziali del form dall'utente corrente.
 *
 * @param user - utente corrente
 * @returns valori del form (stringhe vuote se mancano)
 */
export function profileEditValues(user: IPachiProfileUser): IProfileEditValues {
  return { firstName: user.firstName ?? '', lastName: user.lastName ?? '', email: user.email ?? '' }
}

/**
 * `true` se l'email cambia rispetto all'utente (confronto senza spazi ai bordi e senza maiuscole).
 *
 * @param user - utente corrente
 * @param values - valori del form
 */
export function emailChanged(user: IPachiProfileUser, values: IProfileEditValues): boolean {
  return values.email.trim().toLowerCase() !== (user.email ?? '').trim().toLowerCase()
}

/**
 * Corpo del `PATCH` con i soli campi modificati. `currentPassword` viene aggiunta solo se cambia l'email.
 *
 * @param user - utente corrente
 * @param values - valori del form
 * @param currentPassword - password attuale (richiesta dal backend per cambiare l'email)
 * @returns corpo del PATCH (oggetto vuoto se non cambia nulla)
 */
export function buildProfilePatch(
  user: IPachiProfileUser,
  values: IProfileEditValues,
  currentPassword = ''
): IProfilePatchBody {
  const body: IProfilePatchBody = {}
  if (values.firstName.trim() !== (user.firstName ?? '')) body.firstName = values.firstName.trim()
  if (values.lastName.trim() !== (user.lastName ?? '')) body.lastName = values.lastName.trim()
  if (emailChanged(user, values)) {
    body.email = values.email.trim()
    body.currentPassword = currentPassword
  }
  return body
}

/**
 * Valida il form: nome, cognome ed email obbligatori, email ben formata, password attuale se cambia l'email.
 *
 * @param user - utente corrente
 * @param values - valori del form
 * @param currentPassword - password attuale digitata
 * @returns errori per campo (oggetto vuoto se valido)
 */
export function validateProfileForm(
  user: IPachiProfileUser,
  values: IProfileEditValues,
  currentPassword: string
): IProfileEditErrors {
  const errors: IProfileEditErrors = {}
  if (!values.firstName.trim()) errors.firstName = 'required'
  if (!values.lastName.trim()) errors.lastName = 'required'
  const email = values.email.trim()
  if (!email) errors.email = 'required'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'emailInvalid'
  if (emailChanged(user, values) && !currentPassword) errors.currentPassword = 'passwordRequired'
  return errors
}

/**
 * Campo a cui attribuire l'errore del backend: `auth.password_incorrect` → password attuale,
 * `user.email_exists` → email, il resto → messaggio generale del form.
 *
 * @param error - errore normalizzato
 * @returns bersaglio dell'errore
 */
export function profileErrorTarget(error: IPachiApiError): ProfileErrorTarget {
  const code = primaryItem(error)?.code
  if (code === 'auth.password_incorrect') return 'currentPassword'
  if (code === 'user.email_exists') return 'email'
  return 'form'
}

/**
 * Normalizza la risposta di `PATCH /auth/user` (stessa forma di `GET /auth/user`, camelCase o snake_case).
 *
 * @param body - risposta del backend (envelope già scartato dal client)
 * @returns l'utente, o `null` se manca `username`
 */
export function parseProfileUser(body: unknown): IPachiProfileUser | null {
  if (body === null || typeof body !== 'object') return null
  const rec = body as Record<string, unknown>
  const pick = (snake: string, camel: string): unknown => rec[camel] ?? rec[snake]
  const str = (v: unknown): string | null => (typeof v === 'string' ? v : null)
  const username = str(rec.username)
  if (username === null) return null
  const id = rec.id
  const user: IPachiProfileUser = {
    id: typeof id === 'number' || typeof id === 'string' ? id : '',
    username,
    email: str(rec.email),
    firstName: str(pick('first_name', 'firstName')) ?? '',
    lastName: str(pick('last_name', 'lastName')) ?? '',
  }
  const flag = (snake: string, camel: string, key: 'isActive' | 'isStaff' | 'isSuperuser'): void => {
    const v = pick(snake, camel)
    if (typeof v === 'boolean') user[key] = v
  }
  flag('is_active', 'isActive', 'isActive')
  flag('is_staff', 'isStaff', 'isStaff')
  flag('is_superuser', 'isSuperuser', 'isSuperuser')
  const date = (snake: string, camel: string, key: 'emailVerifiedAt' | 'lastLoginAt' | 'createdAt'): void => {
    const v = pick(snake, camel)
    if (typeof v === 'string' || v === null) user[key] = v
  }
  date('email_verified_at', 'emailVerifiedAt', 'emailVerifiedAt')
  date('last_login_at', 'lastLoginAt', 'lastLoginAt')
  date('created_at', 'createdAt', 'createdAt')
  const perms = rec.permissions
  if (Array.isArray(perms)) user.permissions = perms.filter((p): p is string => typeof p === 'string')
  const extra = rec.profile
  if (extra !== null && typeof extra === 'object' && !Array.isArray(extra)) user.profile = extra as Record<string, unknown>
  return user
}
