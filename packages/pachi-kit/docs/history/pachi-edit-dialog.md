# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [3.2.0] - 2026-10-12
### Added

- New `showActionLabels` prop: shows the text label next to the icon of the footer buttons (`PachiDialogEditActions`). The footer actions are now right-aligned.

## [3.1.0] - 2026-10-12

### Fixed

- `PachiEditDialog`: save has an anti-reentry guard and a `try/catch` (errors from validation / `getResults` are notified like `onError`).
- `PachiEditDialog`: ESC / backdrop / close no longer stack several "discard changes" confirmations.
- Unsaved-changes detection is reactive for sections added or enabled after mount.
- `useSection`: a new `initialValue` reference with the same content no longer resets the state and drops user edits.
- `useSection`: `hasChanges` uses a structural comparison (key order and `undefined` vs missing no longer matter).
- `PachiDialogEditActions`: `hasChanges` prop typed as `boolean`; removed the redundant `disabled` inside `v-if`.

### Changed

- New `closeOnSave` prop (default `true`, unchanged behaviour): with `false` the dialog stays open after `onSuccess()` and shows the "saved" label.
- `IContainer.type` is now `'card' | 'expansion' | 'div' | (string & {})`; `IContainer`, `IContainerProps`, `ContainerType` and `IAwaitableDialogEmit` are exported from the barrel.
- Accessibility: the dialog is labelled by its title, the icon avatar is `aria-hidden`.
- Docs: `avoidHideWithChanges` default differs from `PachiDialog`; `shared` is read once; `getResults()` returns the live state.

## [3.0.1] - 2026-10-06

### Changed

- Complete English documentation: rewritten `README.md`, new `CHANGELOG.md` and `docs/` (MkDocs, Material theme) with guides, reference tables, backend contract and troubleshooting.
- `CHANGELOG.md` is now part of the published package files.

## [3.0.0] - 2026-10-05

### Changed

- **Breaking:** the root class of the card is `pachi-edit-dialog` (it was `pachi-dialog`), so the package can be loaded together with `@ilpachi/pachi-dialog` without interference. Update any custom CSS targeting the old class.
- After `onSuccess()` the saved state becomes the new baseline of every section (`commit()` on all sections), so closing no longer asks to discard changes.
- With `avoidHideWithChanges` the dialog is `persistent` only while there are unsaved changes; Esc / outside click open the discard confirmation.
- Section state is cloned deeply (`toRaw` on every level): reactive objects no longer raise `DataCloneError`.
- `useSection` follows `initialValue` with a deep, immediate watcher.
- The bundled demo sections use local dates (not UTC) and accessible buttons; the permissions section parses its text on blur / `getResults`.

### Added

- `ISectionExpose.commit` and `useSection().commit` / `setOriginalState`.
- Exports of `useSection`, `useSectionsManager`, `SectionsContainer`, `SectionContextKey` and the section types.
- Vitest unit tests.

### Fixed

- The footer clock runs only after a save.
- The `container` props filter no longer leaks `type` to the DOM.

## [2.0.0] - 2026-10-02

### Changed

- **Breaking:** every CSS custom property is `--pachi-*` and every class defined by the package starts with `pachi-`. Defaults have zero specificity (`:where(...)`).

## [1.0.1] - 2026-10-02

### Added

- First release as a standalone package (ESM + type declarations, Vite library mode).
- CI workflow (typecheck, build, publish on `v*` tags).

[3.2.0]: https://github.com/ellethee/pachifastquasar/compare/pachi-edit-dialog@3.1.0...pachi-edit-dialog@3.2.0
[3.1.0]: https://github.com/ellethee/pachifastquasar/compare/pachi-edit-dialog@3.0.1...pachi-edit-dialog@3.1.0
[3.0.1]: https://github.com/ellethee/pachifastquasar/compare/pachi-edit-dialog@3.0.0...pachi-edit-dialog@3.0.1
[3.0.0]: https://github.com/ellethee/pachifastquasar/compare/pachi-edit-dialog@2.0.0...pachi-edit-dialog@3.0.0
[2.0.0]: https://github.com/ellethee/pachifastquasar/compare/pachi-edit-dialog@1.0.1...pachi-edit-dialog@2.0.0
[1.0.1]: https://github.com/ellethee/pachifastquasar/releases/tag/pachi-edit-dialog@1.0.1
