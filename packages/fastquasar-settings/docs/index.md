# fastquasar-settings

A user settings page for Vue 3 / Quasar apps, **driven by a JSON schema served by the backend**, plus a local
"Appearance" section (theme, accent colour, density).

- `PachiSettingsPage`: the page. The sidebar sections and the form fields are generated from
  `GET /api/auth/user/settings/schema`; values are read from `GET /api/auth/user/settings` and saved one key at a time
  with `PUT /api/auth/user/settings/{category}/{key}`.
- `SettingsManager` and `useSettingsStore`: the singleton service and the Pinia store behind the page. They can be used
  on their own to read or write a setting from any component.
- A menu entry ("Settings") and a route (`/user/settings`) that the `@ilpachi/pachifastquasar` shell discovers
  automatically.
- Named, declarative **actions** for the schema `events` / `watch` (no code coming from the backend is ever executed).
- Self-contained styles (`--pachi-*` CSS variables with zero-specificity defaults) and translated texts (Italian and
  English, via `@ilpachi/pachi-i18n`).

The package is designed for a `pachifast` backend and the `@ilpachi/pachifastquasar` shell, but it only depends on the
HTTP contract described in [Backend contract](backend-contract.md#backend-contract), so any backend that speaks it will work.

## Requirements

Peer dependencies (declared in `package.json`, installed by your app):

| Package | Range | Notes |
| --- | --- | --- |
| `vue` | `^3.5.0` | |
| `quasar` | `^2.20.0` | Used for the form components, `Dark` and `Notify`. |
| `@quasar/extras` | `^2.0.0` | Icons are SVG paths from `@quasar/extras/mdi-v7`. |
| `pinia` | `^3.0.0 || ^4.0.0` | Required: the settings live in a Pinia store. |
| `vue-i18n` | `^11.0.0` | |
| `@ilpachi/pachi-i18n` | `>=0.1.0 <1.0.0` | Messages and `usePachiI18n`. |

Optional: `pinia-plugin-persistedstate` is no longer used by this package (the store is not persisted: values that must
survive a reload live in a per-user cache).

The package ships ES modules only (`"type": "module"`) with TypeScript declarations.
