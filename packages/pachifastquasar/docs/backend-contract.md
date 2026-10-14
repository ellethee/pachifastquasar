# Backend contract

The shell is written against a **pachifast** backend (FastAPI). This page lists what the frontend expects. Paths
are relative to the origin serving the application (in development the dev server proxies `/api` to
`QCLI_PROXY_TARGET`). JSON field names are camelCase.

**Minimum pachifast version:** 0.2.0 (rotating refresh tokens; the WebSocket ticket exists since 0.1.5, login with MFA since 0.1.0). See the pachifast CHANGELOG.

## Response envelope

Successful responses are wrapped:

```json
{ "success": true, "message": "OK", "data": { "id": "..." } }
```

The client returns only `data`. `DELETE` answers `204 No Content` with no body. A backend started with
`PACHIFAST_ENVELOPE_ENABLED=false` returns plain bodies: set `http.envelope: false`
(`QCLI_HTTP_ENVELOPE=false`).

## Errors

Errors are non-2xx responses with a `detail` array:

```json
{
  "detail": [
    {
      "loc": ["body", "password"],
      "msg": "Password too short",
      "type": "value_error",
      "code": "auth.password_too_short",
      "params": { "min_length": 12 }
    }
  ]
}
```

- `code` is a stable identifier. The frontend translates `errors.codes.<code>` (with `params` as placeholders)
  and falls back to `msg`. FastAPI's own 422, 404 and 405 errors have no `code`.
- `detail` may also be a plain string.
- Export the translations into the application with
  `pachifast locale export --base-dir <backend> --dest-path src/i18n/generated --namespace errors.codes`
  (`--check` to detect outdated files). See [Internationalization](i18n.md#backend-error-codes).

## Pagination, sorting and filters

List endpoints used by `@ilpachi/pachi-kit/table`:

```text
GET /api/things?page=1&pageSize=50&orderBy=name,-createdAt&search=text&status=active
```

| Parameter  | Meaning                                                                         |
| ---------- | ------------------------------------------------------------------------------- |
| `page`     | page number, starting at 1                                                      |
| `pageSize` | rows per page                                                                   |
| `orderBy`  | comma-separated columns, prefix `-` for descending (`name,-createdAt`)          |
| `search`   | free-text search                                                                |
| others     | **exact-match** filters on fields (extra query parameters)                      |

Response (inside the envelope):

```json
{ "items": [ { "id": "..." } ], "total": 120, "page": 1, "pageSize": 50 }
```

typed as `IPaginatedResponse<T>`. With local pagination the table sends only `page` and `pageSize`.

## Authentication endpoints

| Method and path                    | Request                                                                  | Response                                          |
| ---------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------- |
| `POST /api/auth/token`             | form-urlencoded `username`, `password`, `scope=`, `grant_type=password`   | `{ access_token, token_type, refresh_token }`, or `{ mfa_required: true, mfa_token }` when MFA is active |
| `POST /api/mfa/verify`             | `{ "mfa_token": "...", "code": "..." }` (snake_case, no auth)            | `{ access_token, token_type, refresh_token }` (envelope accepted) |
| `POST /api/auth/refresh-token`     | `{ "refresh_token": "..." }`                                             | `{ access_token, token_type, refresh_token }` (rotating: the new refresh token replaces the old one) |
| `POST /api/auth/logout`            | Bearer; optional `{ "refresh_token": "..." }` (that login only; no body = all logins) | `204`, no body                      |
| `GET /api/auth/user`               | Bearer                                                                   | user (`IUserInfo`, see [Authentication](authentication.md#user-model)) |
| `GET /api/infos/engines`           | Bearer, superuser only                                                   | `[{ serverType, scope, host, dbname }]` (optional) |

### MFA and password errors

Errors use the uniform `{ detail: [{ code, msg, loc, params? }] }` format. The shell shows
`errors.codes.<code>` (generated from the backend, see [i18n](i18n.md)) and falls back to `msg`:

| Status and code | Where | Shell behavior |
| --- | --- | --- |
| `401 mfa.code_invalid` | `/mfa/verify` | inline message, retry |
| `429 mfa.too_many_attempts` with `Retry-After` (locked account) | `/mfa/verify`, login | countdown until unlock (CORS must expose `Retry-After`), then back to the first step |
| `429 mfa.too_many_attempts` without `Retry-After` (challenge used up) | `/mfa/verify` | back to the first step, log in again |
| `401 mfa.token_invalid`, `mfa.challenge_not_found` | `/mfa/verify` | back to the first step (expired challenge) |
| `409 mfa.already_enabled`, `400 mfa.password_incorrect` | `/mfa/*` management | shown by the error dialog |
| `400 auth.password_incorrect`, `auth.password_too_short` (`params.min_length`) | password change | shown by the error dialog |
| `401 auth.refresh_token_revoked` | `/auth/refresh-token` | immediate local logout, no retry |
| `429` without a usable `detail` | any | generic "too many requests" message (`errors.http.tooManyRequests`) |

A password change revokes every token of the user: the client must discard its session with `pachiLogout`
(see [Authentication](authentication.md#local-logout-for-packages-pachilogout)) instead of calling logout.

The access token must be a JWT with an `exp` claim (the shell schedules renewal 60 seconds before expiry). A
401 on an authenticated request triggers one refresh and one retry.

## Events WebSocket

| Endpoint                                    | Description                                                                              |
| ------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `POST /api/core/events/ticket`              | returns `{ "ticket": "..." }`: single-use, valid about 30 seconds; Bearer required       |
| `GET /api/core/events/ws?ticket=<ticket>`   | WebSocket; a fresh ticket is requested at every (re)connection                           |
| `GET /api/core/events/ws?token=<jwt>`       | legacy fallback when the ticket endpoint answers 404 or 405                              |

Close codes: `4401` token missing, invalid or expired (the client refreshes and reconnects); `4403` the
superuser role changed (immediate reconnection). Events carry `login`, `logout` and activity entries used by
the dashboard widgets.

## User settings

Used by `@ilpachi/fastquasar-settings`:

| Method and path                                | Description                                                              |
| ---------------------------------------------- | ------------------------------------------------------------------------ |
| `GET /api/auth/user/settings`                  | current values of the user settings                                      |
| `GET /api/auth/user/settings/schema`           | JSON schema of categories and fields used to render the page             |
| `PUT /api/auth/user/settings/{category}/{key}` | save one value                                                           |

Schema texts can be translated with `titleKey`, `labelKey` and similar keys under the `settings` root.

## Dashboard widgets

`@ilpachi/fastquasar-dashboard-widgets` reads configurable endpoints (the examples use `/api/core/activity` and
`/api/core/system`). The URL is a prop of the widget, so any backend path works as long as the response shape
matches the widget.

## Checklist for a compatible backend

1. Same-origin serving (or a reverse proxy) for `/api` and WebSocket upgrade.
2. JWT access and refresh tokens, with the endpoints above.
3. Envelope enabled, or `QCLI_HTTP_ENVELOPE=false`.
4. Errors as `{ detail: [...] }` with stable `code`s.
5. Paginated lists with the parameters and shape above.
