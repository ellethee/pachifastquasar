# Changelog

All notable changes to `@ilpachi/fastquasar-admin` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html) (the package is in the `0.x` series: minor releases may
contain breaking changes).

## [0.2.0] - 2026-10-12

### Changed

- **Breaking:** `@ilpachi/use-alova` (`^2.1.1`) is now a required peer dependency. The package uses the client registered by
  `createPachiApp` (`getUseAlovaInstance()`); the `fetch` fallback client and the `provide('useAlova')` / `inject` lookup are gone.
- Removed `createFetchHttp` (public export). `installPachiAdmin({ app })` still accepts `app` but no longer needs it for HTTP.
- Without `getHttp` and without a registered use-alova instance the model list stays unknown (retried after a pause) and the page shows a clear error.

## [0.1.1] - 2026-10-12

### Fixed

- Switching quickly between models no longer shows the schema or the list of the previous one (the late response is discarded).
- After a logout/login with another user a late response of the previous user no longer fills the model list, and the
  request in flight is not reused.
- A transient error (network, 5xx) while loading the model list no longer turns into "no models": the list stays unknown and is
  retried after a pause; only 401/403/404 mean "no admin access".
- Sorting and opening a row work from the keyboard (Enter/Space on the column header and on the first cell of the row).
- Numeric fields: whitespace only is an empty value (it was sent as `0`); integers beyond 2^53 are sent as strings.

## [0.1.0] - 2026-10-07

### Added

- First release: a generic **Admin** page driven by the backend schema (`pachifast` `/api/admin/models`).
- `PachiAdminPage`: model list (only models with `view`) and the selected model; routes `/admin` and
  `/admin/:app/:model`; the "Admin" entry of the account menu, shown only when the user can see at least one model
  (a 401/403/network error hides it silently).
- Server-side table (`QTable`): columns from `list.display`, type-aware alignment and formatting (boolean icon,
  locale dates, Decimal strings, compact JSON, select labels), debounced search, sorting on `orderFields`, page size
  selector, filters (`select`, `toggle`, `lookup`, `number`, `date`, text), row selection and bulk actions with
  confirmation, add / edit / delete according to `permissions` and `actions[].allowed`.
- Create / edit dialog generated from `fields`: `input`, `textarea`, `number`, `toggle`, `select`, `date`, `datetime`,
  `time`, `json` (validated) and `lookup` (async search with `_options`, `ids` for the saved value); defaults,
  `required` (creation only), `readonly`, `nullable`, `min`/`max`/`step`/`maxlength`; `PATCH` with the changed fields
  only; `422` errors on the field, `409`/`403`/`404` messages; read-only detail without the `change` permission.
- Multi-column sorting (Shift+click on the headers, `orderBy=-a,b`), range filters (`<field>__gte` / `__lte`, day boundaries
  for `datetime`), `422` errors on the matching filter (`loc: ["query", ...]`), row titles in delete confirmations
  (one `_options?ids=` call), and a single shared request for the model list (menu and page).
- History tab (`schema.history` and `view`): paginated list with the `old -> new` diff of every change.
- `setPachiAdminOptions({ getHttp, basePath, components, formatters, labels, hideModels })` and
  `installPachiAdmin({ app, ... })` (HTTP client of the app, menu entry, `pachi:auth-changed`).
- Italian and English messages (`pachiAdmin` namespace), self-contained `--pachi-*` styles, unit tests.

[0.2.0]: https://github.com/ellethee/pachifastquasar/compare/fastquasar-admin@0.1.1...fastquasar-admin@0.2.0
[0.1.1]: https://github.com/ellethee/pachifastquasar/compare/fastquasar-admin@0.1.0...fastquasar-admin@0.1.1
[0.1.0]: https://github.com/ellethee/pachifastquasar/releases/tag/fastquasar-admin@0.1.0
