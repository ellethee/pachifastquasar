import { describe, expect, it } from 'vitest'
import {
  buildProfilePatch,
  emailChanged,
  parseProfileUser,
  profileEditValues,
  profileErrorTarget,
  validateProfileForm,
} from '../src/helpers/profile-update'
import { resolveEditOptions } from '../src/helpers/edit-options'
import { passwordErrorTarget } from '../src/helpers/password'
import type { IPachiProfileUser } from '../src/types/profile'

const user: IPachiProfileUser = { id: 1, username: 'mario', email: 'mario@x.it', firstName: 'Mario', lastName: 'Rossi' }
const err = (code: string, status = 400) => ({ status, items: [{ code }] })

describe('profile editing', () => {
  it('initial values and patch with only the changed fields', () => {
    const v = profileEditValues(user)
    expect(buildProfilePatch(user, v)).toEqual({})
    expect(buildProfilePatch(user, { ...v, firstName: ' Luigi ' })).toEqual({ firstName: 'Luigi' })
  })
  it('a changed email carries the current password', () => {
    const v = { ...profileEditValues(user), email: 'nuovo@x.it' }
    expect(emailChanged(user, v)).toBe(true)
    expect(buildProfilePatch(user, v, 'segreta')).toEqual({ email: 'nuovo@x.it', currentPassword: 'segreta' })
  })
  it('case and spaces in the email do not count as a change', () => {
    expect(emailChanged(user, { ...profileEditValues(user), email: ' MARIO@x.it ' })).toBe(false)
  })
  it('validation', () => {
    const v = profileEditValues(user)
    expect(validateProfileForm(user, v, '')).toEqual({})
    expect(validateProfileForm(user, { ...v, firstName: ' ', lastName: '' }, '')).toEqual({ firstName: 'required', lastName: 'required' })
    expect(validateProfileForm(user, { ...v, email: 'non-email' }, 'p').email).toBe('emailInvalid')
    expect(validateProfileForm(user, { ...v, email: 'a@b.it' }, '').currentPassword).toBe('passwordRequired')
    expect(validateProfileForm(user, { ...v, email: 'a@b.it' }, 'p')).toEqual({})
  })
  it('backend error targets', () => {
    expect(profileErrorTarget(err('auth.password_incorrect'))).toBe('currentPassword')
    expect(profileErrorTarget(err('user.email_exists'))).toBe('email')
    expect(profileErrorTarget(err('altro'))).toBe('form')
  })
  it('response parsing (camelCase and snake_case)', () => {
    expect(parseProfileUser({ id: 2, username: 'a', email: 'a@b.it', first_name: 'A', last_name: 'B', is_staff: true }))
      .toEqual({ id: 2, username: 'a', email: 'a@b.it', firstName: 'A', lastName: 'B', isStaff: true })
    expect(parseProfileUser({ id: 2, username: 'a', email: null, firstName: 'A', lastName: 'B', permissions: ['x', 3] })?.permissions)
      .toEqual(['x'])
    expect(parseProfileUser({ id: 1 })).toBeNull()
    expect(parseProfileUser(null)).toBeNull()
  })
  it('edit options', () => {
    expect(resolveEditOptions(undefined).enabled).toBe(false)
    expect(resolveEditOptions(false).enabled).toBe(false)
    expect(resolveEditOptions(true)).toEqual({ enabled: true, apiBase: '/api' })
    expect(resolveEditOptions({ apiBase: '/v1' })).toMatchObject({ enabled: true, apiBase: '/v1' })
    expect(resolveEditOptions({ enabled: false }).enabled).toBe(false)
  })
  it('password_unchanged goes to the new password field', () => {
    expect(passwordErrorTarget(err('auth.password_unchanged', 422))).toBe('next')
  })
})
