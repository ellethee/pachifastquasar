# Changelog

All notable changes to `@ilpachi/fastquasar-dashboard-widgets` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html)
(the package is in the `0.x` series: minor releases may contain breaking changes).

## [Unreleased]

## [0.1.1] - 2026-10-14

### Changed

- First release published from GitHub Actions with trusted publishing (npm provenance); no code changes.

## [0.1.0] - 2026-10-14

Initial public release. Dashboard widgets fed by plain HTTP endpoints.

### Added

- `PachiDashboardActivityCard`: the most recent activity entries.
- `PachiDashboardSystemCard`: version, environment, uptime and status of the backend.
- Optional refresh timer, skeleton while loading, error state with retry, empty state.
- Injectable HTTP client; designed for `meta.widgets` of a shell route.
- Self-contained styles (`--pachi-*` variables) and Italian / English texts.

[Unreleased]: https://github.com/ellethee/pachifastquasar/compare/fastquasar-dashboard-widgets@0.1.1...HEAD
[0.1.1]: https://github.com/ellethee/pachifastquasar/compare/fastquasar-dashboard-widgets@0.1.0...fastquasar-dashboard-widgets@0.1.1
[0.1.0]: https://github.com/ellethee/pachifastquasar/releases/tag/fastquasar-dashboard-widgets@0.1.0
