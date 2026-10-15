import type { IPachiApiError } from './api-error'
import { primaryItem } from './api-error'
import type { IPachiProfileUser } from '../types/profile'

/** Fields the user can edit in the profile. */
export interface IProfileEditValues {
  firstName: string
  lastName: string
  email: string
}

/** Body of `PATCH /auth/user`: only the changed fields, plus `currentPassword` if the email changes. */
export interface IProfilePatchBody {
  firstName?: string
  lastName?: string
  email?: string
  currentPassword?: string
}

/** Validation error keys (translated from `pachiProfile.edit.validation.<key>`). */
export type ProfileFieldError = 'required' | 'emailInvalid' | 'passwordRequired'

/** Errors per field (missing = valid field). */
export interface IProfileEditErrors {
  firstName?: ProfileFieldError
  lastName?: ProfileFieldError
  email?: ProfileFieldError
  currentPassword?: ProfileFieldError
}

/** Where to show a backend error in the form. */
export type ProfileErrorTarget = 'currentPassword' | 'email' | 'form'

/**
 * Initial form values from the current user.
 *
 * @param user - current user
 * @returns form values (empty strings if missing)
 */
export function profileEditValues(user: IPachiProfileUser): IProfileEditValues {
  return { firstName: user.firstName ?? '', lastName: user.lastName ?? '', email: user.email ?? '' }
}

/**
 * `true` if the email differs from the user's (compared ignoring surrounding spaces and case).
 *
 * @param user - current user
 * @param values - form values
 */
export function emailChanged(user: IPachiProfileUser, values: IProfileEditValues): boolean {
  return values.email.trim().toLowerCase() !== (user.email ?? '').trim().toLowerCase()
}

/**
 * `PATCH` body with only the changed fields. `currentPassword` is added only if the email changes.
 *
 * @param user - current user
 * @param values - form values
 * @param currentPassword - current password (required by the backend to change the email)
 * @returns PATCH body (empty object if nothing changes)
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
 * Validates the form: first name, last name and email required, well-formed email, current password if the email changes.
 *
 * @param user - current user
 * @param values - form values
 * @param currentPassword - typed current password
 * @returns errors per field (empty object if valid)
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
 * Field to which the backend error is attributed: `auth.password_incorrect` → current password,
 * `user.email_exists` → email, anything else → general form message.
 *
 * @param error - normalized error
 * @returns error target
 */
export function profileErrorTarget(error: IPachiApiError): ProfileErrorTarget {
  const code = primaryItem(error)?.code
  if (code === 'auth.password_incorrect') return 'currentPassword'
  if (code === 'user.email_exists') return 'email'
  return 'form'
}

/**
 * Normalizes the `PATCH /auth/user` response (same shape as `GET /auth/user`, camelCase or snake_case).
 *
 * @param body - backend response (envelope already discarded by the client)
 * @returns the user, or `null` if `username` is missing
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
