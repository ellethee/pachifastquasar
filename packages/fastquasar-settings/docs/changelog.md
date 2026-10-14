# Changelog

All notable changes to `@ilpachi/fastquasar-settings` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html)
(the package is in the `0.x` series: minor releases may contain breaking changes).

## [Unreleased]

## [0.1.0] - 2026-10-14

Initial public release. User settings page driven by a JSON schema served by the backend.

### Added

- `PachiSettingsPage`: sections and form fields generated from the backend schema, values saved one key at a time.
- Local "Appearance" section (theme, accent colour, density).
- `SettingsManager` and `useSettingsStore`: singleton service and Pinia store, usable on their own.
- Menu entry and route discovered automatically by the shell.
- Named, declarative actions for the schema `events` / `watch` (no code from the backend is executed).
- Self-contained styles (`--pachi-*` variables) and Italian / English texts.

[Unreleased]: https://github.com/ellethee/pachifastquasar/compare/fastquasar-settings@0.1.0...HEAD
[0.1.0]: https://github.com/ellethee/pachifastquasar/releases/tag/fastquasar-settings@0.1.0
