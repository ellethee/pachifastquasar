# Changelog

All notable changes to `@ilpachi/pachifastquasar` are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.11.0] - 2026-10-13

### Changed

- **Breaking (privacy):** `app.gravatar` / `QCLI_APP_GRAVATAR` now defaults to `false`: avatars show initials and no request is sent to
  gravatar.com. Set `app.gravatar: true` (or `QCLI_APP_GRAVATAR=true`) to opt in; Gravatar then receives a SHA-256 hash of the user email.

- Peer dependencies: `@ilpachi/use-alova` `^2.1.1`, `vue-router` `^4.0.0 || ^5.0.0`; removed `engines.pnpm` and `productName` from the published package.
- The login form ignores submits (Enter) while the lockout countdown is active.

### Added

- `docs/security.md`: token storage, refresh, recommended CSP, CORS, Gravatar and script actions.

## [2.10.3] - 2026-10-13

### Changed

- New logo (elephant head): `logo.svg` shipped in `dist/assets/`, favicon and PNG icons regenerated.
- Package metadata for the open-source distribution (description, keywords, `engines.node >=20`, repository links) and
  English README and docs with a beta notice and the minimum pachifast version (0.2.0).

## [2.10.2] - 2026-10-12

### Fixed

- The JWT expiry is read from the base64url payload (`-`, `_`, no padding): `atob` alone threw with some tokens, leaving the session without
  automatic renewal (shared `decodeJwtExpiry`, used by the login and the refresh).
- Dashboard card: Enter/Space on the "back to parent" button no longer navigates to the card (the keys are handled on the card itself only).
- The app-bar logo (`role="button"`) answers to Space too and has an accessible name.
- Navigation guard: a route the user cannot access whose default landing is the same page no longer redirects to itself forever.
- The home dashboard finds the root layout route by path instead of assuming it is the first route.

### Added

- Logging out in another tab (shared `localStorage`) logs out this tab too, locally (`storage` event).

## [2.10.1] - 2026-10-08

### Fixed

- Card title animations no longer shift the title to the left: the title scales from its left edge
  (`transform-origin`) and `wobble` moves in pixels instead of percentages of the full-width title.

## [2.10.0] - 2026-10-08

### Added

- Hover animation of the dashboard card titles (`.pachi-dc-title`) is selectable: `app.titleAnimation`
  (`QCLI_APP_TITLE_ANIMATION`) and, per card, `meta.titleAnimation`. Values: `rubber-band` (default), `pulse`, `shake`,
  `wobble`, `tada`, `bounce`, `none`. Exports `PACHI_TITLE_ANIMATIONS` and the `PachiTitleAnimation` type.

### Fixed

- The reduced-motion rule of `DashboardCard` sat outside the `<style>` block and never applied; it is now part of it.

## [2.9.0] - 2026-10-08

### Changed

- The default dashboard card grid has 3 columns (it was 4). Apps that want 4 set `app.dashboardColumns: 4`
  (`QCLI_APP_DASHBOARD_COLUMNS=4`) or `meta.dashboardColumns: 4` on a route.

## [2.8.0] - 2026-10-08

### Added

- Dashboard width and card columns are configurable: `app.dashboardMaxWidth` and `app.dashboardColumns`
  (`QCLI_APP_DASHBOARD_MAX_WIDTH`, `QCLI_APP_DASHBOARD_COLUMNS`) and, per route, `meta.dashboardMaxWidth` and
  `meta.dashboardColumns` (the route wins). Exposed as `--pachi-hub-max-width` / `--pachi-hub-columns`.

## [2.7.3] - 2026-10-08

### Fixed

- `q-page` of the layout now has a minimum height of one viewport minus the app bar (the bar is a toolbar in the flow,
  not a `q-header`, so Quasar used the full viewport and the page overflowed the layout by the height of the bar).

## [2.7.2] - 2026-10-07

### Fixed

- Release pipeline only: `2.7.1` was tagged but never published (the monorepo release job did not build the
  workspace dependencies before type-checking). `2.7.2` contains exactly the changes of `2.7.1`.

## [2.7.1] - 2026-10-07

_Not published (see 2.7.2)._


### Changed

- The home route (`/`) no longer shows its title in the breadcrumb: the application title is already in the app bar
  (`meta.hideTitle`, no `meta.title`).

## [2.7.0] - 2026-10-07

### Added

- Window events for the `@ilpachi/*` packages (the shell does not import them): `pachi:auth-changed`
  (`{ authenticated, userId, username }`, emitted by `AuthManager` on login, session restore, change of user and
  logout; not on token/user-data refreshes) and `pachi:theme-changed` (`{ theme: 'dark' | 'light' }`, emitted by
  `ToggleThemeButton` when the user toggles the theme). Constants `PACHI_AUTH_CHANGED_EVENT` and
  `PACHI_THEME_CHANGED_EVENT` are exported. `@ilpachi/fastquasar-settings` uses them to load/clear the user settings
  and to save the theme in the database.

## [2.6.1] - 2026-10-07

### Fixed

- Login first step: `POST /token` no longer opens the automatic error dialog (`meta: { autoError: false }`), which
  covered the `429` countdown. `LoginPage` now shows inline errors under the fields: invalid credentials (`401`,
  new message `auth.login.invalidCredentials`), the countdown (`429` with `Retry-After`, or
  `errors.http.tooManyRequests` without it) and a generic message for anything else.
- The "account unlocked" notice (`auth.mfa.unlocked`) is now informational (not red); expired/too-many-attempts
  notices stay errors.

### Added

- `Retry-After` support on `429`: when the account is locked the backend sends the seconds until unlock.
  `LoginPage` shows a live "Account locked, try again in mm:ss" countdown (second MFA step, and the first step
  when the login itself answers `429`), disables the submit button until it expires and then goes back to the
  first step with a message. A `429` without the header (challenge used up) keeps the previous behavior.
  New exported helpers `parseRetryAfter` (seconds or HTTP date), `retryAfterFromError` and `formatCountdown`;
  new messages `auth.lock.countdown` and `auth.mfa.unlocked` (it, en).

## [2.6.0] - 2026-10-06

### Added

- Two-step login with MFA: `AuthManager.login` now returns `{ mfaRequired }` (when the backend answers
  `{ mfa_required, mfa_token }` the token is kept in memory only) and the new `AuthManager.verifyMfa(code)`
  completes the login through `POST /api/mfa/verify`. `LoginPage` has the second step (code field, "Verify",
  "Back") with inline messages for a wrong code, too many attempts (429) and an expired challenge. New helpers
  `hasPendingMfa`, `cancelMfa`, types `LoginResult` and `IMfaRequiredResponse`.
- `pachiLogout` is provided by `createPachiApp` (`PACHI_LOGOUT_KEY`, `PachiLogout`, `createPachiLogout`): local logout
  without backend calls, for packages that change the password (the backend has already revoked every token).
- `errors.http.tooManyRequests` message (it, en) shown for a `429` without a usable `detail`.

### Changed

- Rotating refresh tokens (backend 0.2.0): the refresh token returned by `POST /api/auth/refresh-token` replaces the
  stored one; a `401` on the scheduled renewal logs out at once instead of retrying; before refreshing, the
  persisted session is re-read so that a token already rotated by another tab is adopted instead of reused.
- `AuthManager.logout()` sends `{ refresh_token }` to `POST /api/auth/logout`, which revokes only that login
  (older backends ignore the body).
- `IToken.refresh_token` is optional (absent when the backend has rotation off).
- The error dialog of the refresh request is turned off; `/auth/token` and `/mfa/verify` 401 answers are never
  treated as an expired session.

## [2.5.0] - 2026-10-06

### Added

- `PachiScrollArea` component: wraps tall content inside a page (cards, forms, lists) in a scroll area that fills the
  space under it and stays inside the bottom edge of the page, while titles and headers above it stay fixed. The
  height follows window resizes and container size changes (props `tag`, `offset`, `minHeight`).
- `meta.pageScroll` route option: wraps the whole routed page in `pachi-page-scroll`.

### Changed

- Routed pages are no longer wrapped in `pachi-page-scroll` automatically (2.4.0 behavior): it is now opt-in with
  `meta.pageScroll: true`, or use `PachiScrollArea` / the `pachi-page-scroll` class inside the page.

## [2.4.1] - 2026-10-06

### Fixed

- Development server: `definePachiQuasarConfig` now prebundles `alova`, `alova/client`, `alova/fetch` and `alova/vue`
  together (`optimizeDeps.include`) when the app depends on `alova`. The `@ilpachi/*` packages are excluded from the
  optimizer, so Vite did not discover their `alova/client` import and the app ended up with two copies of alova
  (`statesHook is not set in alova instance` when a table loads).

## [2.4.0] - 2026-10-06

### Added

- Routed pages are wrapped in a scrollable `pachi-page-scroll` container that stays inside the bottom edge of the page
  (long pages no longer get clipped); the class is reusable in applications.
- `--pachi-page-height` CSS variable (usable page height under the app bar).

## [2.3.2] - 2026-10-06

### Added

- English documentation for a MkDocs site (`docs/`, `mkdocs.yml`), rewritten `README.md` and this changelog.

### Changed

- `CHANGELOG.md` is included in the published files; `docs/` stays in the repository only.

## [2.3.1] - 2026-10-05

### Fixed

- HTTP client registers `fileSuccessHandlers` (blob and DOM responses), so `withFiles(...).$download` works.

### Changed

- Backend error messages regenerated from the demo backend (`demo.*`) for the `locale-check` CI job.

## [2.3.0] - 2026-10-05

### Added

- `app.logoOverlap` (`QCLI_APP_LOGO_OVERLAP`): with a logo taller than the bar, either the bar grows
  (default) or it keeps a fixed 52px height and the logo hangs below it.

### Changed

- A large logo is no longer clipped: the app bar grows with `--pachi-appbar-height`, derived from
  `--pachi-app-logo-size`.

## [2.2.0] - 2026-10-05

### Added

- `app.logoSize` (`QCLI_APP_LOGO_SIZE`, CSS variable `--pachi-app-logo-size`) to resize the app-bar logo.
- Avatar resolver provided to packages with `provide('pachiAvatarUrl')` (`createPachiAvatarResolver`,
  `PACHI_AVATAR_URL_KEY`); Gravatar still disabled by `app.gravatar: false`.

## [2.1.0] - 2026-10-05

### Added

- Default logo is the Pachi mascot, emitted as the asset `dist/assets/logo.svg` instead of being inlined;
  favicons in the playground and the `pachifq` template.

### Fixed

- Gravatar: SHA-256 computed in JavaScript when `crypto.subtle` is unavailable (plain HTTP on a LAN address).

## [2.0.2] - 2026-10-05

### Added

- `IUserInfo` gains `emailVerifiedAt`, `lastLoginAt` and `createdAt`.

## [2.0.1] - 2026-10-05

### Fixed

- Quasar preset excludes `@ilpachi/*` packages from `optimizeDeps`, so module state exists once in development.

## [2.0.0] - 2026-10-05

### Changed

- **Breaking:** the HTTP client moves from `@ilpachi/httpachi` to `@ilpachi/use-alova` (`^2.1.0`, peer
  dependency). Requests use `getUseAlovaInstance()({ url }).alova`; per-request options are `autoError` and
  `showOverlay` (or the `meta` aliases `autoError` and `spinner`).
- Quasar plugins (`Dialog`, `Notify`, `Loading`) are taken from the app instance (`$q`), not imported from `quasar`.

### Added

- `http.envelope` / `QCLI_HTTP_ENVELOPE` for backends with `PACHIFAST_ENVELOPE_ENABLED=false`.
- Spinner through Quasar `Loading` with a 300 ms delay, token refresh on 401 with `retry()`, token sent only to
  same-origin requests.
- CI: `minimumReleaseAgeExclude` for `@ilpachi/*` in the reduced workspace.

## [1.1.0] - 2026-10-05

### Added

- `definePachiConfig(base, env, ...overrides)` and `mergePachiConfig(...configs)`.

### Changed

- `pachiConfigFromEnv` returns only the settings whose variable is set, so it no longer overrides the base
  configuration with defaults.

## [1.0.0] - 2026-10-05

First release as an npm package (library build with Vite, `./quasar` entry and compiled styles) plus the
`playground/` app.

### Added

- Runtime configuration (`setPachiConfig`, `getPachiConfig`, `pachiConfigFromEnv`) replacing build-time
  `import.meta.env` reads.
- `createPachiApp`, `createPachiRouter` and `definePachiQuasarConfig`; globs and messages are supplied by the app.
- Account menu contributed by packages through the `PachiMenuItemFactory` contract (`menu.{ts,js}`).
- CI pipeline (typecheck, test, build, `npm pack --dry-run`; publish on `v*` tags) and the
  `locale-check` job.

### Changed

- Profile, settings and dashboard widgets moved out of the shell into `@ilpachi/fastquasar-profile`,
  `@ilpachi/fastquasar-settings` and `@ilpachi/fastquasar-dashboard-widgets`.
- Reusable packages live in sibling repositories (the former `packages/` folder is gone).

### Fixed

- A linked package with both `src/` and `dist/` is counted once: no duplicate routes or menu entries.
- Removed the Profile and Settings fallback menu entries that duplicated the package ones.

## Before 1.0.0

The code started on 2026-09-30 as an application boilerplate (shell, `pachi-table2`, dialogs, uploader, settings,
profile, widgets and the `pachifq` CLI in one repository). Highlights of that period, tagged `pkgs-v1`:

- Optional authentication with single-flight token refresh, renewal after reload, safe `?next=` redirects, logout
  notifying the backend and a WebSocket events channel with single-use tickets (`/api/core/events/ticket`),
  immediate reconnection on close code 4403 and refresh on 4401.
- Italian and English i18n with language switcher and a fixed-language option (`QCLI_APP_LOCALE`); backend
  error codes translated through `errors.codes.*` generated files.
- `QCLI_AUTH_STORAGE` to keep tokens in `sessionStorage`, `QCLI_APP_AUTO_DASHBOARD`, Bearer sent only to
  same-origin URLs, HTML-escaped error messages.
- `--pachi-*` CSS variables and `pachi-*` classes across the shell and all packages.
- Publishing on a private npm registry.

[2.11.0]: https://github.com/ellethee/pachifastquasar/compare/pachifastquasar@2.10.3...pachifastquasar@2.11.0
[2.10.3]: https://github.com/ellethee/pachifastquasar/compare/pachifastquasar@2.10.2...pachifastquasar@2.10.3
[2.10.2]: https://github.com/ellethee/pachifastquasar/compare/pachifastquasar@2.10.1...pachifastquasar@2.10.2
[2.10.1]: https://github.com/ellethee/pachifastquasar/compare/pachifastquasar@2.10.0...pachifastquasar@2.10.1
[2.10.0]: https://github.com/ellethee/pachifastquasar/compare/pachifastquasar@2.9.0...pachifastquasar@2.10.0
[2.9.0]: https://github.com/ellethee/pachifastquasar/compare/pachifastquasar@2.8.0...pachifastquasar@2.9.0
[2.8.0]: https://github.com/ellethee/pachifastquasar/compare/pachifastquasar@2.7.3...pachifastquasar@2.8.0
[2.7.3]: https://github.com/ellethee/pachifastquasar/compare/pachifastquasar@2.7.2...pachifastquasar@2.7.3
[2.7.2]: https://github.com/ellethee/pachifastquasar/compare/pachifastquasar@2.7.1...pachifastquasar@2.7.2
[2.7.1]: https://github.com/ellethee/pachifastquasar/compare/pachifastquasar@2.7.0...pachifastquasar@2.7.1
[2.7.0]: https://github.com/ellethee/pachifastquasar/compare/pachifastquasar@2.6.1...pachifastquasar@2.7.0
[2.6.1]: https://github.com/ellethee/pachifastquasar/compare/pachifastquasar@2.6.0...pachifastquasar@2.6.1
[2.6.0]: https://github.com/ellethee/pachifastquasar/compare/pachifastquasar@2.5.0...pachifastquasar@2.6.0
[2.5.0]: https://github.com/ellethee/pachifastquasar/compare/pachifastquasar@2.4.1...pachifastquasar@2.5.0
[2.4.1]: https://github.com/ellethee/pachifastquasar/compare/pachifastquasar@2.4.0...pachifastquasar@2.4.1
[2.4.0]: https://github.com/ellethee/pachifastquasar/compare/pachifastquasar@2.3.2...pachifastquasar@2.4.0
[2.3.2]: https://github.com/ellethee/pachifastquasar/compare/pachifastquasar@2.3.1...pachifastquasar@2.3.2
[2.3.1]: https://github.com/ellethee/pachifastquasar/compare/pachifastquasar@2.3.0...pachifastquasar@2.3.1
[2.3.0]: https://github.com/ellethee/pachifastquasar/compare/pachifastquasar@2.2.0...pachifastquasar@2.3.0
[2.2.0]: https://github.com/ellethee/pachifastquasar/compare/pachifastquasar@2.1.0...pachifastquasar@2.2.0
[2.1.0]: https://github.com/ellethee/pachifastquasar/compare/pachifastquasar@2.0.2...pachifastquasar@2.1.0
[2.0.2]: https://github.com/ellethee/pachifastquasar/compare/pachifastquasar@2.0.1...pachifastquasar@2.0.2
[2.0.1]: https://github.com/ellethee/pachifastquasar/compare/pachifastquasar@2.0.0...pachifastquasar@2.0.1
[2.0.0]: https://github.com/ellethee/pachifastquasar/compare/pachifastquasar@1.1.0...pachifastquasar@2.0.0
[1.1.0]: https://github.com/ellethee/pachifastquasar/compare/pachifastquasar@1.0.0...pachifastquasar@1.1.0
[1.0.0]: https://github.com/ellethee/pachifastquasar/releases/tag/pachifastquasar@1.0.0
