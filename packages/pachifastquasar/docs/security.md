# Security

This page collects the security-relevant behaviour of the shell and its companion packages, and what an application should do about
it. The packages are in beta: review this page before exposing an app built on them.

## Where the session lives

`AuthManager` keeps the session in a Pinia store (`auth`) persisted with `pinia-plugin-persistedstate` under the single key `auth`.
It contains the access token, the token type, its expiry, the **refresh token** and the user info.

- The storage is `localStorage` by default; `QCLI_AUTH_STORAGE=session` (`auth.storage: 'session'`) uses `sessionStorage`, so the
  session ends with the tab. The choice is read lazily at run time.
- Both are readable by any script running on the same origin: **an XSS flaw exposes the tokens**. The mitigation is a strict CSP
  (below), no third-party scripts, and the shortest backend token lifetimes you can accept. HttpOnly cookies are not used.
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

## Reporting a vulnerability

See `SECURITY.md` in the repository root.
