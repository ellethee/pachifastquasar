# Authentication

Authentication is optional (`auth.enabled`, `QCLI_AUTH_ENABLED=false` to turn it off). When enabled the shell
adds the login page, a navigation guard, token management and the account menu. The logic is in the
`AuthManager` singleton (`AuthManager.getInstance()`) and the Pinia store `useAuthStore`.

## Login

`LoginPage` (route `/auth/login`, `noAuth`, outside the layout) calls `AuthManager.login(username, password)`,
which returns `{ mfaRequired }`:

1. `POST /api/auth/token` with a form-urlencoded body: `username`, `password`, `scope=""`,
   `grant_type=password`. The response is `{ access_token, token_type, refresh_token }`;
2. `GET /api/auth/user` loads the user (`IUserInfo`);
3. the renewal timer is scheduled and the events WebSocket is opened;
4. the router navigates to `?next=` (internal paths only) or to `/`.

### Two-step login (MFA)

When the user has MFA enabled the backend answers step 1 with `{ "mfa_required": true, "mfa_token": "..." }`
(snake_case, with or without envelope). `login` then returns `{ mfaRequired: true }` without touching the
session: the `mfa_token` is kept **in memory only** (never in storage, never logged) and `LoginPage` shows the
second step (code field with `autocomplete="one-time-code"`, "Verify" and "Back" buttons).
`AuthManager.verifyMfa(code)` posts `{ mfa_token, code }` to `POST /api/mfa/verify` (the code is a 6-digit
TOTP/OTP or a backup code) and, on success, completes the login exactly like step 1 (same `?next=` handling).
Without MFA nothing changes.

Errors of the second step are shown inline by the page (the HTTP error dialog is turned off for this call):

| Answer | Behavior |
| --- | --- |
| `401 mfa.code_invalid` / `mfa.totp_invalid` | message, the user can try again |
| `429 mfa.too_many_attempts` (5 wrong codes, the account is then locked like after wrong passwords) | with `Retry-After` (locked account): the page stays on step 2 with a live "Account locked, try again in mm:ss" countdown and the verify button disabled, then goes back to step 1 with a message. Without the header (challenge used up): challenge discarded, back to step 1 right away |
| `401 mfa.token_invalid` / `mfa.challenge_not_found` / `mfa.not_configured` (expired or used challenge) | challenge discarded, back to step 1 with a message |

`AuthManager.hasPendingMfa` tells whether a challenge is in progress and `cancelMfa()` discards it ("Back").

The page can be customized with the `title` prop and the `logo` slot, or replaced entirely with
`config.components.loginPage`.

## Storage

Access token, token type, refresh token and user data are persisted by the Pinia store
(`pinia-plugin-persistedstate`) in `localStorage` by default. With `auth.storage: 'session'`
(`QCLI_AUTH_STORAGE=session`) they go to `sessionStorage`: limited to the tab and lost when it closes.

!!! warning
    Tokens in web storage are readable by any script running in the page (for example through an XSS flaw).
    Keep the content security policy strict and prefer `session` storage for sensitive deployments.

!!! tip "Refresh token in an HttpOnly cookie"
    With `auth.refreshMode: 'cookie'` (`QCLI_AUTH_REFRESH_MODE=cookie`) the refresh token is an HttpOnly cookie
    managed by the backend and **nothing** is persisted: access token, expiry and user info stay in memory.
    `auth.storage` is then ignored. See [Cookie refresh mode](#cookie-refresh-mode).

## Silent restore and refresh

- On navigation to a protected route the guard calls `tryRestoreSession()`: an already authenticated store
  schedules renewal and refreshes the user in the background; otherwise a stored refresh token is exchanged
  with `POST /api/auth/refresh-token` (`{ "refresh_token": "..." }` returning
  `{ access_token, token_type, refresh_token }`).
- The access token is renewed **60 seconds before it expires** (the expiry is read from the JWT `exp` claim).
  After a refresh the minimum delay is 5 seconds, which avoids loops with very short tokens.
- Refresh tokens **rotate** (backend 0.2.0): each one is single use and the response carries the next one, which
  **replaces** the stored one. Reusing a spent token answers `401 auth.refresh_token_revoked` and revokes the whole
  login. If the response has no `refresh_token` (backend with rotation off) the current one is kept.
- A failed scheduled renewal is retried twice, 15 seconds apart, then the user is logged out. A `401` (revoked,
  expired or already used refresh token) is not retried: the logout is immediate and local.
- **Several tabs** share the persisted session (`localStorage`). Before refreshing, the persisted state is read
  again: if another tab already rotated the refresh token and its access token is still valid (more than 60
  seconds left), the state is adopted and no request is made; if the token changed but the access token is
  expired, the newer refresh token is used. With `auth.storage: 'session'` tabs are independent.
- The `Retry-After` header of a `429` (seconds, or an HTTP date; invalid values are ignored) is parsed by the exported pure helpers `parseRetryAfter`, `retryAfterFromError` and `formatCountdown`. The first step of the login shows the same countdown (and disables the submit button) when the login answers `429` with `Retry-After`.
- A `429` is a normal error: it never triggers a refresh or a logout.
- Refresh is **single-flight**: concurrent 401 responses, timers and guards share one `refresh-token` request.
- On a `401` of an authenticated request the HTTP client refreshes the token and repeats the request once
  (see [HTTP client](http-client.md)). A second 401, or a failed refresh, logs the user out.
- `userInfoVersion` changes only when relevant user data really changed, so a token refresh does not remount
  the page and lose the state of open forms and dialogs.

## Cookie refresh mode

Opt in with `auth.refreshMode: 'cookie'` (default `body`, the behaviour described above); the backend must have
`auth.refresh_mode` `cookie` or `both`. Differences from the `body` mode:

- `POST /api/auth/token` and `POST /api/mfa/verify` are sent with `credentials: 'include'`; the response sets the
  cookie and a `refresh_token` in the JSON is ignored (`AuthManager.refreshToken` stays `null`).
- `POST /api/auth/refresh-token` and `POST /api/auth/logout` carry the cookie, the body `{}` and the header
  `X-Pachi-Auth: refresh` (`PACHI_AUTH_REFRESH_HEADER` / `PACHI_AUTH_REFRESH_HEADER_VALUE`).
- On load, the guard always tries one silent refresh (single flight) for a route without `meta.noAuth` when there
  is no access token in memory: a `401` redirects to `/auth/login?next=...` without an error dialog; on success
  the user info is loaded and the WebSocket connected.
- Scheduled renewal, retries and the `401` handler work as in `body` mode, based on an internal "session active"
  flag instead of the stored refresh token. A `401` of `/refresh-token` is retried once after 300 ms (rotation race
  between tabs); `403 auth.csrf_rejected` is a configuration error, logged and never retried.
- Tabs coordinate with the Web Lock `pachi-auth-refresh` and the BroadcastChannel `pachi-auth` instead of the
  `storage` event (see [Security](security.md#refresh-token-in-an-httponly-cookie)).

## Logout

`AuthManager.logout()` notifies the backend with `POST /api/auth/logout` and the body
`{ "refresh_token": "..." }` (revokes only this login; without a body the backend revokes every login of the
user; best effort: JWTs stay valid until they expire), clears tokens and user, closes the WebSocket and navigates
to `/auth/login`. `logout(false)` skips the backend call (used when the session is already invalid).

### Local logout for packages (`pachiLogout`)

`createPachiApp` provides `pachiLogout` (`PACHI_LOGOUT_KEY`, type `PachiLogout`), an async function that does a
**local** logout: it requests nothing (after a password change the backend has already revoked every token, so
`POST /api/auth/logout` would answer 401), clears tokens and user, closes the WebSocket and goes to
`/auth/login`. It never throws. Packages such as `@ilpachi/fastquasar-profile` use it after changing the password:

```ts
import { inject } from 'vue'
import type { PachiLogout } from '@ilpachi/pachifastquasar'
import { PACHI_LOGOUT_KEY } from '@ilpachi/pachifastquasar'

const logout = inject<PachiLogout>(PACHI_LOGOUT_KEY)
await logout?.()
```

## WebSocket events

After login the shell opens a WebSocket to `/api/core/events/ws` (`ws://` or `wss://` on the page host, through
the dev proxy in development), managed by `WebSocketManager` and the `usePachiEventsStore` store, which keeps
`recentActivity`, `recentLogins` and `recentLogouts`.

- The URL is computed at every (re)connection. The shell first requests a **single-use ticket**
  (`POST /api/core/events/ticket`, valid about 30 seconds) and connects with `?ticket=<ticket>`. If the backend
  answers 404 or 405 it falls back to `?token=<access token>` (older backends). The access token is therefore
  not placed in the URL of modern backends.
- Close code `4401` (missing, invalid or expired token): the shell refreshes the token and reconnects; a repeated
  4401 within 10 seconds ends in logout.
- Close code `4403` (the superuser role changed): immediate reconnection.
- Reconnection uses exponential backoff from 1 second up to 30 seconds. If the connection has never opened (for
  example the backend has events disabled) it gives up after 5 attempts.
- If `isSuperuser` changes after a user refresh the socket is reopened so the backend can recompute what the
  user receives.

Other components subscribe to events through the store (`usePachiEventsStore`) rather than opening sockets.

## Route authorization

`AuthManager.canAccess(meta)` is evaluated by the navigation guard:

1. not authenticated: denied;
2. superuser: always allowed;
3. `meta.requireSuperuser`: denied for non-superusers;
4. `meta.requireStaff`: denied for non-staff;
5. `meta.permissions`: the user must have **all** of them. A required permission `app` is satisfied by `app`
   or by any granted permission starting with `app.` (a prefix match on the dotted name).

```ts
{ path: '/admin/users', component: UsersPage, meta: { requireStaff: true, permissions: ['users.view'] } }
```

Convenience helpers: `isAdminUser()`, `isStaffUser()`, `getUserInfo()`, `refreshUserInfo()`,
`getExtraInfo()` (`GET /api/infos/engines`, superuser only; failures yield an empty list without an error
message). The default landing page is `/` (`getDefaultLandingPath()`).

!!! note
    Authorization in the frontend only improves the experience. The backend must enforce permissions on every
    endpoint.

## User model

```ts
interface IUserInfo {
  id: string // UUID
  username: string
  email: string | null
  firstName: string
  lastName: string
  isActive: boolean
  isStaff: boolean
  isSuperuser: boolean
  permissions: string[]
  emailVerifiedAt?: string | null // ISO 8601 UTC
  lastLoginAt?: string | null
  createdAt?: string | null
}
```

## Security notes

- The `Authorization` header is sent only to relative or same-origin URLs.
- The login `?next=` parameter accepts only internal paths.
- Gravatar is off by default; if you opt in (`QCLI_APP_GRAVATAR=true` / `app.gravatar: true`) it receives the SHA-256 hash of the user email. See [Security](security.md).
