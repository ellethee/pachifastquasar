# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.3.0] - 2026-10-12

### Added

- New `showActionLabels` prop: shows the text label next to the icon of the action buttons (`PachiDialogActions`, `PachiDialogEditActions`). The action buttons are now right-aligned.

## [2.2.0] - 2026-10-12

### Fixed

- `PachiDialog`: `ok` / `edit:save` are ignored while a previous save is pending (no double emit on double click).
- `PachiDialog`: ESC / backdrop / close no longer stack several "discard changes" confirmations.
- `PachiDialogEditActions`: `hasChanges` prop typed as `boolean`; removed the redundant `disabled` inside `v-if`.
- `useEditorOptions`: `qEditorProps` is null-safe; `defaultEditorOptions` is frozen (it is shared, spread it to customise).

### Changed

- Accessibility: the dialog is labelled by its title (`aria-labelledby`), the icon avatar is `aria-hidden`.
- `usePachiDialogToolbar` and the new `PACHI_DIALOG_TOOLBAR_KEY` (typed `InjectionKey`, same string value) are exported from the barrel.
- Docs: `avoidHideWithChanges` default differs from `PachiEditDialog` (`true` here, `false` there).

## [2.1.2] - 2026-10-06

### Changed

- Documentation rewritten in English: complete `README.md` (props, events, slots, exposed members, composables, types,
  CSS variables, troubleshooting) and MkDocs sources in `docs/` (`mkdocs.yml`, Material theme).
- Package description in `package.json` is now in English.
- `CHANGELOG.md` is now published with the package.

## [2.1.1] - 2026-10-06

### Added

- `usePachiDialog()`: to be called in `setup()`, it binds the dialog creation to the `$q` of the running app.
- Optional second argument `$q` of `createPachiDialog(options, $q)`.

### Fixed

- Programmatic opening is robust against duplicated copies of `quasar` in Vite development
  (`Dialog.create is not a function`).

## [2.1.0] - 2026-10-05

### Added

- `edit:cancel` event, emitted when the dialog is closed without saving.
- `content` and `contentProps` props, and `createPachiDialog()` helper, to open a `PachiDialog` with custom content
  through `Dialog.create` (which cannot pass slots).

### Changed

- The default `QEditor` toolbar no longer contains the empty `token` / `custom_btn` placeholders: they appear only when
  defined in `editorButtons`.

### Fixed

- Runtime type of the `content` prop (`Object | Function`).

## [2.0.1] - 2026-10-05

### Added

- Vitest unit tests.

### Fixed

- `aria-label` on the icon buttons of the actions.
- Declaration files are emitted in the build.
- Close and confirm-discard behaviour with unsaved changes.
- `useEditorOptions` no longer mutates the options it receives.

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

[2.3.0]: https://github.com/ellethee/pachifastquasar/compare/pachi-dialog@2.2.0...pachi-dialog@2.3.0
[2.2.0]: https://github.com/ellethee/pachifastquasar/compare/pachi-dialog@2.1.2...pachi-dialog@2.2.0
[2.1.2]: https://github.com/ellethee/pachifastquasar/compare/pachi-dialog@2.1.1...pachi-dialog@2.1.2
[2.1.1]: https://github.com/ellethee/pachifastquasar/compare/pachi-dialog@2.1.0...pachi-dialog@2.1.1
[2.1.0]: https://github.com/ellethee/pachifastquasar/compare/pachi-dialog@2.0.1...pachi-dialog@2.1.0
[2.0.1]: https://github.com/ellethee/pachifastquasar/compare/pachi-dialog@2.0.0...pachi-dialog@2.0.1
[2.0.0]: https://github.com/ellethee/pachifastquasar/compare/pachi-dialog@1.0.1...pachi-dialog@2.0.0
[1.0.1]: https://github.com/ellethee/pachifastquasar/compare/pachi-dialog@a1dc9e5...pachi-dialog@1.0.1
[1.0.0]: https://github.com/ellethee/pachifastquasar/tree/main/packages/pachi-dialog
