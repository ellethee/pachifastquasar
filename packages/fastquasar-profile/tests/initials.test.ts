import { describe, expect, it } from 'vitest'
import { getInitials } from '../src/helpers/initials'

const base = { id: 1, username: 'jdoe', email: 'j@x.it', firstName: 'john', lastName: 'doe' }

describe('getInitials', () => {
  it('uses first and last name', () => expect(getInitials(base)).toBe('JD'))
  it('falls back to the username', () => expect(getInitials({ ...base, firstName: '', lastName: '' })).toBe('J'))
  it('handles a missing user', () => {
    expect(getInitials(null)).toBe('')
    expect(getInitials(undefined)).toBe('')
  })
})
