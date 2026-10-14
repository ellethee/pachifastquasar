# Backend contract

**Minimum pachifast version:** the read-only profile and the password / TOTP / email MFA work with any recent pachifast; MFA by SMS needs pachifast >= 0.7.2 and profile editing (`PATCH /api/auth/user`) needs pachifast >= 0.10.0. See the CHANGELOG.

The identity and personal data do not call the backend: the **user object** comes from your app (the Security section does call it, see below). With a `pachifast` backend it is
the payload of `GET /api/auth/user`, which the shell's `AuthManager` loads after login (`AuthManager.userInfo`).

```http
GET /api/auth/user
Authorization: Bearer <access token>
```

By default the backend wraps every successful (2xx) JSON response in an envelope and the client of
`@ilpachi/pachifastquasar` unwraps it:

```json
{
  "success": true,
  "message": "...",
  "data": {
    "id": "0f0b5a0c-5d0e-4a64-9f2e-2f0c8c0f9a11",
    "username": "mrossi",
    "email": "mario.rossi@example.org",
    "firstName": "Mario",
    "lastName": "Rossi",
    "isActive": true,
    "isStaff": false,
    "isSuperuser": false,
    "emailVerifiedAt": "2026-10-01T09:30:00.123456Z",
    "lastLoginAt": "2026-10-05T14:02:23.430541Z",
    "createdAt": "2026-09-20T08:00:00Z",
    "permissions": ["items.view"]
  }
}
```

What the page needs is the `data` object (camelCase, as above); `IPachiProfileUser` describes it. Notes:

- `id` is a UUID string with `pachifast`, hence `number | string`.
- `email` may be `null`; on the backend `firstName` and `lastName` are optional (`str | None`), so make sure they are
  strings before passing the object if your own user model allows nulls.
- Timestamps are ISO 8601 in UTC. Strings that cannot be parsed are shown as "—".
- Errors are never 2xx: the backend answers with `{"detail": [{ "loc", "msg", "type", "code", "params" }]}`. A `401`
  (token missing or expired) is handled by the HTTP client of the shell, which refreshes the token or sends the user to
  the login page.

## Security endpoints

The security section calls the backend (`pachifast`) through the shell client. Request bodies of the password change
are camelCase; the MFA bodies and responses are snake_case. Successful responses may be wrapped in the envelope (the
client unwraps it) or bare; the package does not assume a body for `204`.

| Request | Body | Success | Errors handled |
| --- | --- | --- | --- |
| `POST /api/auth/user/password` | `{ "currentPassword", "newPassword" }` | `204`, no body | `400 auth.password_incorrect`; `422 auth.password_too_short` (`params.min_length`); `422 auth.password_unchanged` (same password); `429` (with `Retry-After`: countdown) |
| `PATCH /api/auth/user` | `{ "firstName"?, "lastName"?, "email"?, "currentPassword"? }` (only the changed fields; `currentPassword` is needed to change the email) | the updated user, as `GET /api/auth/user` (backend 0.10.0+) | `400 auth.password_incorrect` (missing or wrong password), `400 user.email_exists`, `429` (with `Retry-After`: countdown) |
| `GET /api/mfa/status` | none | `{ "enabled": bool, "method": "totp" \| "email" \| "sms" \| null }` | any error hides the MFA panel |
| `POST /api/mfa/totp/setup` | none | `{ "secret", "otpauth_uri", "backup_codes": [] }` | `409 mfa.already_enabled` |
| `POST /api/mfa/totp/confirm` | `{ "code": "123456" }` | `{ "ok": true, "method": "totp" }` | `400 mfa.totp_invalid` (also `401 mfa.code_invalid`), `400 mfa.no_totp_setup`, `429 mfa.too_many_attempts` (with `Retry-After`: countdown) |
| `POST /api/mfa/email/setup` | none | `{ "ok": true, "method": "email", "confirm_required": true }`: sends the code and leaves the method inactive (backends before 0.7.1 enabled it at once and returned `backup_codes`: still supported) | `409 mfa.already_enabled`, `400 mfa.no_email`, `403 mfa.disabled` |
| `POST /api/mfa/email/confirm` | `{ "code" }` | `{ "ok": true, "backup_codes": [...] }` (codes optional) | `400 mfa.email_code_invalid`, `400 mfa.no_email_setup` |
| `POST /api/mfa/sms/setup` | `{ "phone_number" }` | `{ "ok": true, "method": "sms", "confirm_required": true }`: sends the code and leaves the method inactive | `409 mfa.already_enabled`, `403 mfa.disabled`, `429` |
| `POST /api/mfa/sms/confirm` | `{ "code" }` | `{ "ok": true, "backup_codes": [...] }` (codes optional) | `400 mfa.sms_code_invalid`, `400 mfa.no_sms_setup` |
| `POST /api/mfa/disable` | `{ "password" }` | `{ "ok": true }` | `400 mfa.password_incorrect`, `429` (with `Retry-After`: countdown) |
| `POST /api/mfa/backup-codes/regenerate` | `{ "password" }` | `{ "backup_codes": [] }` | `400 mfa.password_incorrect`, `400 mfa.not_active`, `429` (with `Retry-After`: countdown) |

Error bodies are `{"detail": [{ "loc", "msg", "type", "code", "params" }]}`. Notes:

- After `POST /auth/user/password` succeeds the backend revokes all the tokens of the user: the client must log out
  and sign in again (see "After a password change").
- With MFA already active, the setup endpoints answer `409 mfa.already_enabled`: disable MFA first.
- Wrong second-factor codes count on the account: after five the account is locked (the next login answers a uniform
  `401`). The same counter protects the password checks of `/mfa/disable` and `/mfa/backup-codes/regenerate`.
- A locked account answers `429 mfa.too_many_attempts` with a `Retry-After` header (seconds until unlock, pachifast
  0.2.1 or later; 0.2.2 or later for `/mfa/disable`, `/mfa/backup-codes/regenerate` and the password change). The header must be listed in the CORS `expose_headers` when the frontend is on another origin. The
  package shows a live countdown and disables the submit button; without the header (for example an exhausted MFA
  challenge) it shows only the text message.
- The `/mfa` routes exist only when the backend registers `MfaModule`; without it `GET /mfa/status` answers `404` and
  the panel stays hidden.
