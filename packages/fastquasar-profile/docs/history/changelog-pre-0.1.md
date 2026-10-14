# Changelog

All notable changes to `@ilpachi/fastquasar-profile` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html) (the package is in the `0.x` series: minor releases may
contain breaking changes).

## [Unreleased]

## [0.7.1] - 2026-10-13

### Changed

- Docs: the avatar provided by the shell (`pachiAvatarUrl`) no longer uses Gravatar by default (shell `app.gravatar` now defaults to
  `false`, initials only); opt in with `app.gravatar: true`.

## [0.7.0] - 2026-10-13

### Changed

- Phone number for MFA by SMS (backend pachifast 0.15.0): `POST /mfa/sms/setup` now requires the international format, so
  `isValidPhoneNumber` requires the leading `+` followed by 7-15 digits (breaking for numbers typed without it). `normalizePhoneNumber`
  still only strips separators and never adds a `+`. Hints, placeholder-style examples and error messages (it/en) show `+39 333 1234567`.
- Resending an email/SMS code: the backend enforces a 30 s pause between two sends (`429 auth.rate_limited`). In `PachiMfaPanel` the
  "Send the code again" button (and the send buttons) stay disabled for 30 s after each send, with a countdown in the label; on `429` they
  are disabled for `Retry-After` seconds (fallback 30 s when the header is missing or not exposed through CORS). Logic in the new
  `helpers/cooldown.ts`. The `429` on a send is no longer shown as a lockout.

### Added

- `IPachiProfileUser.profile` (optional free-form object, `GET`/`PATCH /auth/user` of backend 0.15.0), read by `parseProfileUser`. No UI.

## [0.6.0] - 2026-10-12

### Added

- MFA by SMS is back (backend pachifast 0.7.2), as a two-step setup: the user types the phone number (`POST /mfa/sms/setup`,
  `{ phone_number }`), then confirms the code received (`POST /mfa/sms/confirm`). `PachiMfaMethod` is `'totp' | 'email' | 'sms'`;
  `mfaMethods: ['sms']` enables it. New handled errors: `mfa.sms_code_invalid` and `mfa.no_sms_setup` (setup expired).
- Profile editing (`PATCH /auth/user`, backend pachifast 0.10.0): new `PachiProfileEditForm` (first name, last name, email; only the changed
  fields are sent; changing the email asks for the current password), prop `editable` and event `updated` on `PachiProfilePage`,
  and `setPachiProfileEdit()` / `getPachiProfileEdit()` for the package's own route. Opt-in: the page stays read-only by default.
  Handled errors: `auth.password_incorrect` (on the password field) and `user.email_exists` (on the email field).
- Messages for `auth.password_unchanged` (shown on the new-password field), `auth.rate_limited`, `user.email_exists`, `mfa.disabled`
  and the email/SMS code errors.

### Changed

- `IPachiProfileHttp` has an optional `Patch` method (needed only by the edit form; the alova client already provides it).

## [0.5.0] - 2026-10-12

### Changed

- **Breaking:** `@ilpachi/use-alova` (`^2.1.1`) is now a required peer dependency. The package uses the client registered by
  `createPachiApp` (`getUseAlovaInstance()`); the `fetch` fallback client and the `provide('useAlova')` / `inject` lookup are gone.
- **Breaking:** MFA by SMS is removed (backend pachifast 0.7.1 dropped it): `PachiMfaMethod` is `'totp' | 'email'`.
- MFA by email is now a two-step setup like TOTP: `POST /mfa/email/setup` sends the code, the panel asks for it and confirms with
  `POST /mfa/email/confirm`. Older backends that enabled the method at once and returned the backup codes are still handled.
- New handled errors: `mfa.email_code_invalid` (wrong code), `mfa.no_email_setup` (setup expired: send the code again) and
  `403 mfa.disabled` (MFA turned off on the server: the panel is hidden with a message).

## [0.4.2] - 2026-10-12

### Fixed

- TOTP code: spaces are ignored ("123 456" as shown by authenticator apps) and removed before sending.
- Copying a secret or code shows a message when the clipboard is not available instead of failing silently.

## [0.4.1] - 2026-10-07

### Fixed

- The profile page now scrolls by itself (`overflow-y: auto`, `max-height: var(--pachi-page-height)`): the shell
  layout is one viewport tall and does not scroll, so with the lockout banner the "Change password" button could
  end up below the fold and unreachable.
- The lockout countdown banner is compact (`pachi-profile-sec-banner--dense`, one line) in the change password form
  and in the MFA panel.

### Added

- Lockout countdown: on `429` with a `Retry-After` header (seconds or HTTP date) the change password form and the
  MFA panel (confirm code, disable, regenerate backup codes) show "Too many attempts, try again in mm:ss" with a live
  countdown and disable the submit button until it expires. Without a valid header the behaviour is unchanged.
  New pure helpers `parseRetryAfter`, `remainingSeconds`, `formatCountdown` and the `useRetryCountdown` composable
  (timer stopped on unmount); `IPachiApiError.retryAfter`; the fallback `fetch` client exposes `headers`.
- New message `pachiProfile.security.retryAfter` (it/en).

## [0.4.0] - 2026-10-06

### Added

- `setPachiProfileSecurity(options)` / `getPachiProfileSecurity()`: security options (for example `{ mfa: true }`) for the package's own `/user/profile` route (`PachiProfileRoute`), which has no props.
- Security section in the profile page (`PachiProfileSecurity`, prop `security`, event `password-changed`):
  - `PachiChangePasswordForm`: change password (`POST /api/auth/user/password`) with confirmation, client-side
    minimum length (default 12, updated from `params.min_length` of a `422`), inline translated errors and a
    `429` message. After success it shows a message and calls `onPasswordChanged` or the `pachiLogout` function
    provided by the shell, and emits `password-changed`.
  - `PachiMfaPanel` (opt-in with `security.mfa`): shown only if `GET /api/mfa/status` answers 2xx. TOTP setup with QR
    code, copyable secret, backup codes and code confirmation; optional email and SMS methods; regenerate backup
    codes and disable MFA with the password. Handles `409`, `401`/`400` wrong code, `429` and wrong password.
  - `PachiMfaQrCode` and the `qrcode-generator` dependency (no dependencies of its own, loaded lazily).
  - `setPachiProfileHttp` to replace the HTTP client; Italian and English messages; unit tests for the pure logic.

## [0.3.3] - 2026-10-06

### Changed

- Documentation rewritten in English: complete README (installation from the internal registry, mounting in a
  `pachifastquasar` app, API reference, backend contract, avatar resolution, styling, troubleshooting), this changelog
  and a `docs/` folder for a MkDocs site. No code changes.
- `package.json` `files` now includes `CHANGELOG.md`.

## [0.3.2] - 2026-10-05

### Added

- The avatar of the profile page comes from `inject('pachiAvatarUrl')` (the Gravatar resolver provided by the shell);
  the initials remain the fallback when there is no email, no resolver or no image.

## [0.3.1] - 2026-10-05

### Added

- "Last login" and "Account since" are derived from `user.lastLoginAt` and `user.createdAt`, formatted with
  `Intl.DateTimeFormat` in the active language (the `lastLogin` and `memberSince` props still take precedence).
- "Email verified" badge when `user.emailVerifiedAt` is set.

## [0.3.0] - 2026-10-05

### Added

- `menu` module (`@ilpachi/fastquasar-profile/menu`): factory of the "Profile" entry of the account menu
  (`/user/profile`, order 10, visible according to `config.auth.menu.showProfile`).
- `routes` module (`@ilpachi/fastquasar-profile/routes`): the `/user/profile` route, discovered automatically by the
  `@ilpachi/pachifastquasar` shell.
- `setPachiProfileUser` / `getPachiProfileUser`: the route reads the user from a getter registered by the app.

## [0.2.1] - 2026-10-05

### Added

- Skeleton shown while `user` is `null` or `undefined`.
- Unit tests.

### Changed

- Responsive layout: a single column below 760 px.
- Avatar and glow colours derive from `--pachi-accent` and `--pachi-accent-deep`.
- The release workflow skips publishing when the version already exists in the registry.

## [0.2.0] - 2026-10-02

### Added

- First release as a standalone repository (moved from `pachifastquasar/packages`): `PachiProfilePage` (identity
  card with status badges and read-only personal data), `avatar` slot, translated texts (Italian, English) and
  self-contained `--pachi-*` styles.

[0.7.1]: https://github.com/ellethee/pachifastquasar/compare/fastquasar-profile@0.7.0...fastquasar-profile@0.7.1
[0.7.0]: https://github.com/ellethee/pachifastquasar/compare/fastquasar-profile@0.6.0...fastquasar-profile@0.7.0
[0.6.0]: https://github.com/ellethee/pachifastquasar/compare/fastquasar-profile@0.5.0...fastquasar-profile@0.6.0
[0.5.0]: https://github.com/ellethee/pachifastquasar/compare/fastquasar-profile@0.4.2...fastquasar-profile@0.5.0
[0.4.2]: https://github.com/ellethee/pachifastquasar/compare/fastquasar-profile@0.4.1...fastquasar-profile@0.4.2
[0.4.1]: https://github.com/ellethee/pachifastquasar/compare/fastquasar-profile@0.4.0...fastquasar-profile@0.4.1
[0.4.0]: https://github.com/ellethee/pachifastquasar/compare/fastquasar-profile@0.3.3...fastquasar-profile@0.4.0
[0.3.3]: https://github.com/ellethee/pachifastquasar/compare/fastquasar-profile@0.3.2...fastquasar-profile@0.3.3
[0.3.2]: https://github.com/ellethee/pachifastquasar/compare/fastquasar-profile@0.3.1...fastquasar-profile@0.3.2
[0.3.1]: https://github.com/ellethee/pachifastquasar/compare/fastquasar-profile@0.3.0...fastquasar-profile@0.3.1
[0.3.0]: https://github.com/ellethee/pachifastquasar/compare/fastquasar-profile@0.2.1...fastquasar-profile@0.3.0
[0.2.1]: https://github.com/ellethee/pachifastquasar/compare/fastquasar-profile@0.2.0...fastquasar-profile@0.2.1
[0.2.0]: https://github.com/ellethee/pachifastquasar/releases/tag/fastquasar-profile@0.2.0
