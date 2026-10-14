# Changelog

All notable changes to `@ilpachi/pachi-i18n` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html)
(the package is in the `0.x` series: minor releases may contain breaking changes).

## [Unreleased]

## [0.1.1] - 2026-10-14

### Changed

- First release published from GitHub Actions with trusted publishing (npm provenance); no code changes.

## [0.1.0] - 2026-10-14

Initial public release. i18n for Vue 3 / Quasar apps built on vue-i18n 11.

### Added

- `createPachiI18n`: creates the vue-i18n instance, picks the initial language, persists it and updates `<html lang>`.
- `usePachiI18n` and `pachiT`: per-package messages that the app can still override.
- `collectLocales` and the typed `PachiMessages`: adding a language means adding a file.
- `PachiLocaleSwitcher`: language switcher and fixed-language mode.

[Unreleased]: https://github.com/ellethee/pachifastquasar/compare/pachi-i18n@0.1.1...HEAD
[0.1.1]: https://github.com/ellethee/pachifastquasar/compare/pachi-i18n@0.1.0...pachi-i18n@0.1.1
[0.1.0]: https://github.com/ellethee/pachifastquasar/releases/tag/pachi-i18n@0.1.0
