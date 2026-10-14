import { test } from '@playwright/test'

// The minimal compat backend has no SMS (or e-mail) delivery channel and the playground enables only the password
// block of the profile page (`setPachiProfileSecurity({ password: true })`), so the two-step SMS enrolment
// (phone number without `+` rejected client-side) cannot be reached end to end.
test.describe('MFA SMS enrolment', () => {
  test.skip(true, 'compat backend has no SMS channel and the playground does not enable the MFA panel')

  test('a phone number without "+" is rejected on the client', async () => {})
})
