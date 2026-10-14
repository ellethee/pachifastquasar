# Reference

## Reference

### Exports

| Export | Kind | Description |
| --- | --- | --- |
| `PachiProfilePage` | component | The profile page. |
| `setPachiProfileUser(fn)` | function | Registers the getter `() => IPachiProfileUser \| null \| undefined` used by the `/user/profile` route. |
| `getPachiProfileUser()` | function | Calls the registered getter (the default getter returns `null`). |
| `IPachiProfileUser` | type | User shown by the page. |
| `PachiProfileUserGetter` | type | `() => IPachiProfileUser \| null \| undefined`. |
| `@ilpachi/fastquasar-profile/menu` | module | Default export and `getMenuItem(ctx)`; also `PROFILE_PATH` (`'/user/profile'`) and the types `IPachiProfileMenuContext`, `IPachiProfileMenuItem`. |
| `@ilpachi/fastquasar-profile/routes` | module | Default export: the array of route records; type `IPachiRouteRecord`. |

### `PachiProfilePage`

| Props | Type | Default | Description |
| --- | --- | --- | --- |
| `user` | `IPachiProfileUser \| null` | `undefined` | The user to show. When it is `null` or `undefined` (for example while loading) a skeleton is rendered (`aria-busy="true"`). |
| `lastLogin` | `string` | `undefined` | Text for "Last login". It wins over `user.lastLoginAt`. When missing, `user.lastLoginAt` is formatted with date and time. |
| `memberSince` | `string` | `undefined` | Text for "Account since". It wins over `user.createdAt`. When missing, `user.createdAt` is formatted (date only). |

Dates are formatted with `Intl.DateTimeFormat` in the active language, `dateStyle: 'medium'` (plus `timeStyle: 'short'`
for the last login). A missing value, or one that is not a valid date, is shown as "—".

| Events | Description |
| --- | --- |
| none | The page emits no events. |

| Slots | Slot props | Description |
| --- | --- | --- |
| `avatar` | `{ user: IPachiProfileUser \| null \| undefined, initials: string }` | Custom avatar content, rendered inside the 108 px circle. Default: the image from `pachiAvatarUrl`, else the initials. |

### Security section

| Export | Kind | Description |
| --- | --- | --- |
| `PachiProfileSecurity` | component | The section: prop `security` (`boolean \| IPachiProfileSecurityOptions`, default `true` = password only); event `password-changed`. |
| `PachiChangePasswordForm` | component | Props `minPasswordLength` (12), `apiBase` (`/api`), `afterChange`, `logoutDelay` (2500 ms); event `password-changed`. On `429` with `Retry-After` it shows a countdown and disables submit until it expires. |
| `PachiProfileEditForm` | component | Edit form for first name, last name and email (`PATCH /auth/user`, only changed fields; the current password is asked to change the email). Props `user`, `apiBase`; events `updated` (user from the backend) and `cancel`. |
| `setPachiProfileEdit(options)` / `getPachiProfileEdit()` | function | Enables editing on the package's own route: `true` or `{ apiBase, onUpdated }` (e.g. `onUpdated: () => authManager.refreshUserInfo()`). |
| `IPachiProfileEditOptions` | type | `enabled`, `apiBase`, `onUpdated`. |
| `PachiMfaPanel` | component | Props `apiBase`, `methods` (`['totp']`). Rendered only if `GET /mfa/status` answers 2xx. On `429` with `Retry-After` it shows a countdown and disables confirm, disable and regenerate until it expires. |
| `PachiMfaQrCode` | component | Props `value` (text to encode) and `label` (accessible name). SVG, black on white. |
| `setPachiProfileHttp(factory)` | function | Replaces the HTTP client: `(apiBase) => IPachiProfileHttp`, or `null` for the default. |
| `DEFAULT_MIN_PASSWORD_LENGTH` | constant | `12`. |
| `IPachiProfileSecurityOptions` | type | `password`, `mfa`, `minPasswordLength`, `apiBase`, `mfaMethods`, `onPasswordChanged`. |
| `PachiMfaMethod` | type | `'totp' \| 'email' \| 'sms'`. |
| `IPachiProfileHttp`, `IPachiProfileRequestConfig` | types | Minimal HTTP client contract. |

`PachiProfilePage` also accepts the prop `security` and emits `password-changed`. The prop `editable` (`boolean \| IPachiProfileEditOptions`, default `false`) adds an «Edit» button (name and email) and the event `updated`.

`IPachiProfileSecurityOptions`:

| Option | Default | Description |
| --- | --- | --- |
| `password` | `true` | Show the change-password form. |
| `mfa` | `false` | Show the MFA panel (only rendered if the backend exposes it). |
| `minPasswordLength` | `12` | Minimum length of the new password; updated by `params.min_length` of a 422. |
| `apiBase` | `/api` | Base URL of the API. |
| `mfaMethods` | `['totp']` | Methods offered to enable MFA. |
| `onPasswordChanged` | none | Called after a successful change instead of `pachiLogout`. |

CSS classes: `pachi-profile-security`, `pachi-profile-sec-card`, `pachi-profile-sec-head`, `pachi-profile-sec-body`,
`pachi-profile-sec-banner` (`--ok`, `--error`, `--warn`), `pachi-profile-sec-badge`, `pachi-profile-qr`,
`pachi-profile-secret`, `pachi-profile-codes`. They use only the `--pachi-*` variables of the theme.

### `IPachiProfileUser`

| Field | Type | Required | Shown as |
| --- | --- | --- | --- |
| `id` | `number \| string` | yes | "User ID · #id" under the name. |
| `username` | `string` | yes | Read-only "Username" field (with a lock icon); first letter is the initials fallback. |
| `email` | `string \| null` | yes | Read-only "Email" field (`null` shows an empty field); used to look up the avatar. |
| `firstName` | `string` | yes | Read-only field and the title (`firstName lastName`). |
| `lastName` | `string` | yes | Read-only field and the title. |
| `isActive` | `boolean` | no | "Active" badge (green). |
| `isStaff` | `boolean` | no | "Staff" badge (amber). |
| `isSuperuser` | `boolean` | no | "Superuser" badge (violet). |
| `emailVerifiedAt` | `string \| null` (ISO 8601 UTC) | no | "Email verified" badge (blue) when set. |
| `lastLoginAt` | `string \| null` (ISO 8601 UTC) | no | "Last login" (date and time). |
| `createdAt` | `string \| null` (ISO 8601 UTC) | no | "Account since" (date). |
| `permissions` | `string[]` | no | Not displayed. |

Any other property of the object is ignored. The initials are the first letters of `firstName` and `lastName`
(upper-case); when both are empty, the first letter of `username`.

### Layout

A two-column grid (identity card 340 px, personal data `1fr`, maximum width 1080 px) that becomes a single column below
760 px. The identity card avatar and glow are derived from `--pachi-accent` and `--pachi-accent-deep`, so changing the
accent colour of the theme changes them too.

## Translations

Texts of the package live in the `pachiProfile` namespace (Italian reference, English), registered through
`@ilpachi/pachi-i18n`. They are registered once, **without overriding** what the app already defines, so an app can
redefine any text, or add a language, by declaring the same keys in its own messages.

| Key | English text |
| --- | --- |
| `pachiProfile.pageTitle` | User profile |
| `pachiProfile.description` | View your user profile details |
| `pachiProfile.menuLabel` | Profile |
| `pachiProfile.menuCaption` | View your user profile details |
| `pachiProfile.userId` | User ID |
| `pachiProfile.active` | Active |
| `pachiProfile.staff` | Staff |
| `pachiProfile.superuser` | Superuser |
| `pachiProfile.emailVerified` | Email verified |
| `pachiProfile.lastLogin` | Last login |
| `pachiProfile.memberSince` | Account since |
| `pachiProfile.personalInfo` | Personal information |
| `pachiProfile.firstName` | First name |
| `pachiProfile.lastName` | Last name |
| `pachiProfile.username` | Username |
| `pachiProfile.email` | Email |
| `pachiProfile.none` | — |
