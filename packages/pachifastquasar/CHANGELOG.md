# Changelog

All notable changes to `@ilpachi/pachifastquasar` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html)
(the package is in the `0.x` series: minor releases may contain breaking changes).

## [Unreleased]

## [0.1.2] - 2026-10-14

### Changed

- Accessibility: the dashboard card parent-level button now has an accessible name (aria-label).

## [0.1.1] - 2026-10-14

### Changed

- First release published from GitHub Actions with trusted publishing (npm provenance). Docs: security page and README note about the build-time `braces` audit notice.

## [0.1.0] - 2026-10-14

Initial public release. Vue 3 / Quasar application shell for pachifast backends.

### Added

- Layout with app bar, breadcrumbs, light/dark theme and account menu.
- Optional authentication: login, silent session restore, token refresh and per-route authorization.
- Automatic card dashboard built from the route tree, with optional route widgets.
- Router and menu assembled from the routes and menus of the app features and of the installed packages.
- Internationalization on `@ilpachi/pachi-i18n` (Italian and English out of the box).
- HTTP client on `@ilpachi/use-alova`, wired to authentication, spinner and error messages.
- Runtime configuration through `QCLI_*` environment variables or code, and the Quasar preset `definePachiQuasarConfig`.

[Unreleased]: https://github.com/ellethee/pachifastquasar/compare/pachifastquasar@0.1.2...HEAD
[0.1.2]: https://github.com/ellethee/pachifastquasar/compare/pachifastquasar@0.1.1...pachifastquasar@0.1.2
[0.1.1]: https://github.com/ellethee/pachifastquasar/compare/pachifastquasar@0.1.0...pachifastquasar@0.1.1
[0.1.0]: https://github.com/ellethee/pachifastquasar/releases/tag/pachifastquasar@0.1.0
