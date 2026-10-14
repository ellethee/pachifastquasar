# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.3] - 2026-10-12

### Fixed

- `usePachiI18n` now matches package languages to app languages with `matchLocale` (app `en-US`/`it-IT` with package `en`/`it` no longer shows raw keys).
- `defaultLocale` missing from the app messages falls back to the closest/first available language (with a warning); `document.documentElement.lang` is correct. `fallbackLocale` is matched the same way.
- `PachiLocaleSwitcher`: `aria-current` on the active entry; the `aria-label` that overrode the visible text was removed.

### Added

- `disposePachiI18n()` stops the language watcher and clears the global instance; `createPachiI18n` calls it, so only one watcher/instance exists at a time.

### Changed

- Documented that the i18n is a global singleton meant for SPAs (no SSR), and that languages added at runtime are filled on the next `usePachiI18n` call.

## [0.1.2] - 2026-10-06

### Documentation

- README rewritten in English: setup, options table, exports, backend contract and troubleshooting.
- Added this changelog; `CHANGELOG.md` is now included in the npm package.

## [0.1.1] - 2026-10-05

### Fixed

- Languages not offered by the app (including the fallback) are no longer registered by `usePachiI18n`, so they do not appear in the switcher.
- `onLocaleChange` calls are serialized; with fast changes the last language wins.
- Accessibility of `PachiLocaleSwitcher` (`lang` and `aria-label` on the entries).

### Added

- `requirePachiI18n` export and Vitest test suite.

### Changed

- CI skips the publish step when the version already exists.

## [0.1.0] - 2026-10-02

### Added

- First release as a standalone package (Vite library build): `createPachiI18n`, `usePachiI18n`, `useLocale`, `pachiT`, `collectLocales` (also `.json` files), `deepMerge`, `matchLocale`, `PachiLocaleSwitcher` and `fixedLocale`.

[Unreleased]: https://github.com/ellethee/pachifastquasar/compare/pachi-i18n@0.1.3...HEAD
[0.1.3]: https://github.com/ellethee/pachifastquasar/compare/pachi-i18n@0.1.2...pachi-i18n@0.1.3
[0.1.2]: https://github.com/ellethee/pachifastquasar/compare/pachi-i18n@0.1.1...pachi-i18n@0.1.2
[0.1.1]: https://github.com/ellethee/pachifastquasar/compare/pachi-i18n@0.1.0...pachi-i18n@0.1.1
[0.1.0]: https://github.com/ellethee/pachifastquasar/releases/tag/pachi-i18n@0.1.0
