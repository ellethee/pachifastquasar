# @ilpachi/fastquasar-admin

A generic **Admin** page for Vue 3 / Quasar apps, driven by the schema of the backend (`pachifast` admin API under
`/api/admin/models`). Nothing is declared in the frontend: the page asks the backend which models the user can see and
builds the table, the filters and the forms from the schema it returns.

- **Model list** (only models with the `view` permission) and a **server-side table**: columns, type-aware formatting,
  debounced search, sorting, pagination with a page size selector and filters.
- **Create / edit dialog** generated from the fields: text, number, toggle, select, date / time, JSON and **lookup**
  (foreign keys with async search). Required, read-only, nullable, defaults, min / max / step / maxlength.
  `PATCH` sends only the changed fields; `422` errors appear on the field.
- **Bulk actions** on the selected rows (with confirmation when the backend asks for it) and **history** of every row
  with the `old -> new` diff.
- Buttons follow the permissions of the current user (Add, Edit, Delete, each action).
- A route (`/admin`, `/admin/:app/:model`) and an account-menu entry ("Admin", shown only if the user can see at
  least one model) that the `@ilpachi/pachifastquasar` shell discovers automatically.
- Extension points: custom HTTP client, base path, form components, cell formatters, label overrides, hidden models.
- Self-contained styles (`--pachi-*` variables with zero-specificity defaults) and translated texts (Italian and
  English, via `@ilpachi/pachi-i18n`).

## Requirements

| Package | Range | Notes |
| --- | --- | --- |
| `vue` | `^3.5.0` | |
| `quasar` | `^2.20.0` | `QTable`, `QDialog`, `QSelect`, ... |
| `@quasar/extras` | `^2.0.0` | Icons are SVG paths from `@quasar/extras/mdi-v7`. |
| `vue-i18n` | `^11.0.0` | |
| `@ilpachi/pachi-i18n` | `>=0.1.0 <1.0.0` | Messages and `usePachiI18n`. |

No Pinia, no `vue-router` import and no import of the shell: the HTTP client comes from the app (see
[Usage](usage.md)).

## Installation

```bash
pnpm add @ilpachi/fastquasar-admin
```
