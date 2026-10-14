import { describe, expect, it } from 'vitest'
import { getInitials } from '../src/helpers/initials'

const base = { id: 1, username: 'jdoe', email: 'j@x.it', firstName: 'john', lastName: 'doe' }

describe('getInitials', () => {
  it('usa nome e cognome', () => expect(getInitials(base)).toBe('JD'))
  it('ricade sullo username', () => expect(getInitials({ ...base, firstName: '', lastName: '' })).toBe('J'))
  it('gestisce utente assente', () => {
    expect(getInitials(null)).toBe('')
    expect(getInitials(undefined)).toBe('')
  })
})
