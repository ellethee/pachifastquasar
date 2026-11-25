# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0] - 2026-11-25

### Fixed

- `fields`: `FieldsSection` sets a `gap` between rows (the `q-gutter-md` negative margins cancelled the spacing).
- `dialog`: with a long body only `.pachi-dialog-content` scrolls; toolbar and actions stay in place (previously the whole card scrolled).

### Added

- `table`: `rows` prop (data in memory: no request, local filter/sort/pagination, `url` optional) and `loading` and `error` props (external states; `pt2:retry` event) on `PachiTable2`.
- `table`: `hidePagination`, `autoHeight` (default `true`) and `singleSort` props on `PachiTable2`.
- `dialog`: `fullScroll` prop on `PachiDialog` (the whole card scrolls instead of only the content).
- `edit-dialog`: `PachiDialogEditActions` is exported; section wrappers carry `pachi-dialog-editor-section*` classes for styling.
- `table`: `hideToolbar` prop to hide the toolbar (filter box and `toolbar-actions` slot) of `PachiTable2`.
- `setPachiFieldsHttp(null)` and `setPachiAlovaFactory(null)` remove the registered client/factory (back to the `@ilpachi/use-alova` one).

## [0.1.1] - 2026-10-14

### Changed

- First release published from GitHub Actions with trusted publishing (npm provenance); no code changes.

## [0.1.0] - 2026-10-14

Initial public release. Consolidates the former pachi-ui, pachi-dialog, pachi-edit-dialog, pachi-edit-dialog-fields, pachi-table2 and pachi-uploader packages.

### Added

- One package with six areas, imported through sub-paths: `@ilpachi/pachi-kit/ui`, `/dialog`, `/edit-dialog`, `/fields`, `/table`, `/uploader`, plus the small entries `/ui/PachiPopupEdit.vue`, `/dialog/composables/usePachiDialogToolbar` and `/dialog/composables/editor-defaults`.
- No root entry: each sub-path has its own bundle and injects only its own styles.
- Optional peer dependencies `@ilpachi/use-alova` and `alova` (needed only by `fields` and `table`).

[Unreleased]: https://github.com/ellethee/pachifastquasar/compare/pachi-kit@0.2.0...HEAD
[0.2.0]: https://github.com/ellethee/pachifastquasar/compare/pachi-kit@0.1.1...HEAD
[0.1.1]: https://github.com/ellethee/pachifastquasar/compare/pachi-kit@0.1.0...pachi-kit@0.1.1
[0.1.0]: https://github.com/ellethee/pachifastquasar/releases/tag/pachi-kit@0.1.0
