# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.3.0] - 2026-10-12

### Added

- `PachiDatePicker`: `readonly`, `disable` and `format24h` props (default `true`).
- `PachiDuotoneIcon`: optional `title` prop to expose the icon to assistive technology.
- Exported helpers `resolveConfirmWord` and `coerceInputValue`.

### Fixed

- `PachiDatePicker`: with `readonly`/`disable` the calendar and clock buttons no longer open the popups or change the model; the close button has an `aria-label`.
- `PachiPopupEdit`: with `type="number"` the model is a `number` (`null` when empty) instead of a string.
- `PachiConfirmDialog`: an empty or blank `confirmWord` falls back to the default word instead of making the dialog impossible to confirm.

### Changed

- `passesRules` follows `q-input`: only `false` or a string message is invalid (`undefined`/`null` are valid).

## [2.2.1] - 2026-10-12

### Fixed

- `PachiConfirmDialog`: the submit button uses `disable` (Quasar prop) so it looks disabled until the confirmation word is typed.
- `PachiDatePicker`: type-only import of `QPopupProxy`.

## [2.2.0] - 2026-10-08

### Added

- `PachiConfirmDialog`: `tone` prop (`danger` default, `warning`, `info`) for non-destructive confirmations.

## [2.1.1] - 2026-10-06

### Changed

- Documentation rewritten in English: complete `README.md` (components, props, helpers, CSS variables, i18n keys,
  troubleshooting) and MkDocs sources in `docs/` (`mkdocs.yml`, Material theme).
- Package description in `package.json` is now in English.
- `CHANGELOG.md` is now published with the package.

## [2.1.0] - 2026-10-05

### Added

- `PachiPopupEdit`: `rules` prop (synchronous validation, blocks confirm and Enter) and `title` prop.
- `matchesConfirmWord` is exported from the package entry point.

### Changed

- `PachiDatePicker`: `rounded` and `outlined` props (both default to `true`) so the style can be overridden.

## [2.0.1] - 2026-10-05

### Added

- `DuotoneIcon` type exported.
- Vitest unit tests.

### Fixed

- Accessibility and i18n of `PachiConfirmDialog`, `PachiDatePicker` and `PachiPopupEdit` (translated `aria-label`s and texts).
- CSS classes are prefixed.

### Changed

- CI skips publishing when the version already exists.

## [2.0.0] - 2026-10-02

### Changed

- **Breaking:** every CSS variable is now `--pachi-*` and every CSS class starts with `pachi-`.
- The default `--pachi-*` values are declared with zero specificity (`:where(...)`): variables defined by the
  consuming project always win.

## [1.0.1] - 2026-10-02

### Fixed

- CI: authentication also for the lower-case package path returned by the registry; explicit ignore of the `@parcel/watcher`
  build script.

## [1.0.0] - 2026-10-01

### Added

- First release as a standalone package with a `dist` build (Vite library mode) and a CI workflow
  (typecheck, build, publish on `v*` tags). This version was never tagged.

[2.3.0]: https://github.com/ellethee/pachifastquasar/compare/pachi-ui@2.2.1...pachi-ui@2.3.0
[2.2.1]: https://github.com/ellethee/pachifastquasar/compare/pachi-ui@2.2.0...pachi-ui@2.2.1
[2.2.0]: https://github.com/ellethee/pachifastquasar/compare/pachi-ui@2.1.1...pachi-ui@2.2.0
[2.1.1]: https://github.com/ellethee/pachifastquasar/compare/pachi-ui@2.1.0...pachi-ui@2.1.1
[2.1.0]: https://github.com/ellethee/pachifastquasar/compare/pachi-ui@2.0.1...pachi-ui@2.1.0
[2.0.1]: https://github.com/ellethee/pachifastquasar/compare/pachi-ui@2.0.0...pachi-ui@2.0.1
[2.0.0]: https://github.com/ellethee/pachifastquasar/compare/pachi-ui@1.0.1...pachi-ui@2.0.0
[1.0.1]: https://github.com/ellethee/pachifastquasar/compare/pachi-ui@8034470...pachi-ui@1.0.1
[1.0.0]: https://github.com/ellethee/pachifastquasar/tree/main/packages/pachi-ui
