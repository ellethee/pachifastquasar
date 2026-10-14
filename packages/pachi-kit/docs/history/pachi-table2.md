# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.0.0] - 2026-10-12

### Changed

- **Breaking:** `@ilpachi/use-alova` (`^2.1.1`) is now a required peer dependency. The package uses the client registered by
  `createPachiApp` (`getUseAlovaInstance()`); the `fetch` fallback client and the `provide('useAlova')` / `inject` lookup are gone.
- Client resolution is now: `setPachiAlovaFactory`, then the use-alova instance (the `fetch` instance without authentication is removed).
- `AlovaExt` is now `UseAlovaReturn['alova']` (a `setPachiAlovaFactory` returning a differently typed `createAlova` may need a cast).

## [2.2.2] - 2026-10-12

### Fixed

- The filter no longer sends `search=null` after clearing the input (the `q-input` emits `null`); query parameters and row keys are
  URL-encoded (`&`, `#`, `+`, `%` or `/` in a search text or in a key broke the request or hit the wrong resource).
- Edit and delete buttons are visible on small screens too (they were hidden below the `sm` breakpoint) and have accessible names;
  the "clear selection" button has one as well (new messages `editRow`, `deleteRow`).
- After a partial failure of `multipleUpdate`/`multipleDelete` only the failed rows stay selected (the done rows were still selected
  and a retry sent requests for rows that no longer exist).

## [2.2.1] - 2026-10-08

### Fixed

- The table height is recomputed when the window is resized and when the surrounding layout changes. The table now fills the container below its toolbar (flex), so the pagination no longer ends up below the viewport.

## [2.2.0] - 2026-10-08

### Changed

- `patchRecord` now sends a real `PATCH` (it used to be an alias of `updateRecord`, a `PUT`); `api.Patch` added next to `Get/Post/Put/Delete`.

## [2.1.3] - 2026-10-06

### Changed

- Complete English documentation: rewritten `README.md`, new `CHANGELOG.md` and `docs/` (MkDocs, Material theme) with guides, full reference tables, backend contract and troubleshooting.
- `CHANGELOG.md` is now part of the published package files.

## [2.1.2] - 2026-10-06

### Fixed

- `Dialog` and `Notify` are invoked through the application's `$q` instead of the plugins imported from `quasar`, so they work in Vite dev mode when the application and the package resolve different copies of `quasar`. Without `$q` (tests, usage outside `setup()`) the imported plugins are used.

## [2.1.1] - 2026-10-06

### Fixed

- Type declarations are generated with `vue-tsc`: the `@pt2:*` listeners are no longer typed as `never` in consumers using `vue-tsc` 3.3. Emits are declared in tuple form.

## [2.1.0] - 2026-10-05

### Added

- Typed events (`PachiTable2Events<T>`) and typed slots (`toolbar-actions`, `selection-dialog`, `error`, `body-cell-*`, `header-cell-*`).
- `pt2:data` event with the clean paginated response; `pt2:load-error` event.
- `errorBanner` prop and `error` slot for list loading failures, with retry.
- `options.meta` in `createRecord` / `updateRecord` / `patchRecord` (forwarded to the alova request).
- Exported types `PachiTable2Api`, `PachiTable2Exposed`, `PachiTable2BulkItem`, `PachiTable2LoadedEvent`, scope types.

### Changed

- `canEdit` and `canDelete` are reactive and accept a function of the row.
- `pt2:loaded` is kept for backward compatibility (it delivers the alova success event).

## [2.0.1] - 2026-10-05

### Fixed

- Header cells receive the column props and expose `aria-sort`.
- Reactivity of `url`, `columns`, `rowKey`, `extraParams`, `watchingStates`, `nullsLast`, `initialSort`.
- `multipleUpdate` / `multipleDelete` use `Promise.allSettled`: they always reload, emit events for successful items and throw a summary error.
- After a delete that empties the current page the table goes back to the previous page.
- Narrower global CSS.

### Added

- Public API exports, Vitest unit tests.

### Changed

- Documentation references `@ilpachi/use-alova`.
- CI skips publishing when the version already exists.

## [2.0.0] - 2026-10-02

### Changed

- **Breaking:** every CSS custom property is `--pachi-*` and every class defined by the package starts with `pachi-`. Defaults have zero specificity (`:where(...)`).

## [1.0.1] - 2026-10-02

### Added

- First release as a standalone package (ESM + type declarations, Vite library mode).
- CI workflow (typecheck, build, publish on `v*` tags).

### Fixed

- Explicit `slots` type for `.d.ts` generation.

[3.0.0]: https://github.com/ellethee/pachifastquasar/compare/pachi-table2@2.2.2...pachi-table2@3.0.0
[2.2.2]: https://github.com/ellethee/pachifastquasar/compare/pachi-table2@2.2.1...pachi-table2@2.2.2
[2.2.1]: https://github.com/ellethee/pachifastquasar/compare/pachi-table2@2.2.0...pachi-table2@2.2.1
[2.2.0]: https://github.com/ellethee/pachifastquasar/compare/pachi-table2@2.1.3...pachi-table2@2.2.0
[2.1.3]: https://github.com/ellethee/pachifastquasar/compare/pachi-table2@2.1.2...pachi-table2@2.1.3
[2.1.2]: https://github.com/ellethee/pachifastquasar/compare/pachi-table2@2.1.1...pachi-table2@2.1.2
[2.1.1]: https://github.com/ellethee/pachifastquasar/compare/pachi-table2@2.1.0...pachi-table2@2.1.1
[2.1.0]: https://github.com/ellethee/pachifastquasar/compare/pachi-table2@2.0.1...pachi-table2@2.1.0
[2.0.1]: https://github.com/ellethee/pachifastquasar/compare/pachi-table2@2.0.0...pachi-table2@2.0.1
[2.0.0]: https://github.com/ellethee/pachifastquasar/compare/pachi-table2@1.0.1...pachi-table2@2.0.0
[1.0.1]: https://github.com/ellethee/pachifastquasar/releases/tag/pachi-table2@1.0.1
