# @ilpachi/pachi-kit

A kit of generic [Quasar](https://quasar.dev) (Vue 3 / TypeScript) components used by the `@ilpachi` family of
packages. Everything is published as **one npm package**, split in **areas** that you import through sub-paths: each
sub-path has its own bundle and injects only its own styles.

| Area | Import | What it provides |
| --- | --- | --- |
| [UI building blocks](ui.md) | `@ilpachi/pachi-kit/ui` | `PachiDatePicker`, `PachiConfirmDialog`, `PachiPopupEdit`, `PachiDuotoneIcon` and small helpers. |
| [Dialog](dialog.md) | `@ilpachi/pachi-kit/dialog` | `PachiDialog`: toolbar, confirm/close or restore/save/close actions, awaitable `ok`, discard protection, programmatic opening, `QEditor` helpers. |
| [Edit dialog](edit-dialog.md) | `@ilpachi/pachi-kit/edit-dialog` | `PachiEditDialog`: an edit dialog made of composable sections with local state, reset and dirty check. |
| [Edit dialog fields](fields.md) | `@ilpachi/pachi-kit/fields` | `FieldsSection`: declarative field-driven form section (local and remote selects, dependent selects). |
| [Table](table.md) | `@ilpachi/pachi-kit/table` | `PachiTable2`: `QTable` with server-side paging and sorting and built-in CRUD bound to the API. |
| [Uploader](uploader.md) | `@ilpachi/pachi-kit/uploader` | `PachiUploader`: file upload with cards, previews, metadata, status and progress. |

Start from [Installation](installation.md) for the peer dependencies, the sub-path import rules and the i18n setup.

!!! warning "Status: beta"
    The API is evolving and may change between minor releases (0.x). Provided "as is", without warranty of any kind.
    Not recommended for production use without pinning versions and testing against your pachifast backend.

The package replaces the former `pachi-ui`, `pachi-dialog`, `pachi-edit-dialog`, `pachi-edit-dialog-fields`,
`pachi-table2` and `pachi-uploader` packages; their change history is kept in the repository under
`packages/pachi-kit/docs/history/`.
