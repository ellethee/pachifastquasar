# Changelog

All notable changes to `@ilpachi/fastquasar-admin` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html)
(the package is in the `0.x` series: minor releases may contain breaking changes).

## [Unreleased]

## [0.1.0] - 2026-10-14

Initial public release. Generic Admin page driven by the schema of the pachifast admin API.

### Added

- Model list and server-side table with search, sorting, pagination and filters.
- Create / edit dialog generated from the fields (async lookups and JSON included).
- Bulk actions and per-row change history; buttons follow the permissions of the user.
- Routes and account-menu entry discovered by the shell; `installPachiAdmin` and `setPachiAdminOptions` for configuration.
- Self-contained styles (`--pachi-*` variables) and Italian / English texts.

[Unreleased]: https://github.com/ellethee/pachifastquasar/compare/fastquasar-admin@0.1.0...HEAD
[0.1.0]: https://github.com/ellethee/pachifastquasar/releases/tag/fastquasar-admin@0.1.0
