# Changelog

All notable changes to `@ilpachi/fastquasar-dashboard-widgets` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html) (the package is in the `0.x` series: minor releases may
contain breaking changes).

## [0.3.0] - 2026-10-12

### Changed

- **Breaking:** `@ilpachi/use-alova` (`^2.1.1`) is now a required peer dependency. The package uses the client registered by
  `createPachiApp` (`getUseAlovaInstance()`); the `fetch` fallback client and the `provide('useAlova')` / `inject` lookup are gone.
- Client resolution is now: `http` prop, `setPachiWidgetsHttp`, use-alova instance (the plain `fetch` without authentication is removed).

## [0.2.3] - 2026-10-06

### Fixed

- The `fetch` fallback HTTP client now unwraps the backend envelope `{success, message?, data}` (object with a
  boolean `success` and a `data` key) and returns `data`; bare responses are returned unchanged.

### Added

- Unit tests for the HTTP client resolution and the envelope unwrapping.

## [0.2.2] - 2026-10-06

### Changed

- Documentation rewritten in English: complete README (installation from the internal registry, mounting through
  `meta.widgets` in a `pachifastquasar` app, API reference, backend contract of the activity and system endpoints,
  HTTP client resolution, styling, troubleshooting), this changelog and a `docs/` folder for a MkDocs site. No code
  changes.
- `package.json` `files` now includes `CHANGELOG.md`.
- The HTTP client references now point to `@ilpachi/use-alova` (replaces `httpachi`).

## [0.2.1] - 2026-10-05

### Added

- Optional polling with the `refreshInterval` prop (milliseconds, default `0` = off); the timer is stopped when the
  card is unmounted.
- Error state with a "Retry" button, distinct from the empty state.
- Validation of the responses: the activity card accepts only an array, the system card only an object.
- Unit tests.

### Changed

- Activity descriptions and paths are rendered as plain text; `v-html` is no longer used.
- Requests are sent with `meta: { autoError: false }` so the error dialog of the app is not opened.
- The release workflow skips publishing when the version already exists in the registry.

## [0.2.0] - 2026-10-02

### Added

- First release as a standalone repository (moved from `pachifastquasar/packages`): `PachiDashboardActivityCard`,
  `PachiDashboardSystemCard`, injectable HTTP client (`setPachiWidgetsHttp`, `getPachiWidgetsHttp`), translated texts
  (Italian, English) and self-contained `--pachi-*` styles.

[Unreleased]: https://github.com/ellethee/pachifastquasar/compare/fastquasar-dashboard-widgets@0.3.0...HEAD
[0.3.0]: https://github.com/ellethee/pachifastquasar/compare/fastquasar-dashboard-widgets@0.2.3...fastquasar-dashboard-widgets@0.3.0
[0.2.3]: https://github.com/ellethee/pachifastquasar/compare/fastquasar-dashboard-widgets@0.2.2...fastquasar-dashboard-widgets@0.2.3
[0.2.2]: https://github.com/ellethee/pachifastquasar/compare/fastquasar-dashboard-widgets@0.2.1...fastquasar-dashboard-widgets@0.2.2
[0.2.1]: https://github.com/ellethee/pachifastquasar/compare/fastquasar-dashboard-widgets@0.2.0...fastquasar-dashboard-widgets@0.2.1
[0.2.0]: https://github.com/ellethee/pachifastquasar/releases/tag/fastquasar-dashboard-widgets@0.2.0
