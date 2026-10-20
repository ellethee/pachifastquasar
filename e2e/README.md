# ilpachi-e2e

End-to-end suite (Playwright) that drives the real playground app (auth enabled) against a real pachifast backend:
the minimal compat backend in `compat/backend/`. Private workspace package, never published. Optional: it is not part
of `pnpm check` nor of the CI workflow.

## What it covers

| Spec | Scenarios |
| --- | --- |
| `auth.spec.ts` | valid admin login lands on the home dashboard, wrong password shows an error, logout drops the session |
| `guard.spec.ts` | anonymous visit redirects to `/auth/login?next=...`, return to the requested route after login, 404 page |
| `profile.spec.ts` | profile page, first/last name edit (`PATCH /auth/user`, restored afterwards), same-password change shows `auth.password_unchanged` on the field |
| `admin.spec.ts` | `fastquasar-admin` item table: search and pagination over seeded rows (created and deleted through the API), non-staff user sees nothing |
| `a11y.spec.ts` | `@axe-core/playwright` (WCAG 2 A/AA) on login (light and dark) and home: no serious/critical violations; moderate/minor are annotations |
| `layout.spec.ts` | login in light/dark theme and at 390px: no horizontal scroll, the logo image is loaded and inside the viewport |
| `kit.spec.ts` | playground page `/kit` using `@ilpachi/pachi-kit` (`ui`: popup edit, duotone icon, confirm dialog; `dialog`: programmatic `PachiDialog`) |
| `refresh-cookie.spec.ts` | `auth.refreshMode: 'cookie'`: against the real backend (4 tests: reload, two tabs reloading together, logout in one tab, 403 without the CSRF header; skipped unless the backend sets the refresh cookie: `PACHIFAST_REFRESH_MODE=cookie compat/backend.sh all`, pachifast >= 0.17) and against a backend simulated with `context.route` (reload with silent refresh, anonymous visit to the login, two tabs sharing the cookie, logout in one tab logs out the other); the playground switches mode through `localStorage['pachi-playground-refresh-mode'] = 'cookie'` |
| `mfa.spec.ts` | MFA SMS two-step enrolment: skipped (the compat backend has no SMS channel and the playground enables only the password block) |

Each test builds its own state: the admin test seeds rows with a unique prefix and removes them, the profile tests use
the `limited` user and restore its name, nothing depends on the order of the specs. The UI language is pinned to
`en-US` by `playwright.config.ts`.

## Prerequisites

- Node >= 20 and pnpm (`pnpm install` at the repository root).
- A browser: either the system Chrome (`E2E_CHANNEL=chrome`) or the Playwright Chromium (`pnpm e2e:install`).
- The compat backend installed (see `compat/README.md`), for example:

  ```bash
  PACHIFAST_VERSION=0.17.0 PACHIFAST_INDEX_URL=<registry simple index> compat/backend.sh setup
  ```

## Running

```bash
compat/backend.sh all            # database, migrations, users admin/limited, server on COMPAT_PORT (default 8030)
pnpm build:playground            # builds the shell and the playground into playground/dist/spa
E2E_CHANNEL=chrome pnpm e2e      # or just `pnpm e2e` with the Playwright Chromium; extra args are forwarded
compat/backend.sh stop
```

`pnpm -C e2e e2e -- tests/a11y.spec.ts` runs a single spec; the HTML report is written to `e2e/playwright-report/`.

Variables: `COMPAT_PORT` (backend port, default 8030), `COMPAT_PASSWORD` (password of the test users, same default as
`compat/backend.sh`), `E2E_APP_PORT` (port of the app server, default 9100), `E2E_CHANNEL` (browser channel).

## How it works

- `scripts/serve.mjs` is a dependency-free Node server: it serves `playground/dist/spa` (history-mode fallback to
  `index.html`) and proxies `/api` to the backend. Playwright starts it through `webServer` in `playwright.config.ts`
  (the production build is served, so the run is stable and does not depend on the Vite dev server).
- `tests/helpers/backend.ts` talks to the backend API directly (login, seeding, cleanup), `tests/helpers/ui.ts` holds the
  login/logout steps and the accessible labels.
- The playground boot wires the profile package (`setPachiProfileUser`, `setPachiProfileEdit`,
  `setPachiProfileSecurity`), otherwise `/user/profile` stays a skeleton.

## Known limits

- Requires a pachifast backend: the suite is not self-contained and runs against the compat app, not the user's own backend.
- No SMS/e-mail MFA flows, no multi-browser matrix (Chromium only), English UI only.
- The optional workflow `.github/workflows/e2e.yml` (manual + weekly) never blocks the pipeline.
