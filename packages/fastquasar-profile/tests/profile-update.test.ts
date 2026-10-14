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

describe('modifica profilo', () => {
  it('valori iniziali e patch dei soli campi cambiati', () => {
    const v = profileEditValues(user)
    expect(buildProfilePatch(user, v)).toEqual({})
    expect(buildProfilePatch(user, { ...v, firstName: ' Luigi ' })).toEqual({ firstName: 'Luigi' })
  })
  it('l\'email cambiata porta la password attuale', () => {
    const v = { ...profileEditValues(user), email: 'nuovo@x.it' }
    expect(emailChanged(user, v)).toBe(true)
    expect(buildProfilePatch(user, v, 'segreta')).toEqual({ email: 'nuovo@x.it', currentPassword: 'segreta' })
  })
  it('maiuscole e spazi nell\'email non contano come cambio', () => {
    expect(emailChanged(user, { ...profileEditValues(user), email: ' MARIO@x.it ' })).toBe(false)
  })
  it('validazione', () => {
    const v = profileEditValues(user)
    expect(validateProfileForm(user, v, '')).toEqual({})
    expect(validateProfileForm(user, { ...v, firstName: ' ', lastName: '' }, '')).toEqual({ firstName: 'required', lastName: 'required' })
    expect(validateProfileForm(user, { ...v, email: 'non-email' }, 'p').email).toBe('emailInvalid')
    expect(validateProfileForm(user, { ...v, email: 'a@b.it' }, '').currentPassword).toBe('passwordRequired')
    expect(validateProfileForm(user, { ...v, email: 'a@b.it' }, 'p')).toEqual({})
  })
  it('bersaglio degli errori del backend', () => {
    expect(profileErrorTarget(err('auth.password_incorrect'))).toBe('currentPassword')
    expect(profileErrorTarget(err('user.email_exists'))).toBe('email')
    expect(profileErrorTarget(err('altro'))).toBe('form')
  })
  it('parse della risposta (camelCase e snake_case)', () => {
    expect(parseProfileUser({ id: 2, username: 'a', email: 'a@b.it', first_name: 'A', last_name: 'B', is_staff: true }))
      .toEqual({ id: 2, username: 'a', email: 'a@b.it', firstName: 'A', lastName: 'B', isStaff: true })
    expect(parseProfileUser({ id: 2, username: 'a', email: null, firstName: 'A', lastName: 'B', permissions: ['x', 3] })?.permissions)
      .toEqual(['x'])
    expect(parseProfileUser({ id: 1 })).toBeNull()
    expect(parseProfileUser(null)).toBeNull()
  })
  it('opzioni di modifica', () => {
    expect(resolveEditOptions(undefined).enabled).toBe(false)
    expect(resolveEditOptions(false).enabled).toBe(false)
    expect(resolveEditOptions(true)).toEqual({ enabled: true, apiBase: '/api' })
    expect(resolveEditOptions({ apiBase: '/v1' })).toMatchObject({ enabled: true, apiBase: '/v1' })
    expect(resolveEditOptions({ enabled: false }).enabled).toBe(false)
  })
  it('password_unchanged va sul campo della nuova password', () => {
    expect(passwordErrorTarget(err('auth.password_unchanged', 422))).toBe('next')
  })
})
