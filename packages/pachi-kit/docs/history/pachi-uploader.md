# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.2.0] - 2026-10-12

### Fixed

- Header buttons "remove all"/"remove uploaded" now clean the per-file state (`onRemoved` is hooked), so re-adding a file with the same name no longer routes progress to the old entry.
- `added` was called twice per selection (`onAdded` wrapper plus `@added`); the wrapper was removed, a user `onAdded` is passed through untouched.
- Unhandled promise rejections when reading text previews; a failing preview now shows a notification.
- Uploaded files keep a working preview; the card form is now `inert` during/after upload (no keyboard edits).
- `extraParams` values are no longer converted with `String()` blindly: objects/arrays become JSON, `Date` ISO 8601, `null`/`undefined` are skipped.
- Accessibility: progress indicators and header spinner now have an accessible label.

### Changed

- Documented that `uploaderProps` options (`url`, static `headers`...) are read once at creation; use a `headers` function for dynamic values.

## [2.1.1] - 2026-10-06

### Changed

- Documentation rewritten in English: complete `README.md` (options, component, slots, exposed members, backend
  contract, exports and types, CSS variables, i18n keys, troubleshooting) and MkDocs sources in `docs/`
  (`mkdocs.yml`, Material theme).
- Package description in `package.json` is now in English.
- `CHANGELOG.md` is now published with the package.

## [2.1.0] - 2026-10-05

### Added

- The name edited in a card is sent as the `filename` of the multipart part, as the `filename` metadata value and as the
  key of `metadata` (`applyUploadNames`); the original name is kept in `file.__originalName`.

### Changed

- The height of the uploader is overridable through `--pachi-uploader-height` without `!important`.
- `defaultUploaderProps.label` is now an i18n key resolved lazily by `usePachiUploader`: spreading it at module level
  no longer produces missing-key warnings.

## [2.0.1] - 2026-10-05

### Added

- Vitest unit tests for the helpers.

### Changed

- The 0-50 % (browser) and 50-100 % (storage) progress split applies only when an `eventBus` is configured; otherwise
  the browser transfer covers 0-100 %.
- `uploaderProps` is no longer mutated: wrappers are applied to a copy.
- `headers` accepts a function evaluated on every request.
- Responsive CSS and accessibility improvements; dead code removed.
- CI skips publishing when the version already exists.

### Fixed

- Files with the same name get unique keys, so metadata and progress are not mixed up.

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

- First release as a standalone package with a `dist` build (ESM and declarations) and a CI workflow
  (typecheck, build, publish on `v*` tags). This version was never tagged.

[2.2.0]: https://github.com/ellethee/pachifastquasar/compare/pachi-uploader@2.1.1...pachi-uploader@2.2.0
[2.1.1]: https://github.com/ellethee/pachifastquasar/compare/pachi-uploader@2.1.0...pachi-uploader@2.1.1
[2.1.0]: https://github.com/ellethee/pachifastquasar/compare/pachi-uploader@2.0.1...pachi-uploader@2.1.0
[2.0.1]: https://github.com/ellethee/pachifastquasar/compare/pachi-uploader@2.0.0...pachi-uploader@2.0.1
[2.0.0]: https://github.com/ellethee/pachifastquasar/compare/pachi-uploader@1.0.1...pachi-uploader@2.0.0
[1.0.1]: https://github.com/ellethee/pachifastquasar/compare/pachi-uploader@5a6367e...pachi-uploader@1.0.1
[1.0.0]: https://github.com/ellethee/pachifastquasar/tree/main/packages/pachi-uploader
