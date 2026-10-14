# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.5.1] - 2026-10-12

### Fixed

- A form with no remote selects no longer needs an HTTP client: the client is resolved lazily when a remote select loads. A missing client or failed request sets `error` and logs the original error in development.
- `validate()` treats an untouched `boolean` field as `false` and `FieldsSection.validate()` notifies which fields are invalid (new `invalidFields` message).
- `readonly` date fields no longer open the picker popups (via `@ilpachi/pachi-ui` `PachiDatePicker`).
- Select options created on the fly survive option recalculation and reloads; a throwing `optionLabel` function no longer breaks filtering or creation.
- `filter`/`new-value` listeners are bound only to standard `select` fields.
- Clearing a field that was not in the initial record no longer counts as a change.

### Changed

- `IFieldType` keeps autocomplete for the known types (`string & {}` instead of `string`).

## [0.5.0] - 2026-10-12

### Changed

- **Breaking:** `@ilpachi/use-alova` (`^2.1.1`) is now a required peer dependency. The package uses the client registered by
  `createPachiApp` (`getUseAlovaInstance()`); the `fetch` fallback client and the `provide('useAlova')` / `inject` lookup are gone.
- Removed `createFetchFieldsHttp()`. Client resolution is now: `setPachiFieldsHttp`, then the use-alova instance.

## [0.4.2] - 2026-10-06

### Changed

- Complete English documentation: rewritten `README.md`, new `CHANGELOG.md` and `docs/` (MkDocs, Material theme) with guides, reference tables, backend contract and troubleshooting.
- `CHANGELOG.md` is now part of the published package files.

## [0.4.1] - 2026-10-06

### Fixed

- `useRemoteSelect` shows its error notification through the application's `$q` instead of the `Notify` plugin imported from `quasar`, so it works in Vite dev mode when the application and the package resolve different copies of `quasar`. Without `$q` the imported plugin is used.

## [0.4.0] - 2026-10-05

### Added

- `FieldsSection.validate()` checks `required` and `rules` and shows every error immediately, also on untouched fields.
- `FieldsSection.commit()` and `setOriginalState()`.
- Dependent selects: `dependsOn`, `params`, `resetOnDependencyChange`; `DynamicField` prop `values`; `useRemoteSelect(field, values)`.

### Changed

- The section state contains only the fields declared in `rows`.
- `initialValue` is reactive, like the `initialValue` option of `useSection`; a new but equal object does not discard edits.

## [0.3.0] - 2026-10-05

### Added

- Error handling for remote selects with a translated (`it`, `en`) notification; plain array responses; configurable `pageSize` with a development warning when options are truncated; export of `IRemoteSelectApi`.
- `required` marks the UI (asterisk and Quasar rule).
- Vitest unit tests (`coerce`, remote query).
- Repository metadata (`repository`, `bugs`, `homepage`) and a `test` script.

### Changed

- `DynamicField` selects react to changes of `url`, `type` and `options`; `boolean` respects a custom `component`.
- The fallback HTTP client sends `cacheFor: null`.
- `alova` is no longer treated as an external dependency of the build.
- Documentation references `@ilpachi/use-alova`.
- CI skips publishing when the version already exists.

## [0.2.0] - 2026-10-02

### Changed

- **Breaking:** every CSS custom property is `--pachi-*` and every class defined by the package starts with `pachi-`. Defaults have zero specificity (`:where(...)`).

## [0.1.0] - 2026-10-02

### Added

- First release as a standalone package (ESM + type declarations, Vite library mode): `FieldsSection`, `DynamicField`, `useRemoteSelect`, `setPachiFieldsHttp`.
- CI workflow (typecheck, build, publish on `v*` tags).

[0.5.1]: https://github.com/ellethee/pachifastquasar/compare/pachi-edit-dialog-fields@0.5.0...pachi-edit-dialog-fields@0.5.1
[0.5.0]: https://github.com/ellethee/pachifastquasar/compare/pachi-edit-dialog-fields@0.4.2...pachi-edit-dialog-fields@0.5.0
[0.4.2]: https://github.com/ellethee/pachifastquasar/compare/pachi-edit-dialog-fields@0.4.1...pachi-edit-dialog-fields@0.4.2
[0.4.1]: https://github.com/ellethee/pachifastquasar/compare/pachi-edit-dialog-fields@0.4.0...pachi-edit-dialog-fields@0.4.1
[0.4.0]: https://github.com/ellethee/pachifastquasar/compare/pachi-edit-dialog-fields@0.3.0...pachi-edit-dialog-fields@0.4.0
[0.3.0]: https://github.com/ellethee/pachifastquasar/compare/pachi-edit-dialog-fields@0.2.0...pachi-edit-dialog-fields@0.3.0
[0.2.0]: https://github.com/ellethee/pachifastquasar/compare/pachi-edit-dialog-fields@0.1.0...pachi-edit-dialog-fields@0.2.0
[0.1.0]: https://github.com/ellethee/pachifastquasar/releases/tag/pachi-edit-dialog-fields@0.1.0
