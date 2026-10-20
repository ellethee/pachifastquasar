# Compat pachifast

OPTIONAL smoke test of the frontend packages against a real `pachifast` backend. It does not block any pipeline.

- `backend/`: minimal pachifast app (sqlite, `core_module` + `AdminModule`, `compat.item` model registered in the admin,
  versioned `compat` migration; `admin` (superuser) and `limited` (no permissions) users created by `backend.sh`).
- `backend.sh`: `setup | prepare | start | stop | version | all` (uv venv in `backend/.venv`, data in a temporary
  folder, `.state` remembers which one; the backend runs in the background and is stopped by PID).
- `smoke/`: private workspace package `ilpachi-compat-smoke` (Vitest) that uses the `dist` of `fastquasar-settings`
  (`SettingsManager`), `fastquasar-admin` (`createAdminApi`, `buildPayload`) and `@ilpachi/use-alova` against the backend:
  profile (`PATCH /auth/user`: 200, `422` on invalid data, `400 user.email_exists`, same password change ->
  `422 auth.password_unchanged`) and pagination of `/admin/user`;
  auth (`/auth/token`, rotating refresh, logout, envelope), user settings (schema with `apply`/`default`, valid/invalid
  `PUT` `422 user.settings_value_invalid`, `PATCH`), generic admin (models, `_schema`, list with
  sorting/filter/search, CRUD, `_options`, bulk action, history, `403`, `404`/`422` errors).
  The shell's `AuthManager` is not covered (it requires the browser): login and refresh are verified against the HTTP contract.

## In CI

An optional workflow can run the same flow (manual or scheduled, with `continue-on-error`), passing
`PACHIFAST_VERSION` and, if a private index is needed, `PACHIFAST_INDEX_URL`/`UV_INDEX_NAME` with the credentials in
`UV_INDEX_<NAME>_USERNAME/PASSWORD` (CI secrets, never in the repo).

## Locally

```bash
# default: pachifast from PyPI; alternatives: PACHIFAST_INDEX_URL (+ credentials UV_INDEX_<NAME>_*) or PACHIFAST_SOURCE=<path>
pnpm install && pnpm --filter "ilpachi-compat-smoke..." --filter '!ilpachi-compat-smoke' build
COMPAT_PORT=8030 compat/backend.sh all          # installs pachifast, prepares the data, starts
COMPAT_PORT=8030 pnpm -C compat/smoke smoke
compat/backend.sh stop
```

`COMPAT_PASSWORD` changes the password of the test users (default `Compat-Test-1234!`, a throwaway local credential
of the temporary backend, not a secret; it must match between `backend.sh` and `smoke`, which read the same variable).

`COMPAT_STRICT_DEFAULTS=1` makes the check on the admin schema `default` values blocking (see below).

## Status

Tested with pachifast 0.17.0 (PyPI; the sectioned `pachifast.yaml` of `backend/` needs >= 0.16). For the cookie refresh mode start the backend with `PACHIFAST_REFRESH_MODE=cookie compat/backend.sh all` (pachifast >= 0.17). The known mismatch of 0.6.0 (`_schema`:
`fields.<field>.default` equal to `5`, i.e. SQLAlchemy's `DONT_SET`) is fixed: the check also passes with
`COMPAT_STRICT_DEFAULTS=1`.

Since 0.15, `GET /admin/user` paginates by default at 25 rows (max 200) with envelope `{items,total,page,pageSize,pages}`;
`fastquasar-admin` always sends `page`/`pageSize` and reads `total`, so it is unaffected (smoke in `profile.test.ts`).
The minimal app does not mount the audit module (`/admin/audit/logs`), which the frontend does not use.
