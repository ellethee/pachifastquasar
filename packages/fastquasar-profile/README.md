# @ilpachi/fastquasar-profile

> **Status: beta.** Companion frontend of pachifast (Python backend by the same author). The API is evolving and may change between minor releases (0.x) — see CHANGELOG. ESM only. Requires @ilpachi/use-alova (peer) and a pachifast backend (see backend-contract). Provided "as is", without warranty of any kind (see [LICENSE](./LICENSE)). Not recommended for production use without pinning versions and testing against your pachifast backend.

A read-only **user profile page** for Vue 3 / Quasar apps: identity card (avatar or initials, name, user id, status
badges, last login, account creation date) and personal data (first name, last name, username, email).

- `PachiProfilePage`: the page. It receives the user through a prop, so it does not depend on any authentication code.
- A menu entry ("Profile") and a route (`/user/profile`) that the `@ilpachi/pachifastquasar` shell discovers
  automatically. The route reads the user from a getter you register once with `setPachiProfileUser`.
- Avatar from the `pachiAvatarUrl` function provided by the shell (Gravatar, opt-in with `app.gravatar: true`), with the initials as a fallback, or from
  your own `avatar` slot.
- A **Security** section: change password (on by default) and, if the backend exposes it, two-factor authentication
  (TOTP with QR code, backup codes, disable, regenerate).
- Self-contained styles (`--pachi-*` CSS variables with zero-specificity defaults), responsive layout, and translated
  texts (Italian and English, via `@ilpachi/pachi-i18n`).

## Contents

- [Requirements](#requirements)
- [Installation](#installation)
- [Mounting it in a pachifastquasar app](#mounting-it-in-a-pachifastquasar-app)
- [Using the page directly](#using-the-page-directly)
- [Security section](#security-section)
- [Reference](#reference)
- [Backend contract](#backend-contract)
- [Avatar](#avatar)
- [Translations](#translations)
- [Styling](#styling)
- [Troubleshooting](#troubleshooting)
- [Changelog](#changelog)
- [License](#license)

## Requirements

Peer dependencies (declared in `package.json`, installed by your app):

| Package | Range | Notes |
| --- | --- | --- |
| `vue` | `^3.5.0` | |
| `quasar` | `^2.20.0` | The personal data fields are `QInput` components. |
| `@quasar/extras` | `^2.0.0` | Icons are SVG paths from `@quasar/extras/mdi-v7`. |
| `vue-i18n` | `^11.0.0` | |
| `@ilpachi/pachi-i18n` | `>=0.1.0 <1.0.0` | Messages and `usePachiI18n`. |
| `@ilpachi/use-alova` | `^2.1.1` | Required: HTTP client of the Security section (instance registered by `createPachiApp`). |

The package ships ES modules only (`"type": "module"`) with TypeScript declarations. Unlike the settings package it
needs no Pinia. The Security section uses the `@ilpachi/use-alova` client registered by the shell (see
[Security section](#security-section)); the runtime dependency `qrcode-generator` is installed with the package.

## Installation

```bash
pnpm add @ilpachi/fastquasar-profile
```

Install the peer dependencies too if your app does not have them yet: `@ilpachi/pachi-i18n`, `@ilpachi/use-alova`, `@quasar/extras`, `quasar`, `vue`, `vue-i18n`.

## Mounting it in a pachifastquasar app

With the `@ilpachi/pachifastquasar` shell the route and the menu entry need no code: the shell scans
`node_modules/@ilpachi/*` for two modules of every package and registers what they export.

| Module (sub-path) | Default export | What the shell does with it |
| --- | --- | --- |
| `@ilpachi/fastquasar-profile/routes` (`dist/routes.js`) | an array of route records | Adds the `/user/profile` route to the router. |
| `@ilpachi/fastquasar-profile/menu` (`dist/menu.js`) | a menu factory `getMenuItem(ctx)` | Adds the "Profile" entry to the account menu. |

The scan is configured once in the app router (this is the default of the generated apps):

```ts
// src/router/index.ts
import { defineRouter } from '#q-app'
import { createPachiRouter } from '@ilpachi/pachifastquasar'
import { pachiConfig } from 'src/pachi-config'

export default defineRouter(function () {
  return createPachiRouter({
    config: pachiConfig,
    env: import.meta.env,
    mode: import.meta.env.QUASAR_VUE_ROUTER_MODE,
    base: import.meta.env.QUASAR_VUE_ROUTER_BASE,
    features: import.meta.glob('/src/features/**/routes.ts', { eager: true, import: 'default' }),
    packages: import.meta.glob('/node_modules/@ilpachi/*/{routes,dist/routes,src/routes}.{ts,js}', {
      eager: true,
      import: 'default',
    }),
    menus: import.meta.glob('/node_modules/@ilpachi/*/{menu,dist/menu,src/menu}.{ts,js}', {
      eager: true,
      import: 'default',
    }),
  })
})
```

### Tell the page who the user is

The route component does not know your authentication layer, so register a getter once at startup (for example in the
boot file). The getter is called at every render: if it reads a reactive store, the page updates by itself. Until it
returns a user the page shows a skeleton.

```ts
// src/boot/pachi.ts
import { defineBoot } from '#q-app'
import { AuthManager, createPachiApp } from '@ilpachi/pachifastquasar'
import { setPachiProfileUser } from '@ilpachi/fastquasar-profile'
import { pachiConfig } from 'src/pachi-config'

export default defineBoot((ctx) => {
  createPachiApp(ctx, { config: pachiConfig /* , messages */ })

  // userInfo is the (reactive) response of GET /api/auth/user, `null` when there is no session
  setPachiProfileUser(() => AuthManager.getInstance().userInfo)
})
```

### The route

```ts
{
  path: '/user/profile',
  meta: {
    hidden: true, // not shown in the side menu, reachable from the account menu
    titleKey: 'pachiProfile.pageTitle',
    descriptionKey: 'pachiProfile.description',
    icon: mdiAccountCircleOutline,
  },
  beforeEnter: () => ensureMessages(), // registers the package messages before the title is rendered
  component: () => import('./components/PachiProfileRoute'),
}
```

To enable MFA on the package's own route call `setPachiProfileSecurity({ mfa: true })` once at startup (options as in the `security` prop).

The page is read-only by default. To let users edit first name, last name and email (`PATCH /auth/user`, backend 0.10.0+) call
`setPachiProfileEdit({ onUpdated: () => authManager.refreshUserInfo() })` once at startup, or pass `:editable="true"` to `PachiProfilePage`.
Changing the email asks for the current password. `onUpdated` receives the user returned by the backend: use it to refresh the app's copy.

`PachiProfileRoute` renders `PachiProfilePage` with `user = getPachiProfileUser() ?? null`. It passes the object as it
is, so the dates shown come from `lastLoginAt` and `createdAt`.

### The menu factory

`menu.ts` exports `getMenuItem(ctx)` (also as default export). It follows the `PachiMenuItemFactory` contract of the
shell, but the context type is declared locally (`IPachiProfileMenuContext`), so the package never imports the shell.

```ts
getMenuItem({ t, config }) // =>
{
  label: t('pachiProfile.menuLabel'),
  caption: t('pachiProfile.menuCaption'),
  icon: mdiAccountCircleOutline,
  to: '/user/profile',
  order: 10,
  visible: config?.auth?.menu?.showProfile ?? true,
}
```

The entry is hidden when the shell is configured with `auth.menu.showProfile = false` (`QCLI_AUTH_MENU_PROFILE=false`).

### Replacing the route with your own

To use another avatar, another path, or to add content, disable the package routes with
`ilpachi-fastquasar-profile-disable-route` (the account-menu entry disappears with them) and mount the page in a
feature of the app:

```ts
// src/features/account/routes.ts
import { defineComponent, h } from 'vue'
import type { RouteRecordRaw } from 'vue-router'
import { AuthManager, PachiGravatar } from '@ilpachi/pachifastquasar'
import { PachiProfilePage } from '@ilpachi/fastquasar-profile'

const ProfileRoute = defineComponent(() => () => {
  const user = AuthManager.getInstance().userInfo
  return h(
    PachiProfilePage,
    { user },
    { avatar: () => (user ? h(PachiGravatar, { email: user.email }) : null) },
  )
})

export default [
  { path: '/account/profile', meta: { hidden: true, title: 'Profile' }, component: ProfileRoute },
] as RouteRecordRaw[]
```

## Using the page directly

Outside the shell, import the component and pass the user:

```vue
<template>
  <pachi-profile-page :user="userInfo">
    <template #avatar="{ initials }">
      <my-avatar :email="userInfo?.email" :fallback="initials" />
    </template>
  </pachi-profile-page>
</template>

<script setup lang="ts">
import { PachiProfilePage } from '@ilpachi/fastquasar-profile'
import type { IPachiProfileUser } from '@ilpachi/fastquasar-profile'

defineProps<{ userInfo: IPachiProfileUser | null }>()
</script>
```

To show fixed texts instead of the formatted dates, pass `last-login` and `member-since`:

```vue
<pachi-profile-page :user="userInfo" last-login="today" member-since="2024" />
```

## Security section

Below the identity and personal data cards the page shows a **Security** section (`PachiProfileSecurity`):

- **Change password** (on by default): current password, new password and confirmation. The new password must reach a
  minimum length (default **12**, option `minPasswordLength`); when the backend answers `422 auth.password_too_short`
  with `params.min_length`, the minimum shown is updated and the form is validated again.
- **Two-factor authentication** (opt-in with `mfa: true`): shown **only** if `GET /api/mfa/status` answers 2xx. On
  `404`, `403` or any error the panel is not rendered and no error dialog is shown.

Choose the blocks with the `security` prop of the page (`true` by default, `false` hides the section):

```vue
<pachi-profile-page
  :user="userInfo"
  :security="{ mfa: true, minPasswordLength: 12, mfaMethods: ['totp'] }"
  @password-changed="onPasswordChanged"
/>
```

The components can also be used on their own: `PachiProfileSecurity`, `PachiChangePasswordForm`, `PachiMfaPanel` and
`PachiMfaQrCode`.

### After a password change

The backend revokes **every** token of the user when the password changes, so the client must log out locally and
sign in again. The package does not import the shell; it uses a contract:

1. a success message is shown ("Password changed. Please sign in again with the new password.");
2. the `password-changed` event is emitted (on the form, the security section and the page);
3. after about 2.5 seconds it calls, in this order of preference, the `onPasswordChanged` option of `security`
   (`afterChange` prop of the form) or the function injected with `provide('pachiLogout', async () => void)`. The
   `@ilpachi/pachifastquasar` shell provides `pachiLogout` (local logout and redirect to the login page).

Without either one, handle `password-changed` yourself. Passwords are never logged.

### HTTP client

Requests go through the `@ilpachi/use-alova` client (authentication, token refresh) of the instance registered by
`createPachiApp` of the shell (`getUseAlovaInstance()`), with the base URL `/api` (option `apiBase`) and
`meta: { autoError: false }`, so errors are displayed inline instead of in the shell dialog. The client is cached per
factory and `apiBase`. To use a different client (tests, custom clients) call `setPachiProfileHttp((apiBase) => client)`
once, where `client` has `Get(url, config?)` and `Post(url, data?, config?)`. Without a registered instance (call
`createUseAlova()` or the shell) nor a custom client the Security section throws a clear error.

### Error messages

The message for an error `{ code, msg, params }` is, in order: the app translation `errors.codes.<code>`; the package
translation for the same code (`pachiProfile.security.codes.<code with dots replaced by _>`); the `msg` sent by the
backend; a message for the status (`429`: "Too many attempts"). A `429` never crashes a form: it is shown as text.

### Two-factor authentication

When the status is available the panel lets the user:

- **enable TOTP**: the `otpauth_uri` is drawn as a QR code (generated in the browser with
  [`qrcode-generator`](https://www.npmjs.com/package/qrcode-generator), loaded lazily and without network access),
  the secret is shown in plain text with a copy button, and the **backup codes** are shown once with a warning to
  save them. The user then confirms with the 6-digit code;
- **enable email codes** (two steps: the code is sent, then confirmed), only if listed in `mfaMethods` (`['totp']` by default, since they need a delivery
  channel on the backend). The backend emails a code that the user types to confirm (older backends enabled the method at once and returned backup codes: still handled);
- **enable SMS codes** (two steps: the user types the phone number in international format with the leading `+`, e.g. `+39 333 1234567`, the backend texts a code, the user confirms it), only if `'sms'` is in `mfaMethods`
  (backend pachifast 0.7.2+, with an SMS channel configured);
- **regenerate the backup codes** and **disable** MFA, both asking for the password.

Errors handled with a clear message: `409 mfa.already_enabled` (disable it first), `401 mfa.code_invalid` and
`400 mfa.totp_invalid` (wrong code), `400 mfa.password_incorrect` and `429 mfa.too_many_attempts`. After five wrong
codes the account is locked, so a `429` also shows a warning about it.

### Resending email/SMS codes

The backend (0.15.0+) enforces a 30 s pause between two sends. After each send the "Send the code again" button is
disabled for 30 s (with a countdown); on `429 auth.rate_limited` it stays disabled for `Retry-After` seconds, or 30 s
when the header is missing or not exposed through CORS.

### Lockout countdown

When the backend answers `429` with a `Retry-After` header (seconds, or an HTTP date; the header must be exposed
through CORS), the change password form and the MFA panel (confirm code, disable, regenerate backup codes) show a
warning with a live countdown ("Too many attempts, try again in mm:ss") and disable the submit button until it
expires; then the warning disappears and the button is enabled again. The timer is stopped when the component is
unmounted. Missing, malformed, negative or longer than one day values are ignored: the previous behaviour applies
(a text message, no countdown). `ResponseError` of `@ilpachi/use-alova` keeps the `Response`, so the header is read
from `error.response.headers`.

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
| `PachiChangePasswordForm` | component | Props `minPasswordLength` (12), `apiBase` (`/api`), `afterChange`, `logoutDelay` (2500 ms); event `password-changed`. |
| `PachiProfileEditForm` | component | Edit form for first name, last name and email (`PATCH /auth/user`, only changed fields; the current password is asked to change the email). Props `user`, `apiBase`; events `updated` (user from the backend) and `cancel`. |
| `setPachiProfileEdit(options)` / `getPachiProfileEdit()` | function | Enables editing on the package's own route: `true` or `{ apiBase, onUpdated }` (e.g. `onUpdated: () => authManager.refreshUserInfo()`). |
| `IPachiProfileEditOptions` | type | `enabled`, `apiBase`, `onUpdated`. |
| `PachiMfaPanel` | component | Props `apiBase`, `methods` (`['totp']`). Rendered only if `GET /mfa/status` answers 2xx. |
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

## Backend contract

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
- The `/mfa` routes exist only when the backend registers `MfaModule`; without it `GET /mfa/status` answers `404` and
  the panel stays hidden.

## Avatar

Resolution order inside the identity card:

1. the `avatar` slot, if provided;
2. an image from `inject('pachiAvatarUrl')`, a function `(email, size?) => Promise<string | null>`. The shell
   (`createPachiApp`) provides it with Gravatar when `app.gravatar` is `true` (opt-in; `null` by default); the page calls it with the user
   email and size `216`, again every time the email changes. If it returns `null`, rejects, or the image fails to load
   (Gravatar answers 404 for unknown addresses), the next step is used;
3. the initials.

To provide your own resolver outside the shell:

```ts
app.provide('pachiAvatarUrl', async (email: string | null | undefined, size = 216) =>
  email ? `https://avatars.example.org/${encodeURIComponent(email)}?s=${size}` : null,
)
```

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

## Styling

The package works on its own. It loads default values for the theme variables with zero specificity (`:where(...)`), a
dark theme on `:root`, a light theme on `body.body--light`, and a compact density on `:root[data-density='compact']`. If
the project defines the same `--pachi-*` variables, its values win. No CSS class of the host project is required, and
the component styles are not `scoped` (classes start with `pachi-profile-`).

CSS variables read by the page (defaults: dark / light):

| Variable | Dark default | Light default | Used for |
| --- | --- | --- | --- |
| `--pachi-bg` | `#0a0d12` | `#f0f4f8` | Initials colour on the accent gradient |
| `--pachi-surface` | `#10141b` | `#ffffff` | Cards |
| `--pachi-surface-2` | `#161b23` | `#e8edf3` | Section header, skeleton |
| `--pachi-surface-3` | `#1c2230` | `#dde3eb` | Skeleton shimmer |
| `--pachi-border` | `#1f2530` | `#d1d9e0` | Borders |
| `--pachi-ink` | `#e6eaf2` | `#1a2232` | Main text |
| `--pachi-muted` | `#7b8494` | `#6b7688` | Labels, user id |
| `--pachi-accent` | `#2dd4bf` | `#2dd4bf` | Avatar gradient, glow |
| `--pachi-accent-deep` | `#0f766e` | `#0d9488` | Avatar gradient |
| `--pachi-green` | `#34d399` | `#059669` | "Active" badge |
| `--pachi-amber` | `#fbbf24` | `#d97706` | "Staff" badge |
| `--pachi-amber-soft` | `rgba(251,191,36,.14)` | `rgba(217,119,6,.1)` | "Staff" badge background |
| `--pachi-blue` | `#60a5fa` | `#2563eb` | "Email verified" badge |
| `--pachi-violet` | not defined (fallback `#a78bfa`) | same | "Superuser" badge (optional variable) |
| `--pachi-card-r` | `12px` (compact `8px`) | same | Card radius |
| `--pachi-font` | `'Geist', 'Inter Tight', system-ui, -apple-system, sans-serif` | same | Text font |
| `--pachi-mono` | `'Geist Mono', 'JetBrains Mono', ui-monospace, monospace` | same | User id and dates |

The defaults file also defines, for projects that share the same theme: `--pachi-border-hi`, `--pachi-ink-2`,
`--pachi-faint`, `--pachi-accent-soft`, `--pachi-accent-mid`, `--pachi-accent-ink`, `--pachi-blue-soft`,
`--pachi-red`, `--pachi-red-soft`, `--pachi-title-font`, `--pachi-row-h` and `--pachi-pad`.

## Troubleshooting

**The page stays a skeleton.** `user` is `null` or `undefined`. On the route this means `setPachiProfileUser` was never
called, or the getter returns `null` (no session, authentication disabled, user info not loaded yet). Register the
getter once at startup.

**`setPachiProfileUser` seems to have no effect (development only).** The getter lives in module scope, so the module
must be loaded once. In development Vite pre-bundles dependencies, while the routes and menu of the packages are loaded
with `import.meta.glob` as raw files: the package could end up in two copies, and the route reads a getter that was
never set. Exclude the `@ilpachi/*` packages from the pre-bundling:

```ts
// quasar.config.ts
build: {
  extendViteConf(viteConf) {
    viteConf.optimizeDeps = {
      ...viteConf.optimizeDeps,
      exclude: [...(viteConf.optimizeDeps?.exclude ?? []), '@ilpachi/fastquasar-profile'],
    }
  },
}
```

`definePachiQuasarConfig` of `@ilpachi/pachifastquasar` already does this for every `@ilpachi/*` dependency of the app
(and de-duplicates `vue`, `quasar`, `vue-i18n` and the other singletons through `resolve.dedupe`); you only need the
snippet above outside the shell. The related symptom with Quasar itself (two copies of `quasar` in development) does not
affect this package: it only renders Quasar components, which use the `$q` of the app.

**Initials instead of the picture.** The user has no email, the app did not provide `pachiAvatarUrl` (Gravatar is off unless
`app.gravatar: true`), or Gravatar has no image for that address (it is requested with `d=404`, so the initials
are the intended result).

**Dates show "—".** The value is `null`, missing, or not parseable by `new Date()`. Send ISO 8601 strings, or pass
`last-login` / `member-since` as text.

**Wrong month or time format.** Dates follow the active i18n language (`Intl.DateTimeFormat`); an invalid locale code
falls back to Italian (`it`).

## Changelog

See [CHANGELOG.md](./CHANGELOG.md).

## License

[MIT](./LICENSE) © ilPachi
