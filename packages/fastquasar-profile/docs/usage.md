# Usage

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
- **enable SMS codes** (two steps: the user types the phone number, the backend texts a code, the user confirms it), only if `'sms'` is in `mfaMethods`
  (backend pachifast 0.7.2+, with an SMS channel configured);
- **regenerate the backup codes** and **disable** MFA, both asking for the password.

Errors handled with a clear message: `409 mfa.already_enabled` (disable it first), `401 mfa.code_invalid` and
`400 mfa.totp_invalid` (wrong code), `400 mfa.password_incorrect` and `429 mfa.too_many_attempts`. After five wrong
codes the account is locked, so a `429` also shows a warning about it.

### Lockout countdown

When the backend answers `429` with a `Retry-After` header (seconds, or an HTTP date; the header must be exposed
through CORS), the change password form and the MFA panel (confirm code, disable, regenerate backup codes) show a
warning with a live countdown ("Too many attempts, try again in mm:ss") and disable the submit button until it
expires; then the warning disappears and the button is enabled again. The timer is stopped when the component is
unmounted. Missing, malformed, negative or longer than one day values are ignored: the previous behaviour applies
(a text message, no countdown). `ResponseError` of `@ilpachi/use-alova` keeps the `Response`, so the header is read
from `error.response.headers`.

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
