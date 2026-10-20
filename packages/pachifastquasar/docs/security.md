# Security

This page collects the security-relevant behaviour of the shell and its companion packages, and what an application should do about
it. The packages are in beta: review this page before exposing an app built on them.

## Where the session lives

`AuthManager` keeps the session in a Pinia store (`auth`) persisted with `pinia-plugin-persistedstate` under the single key `auth`.
It contains the access token, the token type, its expiry, the **refresh token** and the user info.

- The storage is `localStorage` by default; `QCLI_AUTH_STORAGE=session` (`auth.storage: 'session'`) uses `sessionStorage`, so the
  session ends with the tab. The choice is read lazily at run time.
- Both are readable by any script running on the same origin: **an XSS flaw exposes the tokens**. The mitigation is a strict CSP
  (below), no third-party scripts, and the shortest backend token lifetimes you can accept. To keep the refresh token out of
  reach of scripts, opt in to the cookie mode (see [Refresh token in an HttpOnly cookie](#refresh-token-in-an-httponly-cookie)).
- With `localStorage` the session is shared between tabs: a logout in one tab (a `storage` event) logs out the others.
- The MFA challenge token (between password and code) is kept in memory only and never written to storage or logged.
- `Authorization` is attached only to requests to the app origin or to relative URLs, never to other hosts; the login `?next=`
  parameter accepts only internal paths.

## Refresh token

- The access token is renewed automatically about 60 seconds before it expires (`POST /refresh-token` with `{ refresh_token }`), and
  on a `401` the failed request is retried once after a refresh. Concurrent callers share one request (single flight).
- Refresh tokens are expected to rotate: when the response carries a new `refresh_token` it replaces the used one. Other tabs adopt the
  rotated state instead of replaying a spent token.
- A rejected refresh token (revoked, expired, already used) ends the session; transient failures are retried twice (15 s apart) before
  logging out.
- `logout` sends `POST /logout` with the refresh token so the backend revokes that login; it is best effort, and issued JWTs stay valid
  until they expire.

## Refresh token in an HttpOnly cookie

`auth.refreshMode: 'cookie'` (`QCLI_AUTH_REFRESH_MODE=cookie`) is an opt-in alternative to the default `body` mode. It needs a
pachifast backend with `auth.refresh_mode` set to `cookie` or `both`.

**How it works.** `/token` and `/mfa/verify` are sent with `credentials: 'include'`; the backend answers
`{ access_token, token_type }` and sets the refresh token as an `HttpOnly` cookie (a `refresh_token` in the JSON, as with
`both`, is ignored). `POST /refresh-token` and `POST /logout` are sent with the cookie, the body `{}` and the header
`X-Pachi-Auth: refresh` (exported as `PACHI_AUTH_REFRESH_HEADER`). Nothing is persisted: access token, expiry and user info live
in memory only, so every page load starts with a silent refresh. The WebSocket keeps using the single-use ticket.

**Threat model.**

- *Protected:* the refresh token, the long-lived secret, can no longer be read by an XSS payload, a malicious dependency or a
  browser extension reading web storage, and it does not survive in a storage dump after logout.
- *Not protected:* a script running in the page can still use the in-memory access token and call the API **while the page is
  open** (as the user). It cannot take the session away, but it can act during it: CSP and dependency hygiene stay mandatory.
- *CSRF:* a cookie is sent by the browser automatically, so the two cookie endpoints require the custom `X-Pachi-Auth` header (a
  cross-site form cannot set it; the backend answers `403 auth.csrf_rejected` without it) and, when the request has an `Origin`,
  it must match the backend host. The shell logs `auth.csrf_rejected` with `console.error` and does not retry it: it means
  the proxy strips the header or the app and the API are on different origins.

**Deployment requirements.**

- `Secure` cookie: serve over **https**. Browsers accept `Secure` cookies on `http://localhost` only, so local development works
  with `localhost` (not with a LAN IP over http).
- `SameSite=Strict` (or `Lax`) and a narrow `Path` (for example `/api/auth`) on the cookie: it then travels only to the auth
  endpoints and never on cross-site requests. These attributes are set by the backend.
- Use a **same-origin proxy**: the app and `/api` on the same host (the `definePachiQuasarConfig` dev proxy, which also rewrites `Origin` to the target, or the reverse
  proxy in production). Then `SameSite=Strict` works, no CORS is involved and the `Origin` check passes. The proxy must forward
  the `X-Pachi-Auth` header and the `Host` the backend compares `Origin` with.
- A cross-origin API is not the intended setup: pachifast rejects a cookie request whose `Origin` differs from its own host. A
  backend that accepts it would need CORS with credentials (`Access-Control-Allow-Credentials: true`, an explicit
  `Access-Control-Allow-Origin`, never `*`, and `X-Pachi-Auth` in `Access-Control-Allow-Headers`) and a
  `SameSite=None; Secure` cookie, which leaves the CSRF protection to the header alone.

**Several tabs.** Every refresh runs inside the Web Lock `pachi-auth-refresh` (`navigator.locks`; without it the refresh runs
directly), so two tabs never rotate the single-use cookie at the same time. A `401` of `/refresh-token` is retried once after
300 ms (the backend keeps a short grace window for a tab that lost a rotation race) before the session is considered over. The
tabs talk over the BroadcastChannel `pachi-auth` with messages that never carry a token: `{ type: 'login' }` (tabs without a
session try a silent refresh), `{ type: 'refreshed', expires_at }` and `{ type: 'logout' }` (the other tabs log out locally,
without a request). Without BroadcastChannel each tab finds out at its next refresh.

## Content Security Policy

A starting point for a production deployment, to adapt to your app (API origin, fonts, images):

```
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob:;
font-src 'self' data:;
connect-src 'self' https://api.example.com;
object-src 'none';
base-uri 'self';
frame-ancestors 'none';
form-action 'self'
```

- **`style-src 'unsafe-inline'`**: the library CSS is bundled with `vite-plugin-css-injected-by-js`, so the styles are inserted by
  JavaScript as `<style>` elements at run time. Quasar also sets inline styles. Without `'unsafe-inline'` (or a nonce wired through
  the build) the UI loses its styles. Scripts do not need it.
- **`script-src` without `'unsafe-eval'`**: nothing in the shell needs it. Only the opt-in `allowScriptStrings` of
  `fastquasar-settings` (see below) does.
- Add `https://www.gravatar.com` to `img-src` only if you enable Gravatar.
- Set the headers (CSP, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, HSTS) on the server that serves the static files.

## CORS

The browser only lets the app read the response headers the backend lists in `Access-Control-Expose-Headers`. The UI uses
`Retry-After` on `429` responses (login lockout, MFA code cooldown, resend pause): if the backend does not expose it (pachifast:
`expose_headers=["Retry-After"]` in the CORS middleware) the countdown falls back to a default (30 s for the resend buttons) or is not
shown. List the app origin explicitly in `allow_origins`; do not combine `*` with credentials. The app talks to the API on the same
origin by default (reverse proxy or the dev proxy), which avoids CORS altogether.

## Gravatar

Avatars are initials only by default, with no external request. `app.gravatar: true` (or `QCLI_APP_GRAVATAR=true`) makes the shell
(`PachiGravatar`, and the `pachiAvatarUrl` resolver used by `fastquasar-profile`) request
`https://www.gravatar.com/avatar/<sha256 of the lowercased email>?d=404`. That discloses to a third party a hash that can be matched
against known addresses, plus the visitor's IP address (and, depending on the `Referrer-Policy`, the page URL). Enable it only if that is acceptable
for your users.

## Script actions in the settings schema

`fastquasar-settings` runs the `events` / `watch` actions declared by the backend schema. They are **named actions** resolved in a
registry (`darkToggle`, `notify`, ... and your own via `registerSettingsActions`); nothing is evaluated. A string that is not a
registered action is ignored with a warning.

`setPachiSettingsOptions({ allowScriptStrings: true })` (default `false`) re-enables a legacy fallback that runs those strings with
`new Function`. Enabling it means the backend, or anyone able to tamper with the schema response, can run code in your app (with
access to the tokens above), and it requires `'unsafe-eval'` in `script-src`. A warning is printed once per string. Keep it off.

## Known `npm audit` notice (build tooling)

`npm audit` / `pnpm audit` may report a **high** advisory for `braces` (stack exhaustion on crafted glob patterns, GHSA-vfj7-8cjw-p6xm)
reached through `@intlify/unplugin-vue-i18n` > `fast-glob` > `micromatch` > `braces`. No patched `braces` release exists yet.
The chain is the build-time Vite plugin that compiles the message files: it runs on your machine or CI against your own source tree,
and none of it is shipped in the app bundle. We track the upstream fix; until then it is an accepted, documented notice.

## Reporting a vulnerability

See `SECURITY.md` in the repository root.
