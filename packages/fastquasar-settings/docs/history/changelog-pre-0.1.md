# Changelog

All notable changes to `@ilpachi/fastquasar-settings` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html) (the package is in the `0.x` series: minor releases may
contain breaking changes).

## [Unreleased]

## [0.7.1] - 2026-10-13

### Changed

- `allowScriptStrings` stays `false` by default (script strings from the schema are not executed). When it is enabled, running a string
  via `new Function` now prints a one-time `console.warn`. Docs: new "Security of script strings" section (CSP `unsafe-eval`, trust in
  the backend) in the README and in the backend contract.

## [0.7.0] - 2026-10-12

### Changed

- **Breaking:** `@ilpachi/use-alova` (`^2.1.1`) is now a required peer dependency. The package uses the client registered by
  `createPachiApp` (`getUseAlovaInstance()`); the `fetch` fallback client and the `provide('useAlova')` / `inject` lookup are gone.
- Removed `createFetchHttp` (public export). `baseUrl` is now the `url` given to use-alova (it has no effect with a custom `getHttp`).
  `installPachiSettings({ app })` keeps `app` for `$q` only.

## [0.6.2] - 2026-10-12

### Fixed

- Saves of the same setting are serialized (two quick changes could reach the server in reverse order and the old value won).
- Pending saves are sent immediately when the tab is hidden or closed (`visibilitychange`); new `SettingsManager.flushAll()`.

## [0.6.1] - 2026-10-07

### Changed

- **"Reset appearance"** now uses the `default` exposed by the backend schema (`GET /user/settings/schema`,
  pachifast >= 0.6.0) for every field of the `appearance` section, instead of values hardcoded in the frontend.
  `null` is a valid default (e.g. `preferences.locale`: automatic language). The hardcoded defaults
  (`FALLBACK_DEFAULTS`) remain only as a fallback for older backends whose schema has no `default`.
- Appliers called with `ctx.source === 'reset'` (logout / change of user) receive the schema `default` of the field
  they are bound to (also `null`) instead of always `undefined`; `undefined` only when the schema has no default.
- New: `ISettingsSchema.default`, `SettingsManager.getDefault(category, key)`, exports `FALLBACK_DEFAULTS`,
  `collectDefaults`, `resolveFieldDefault`; `resetSettingsAppliers(defaults?)`.

## [0.6.0] - 2026-10-07

### Added

- **Appliers**: fields with `apply: "<name>"` in the schema are made effective by named appliers, at load, from a
  per-user cache at boot (no flash) and on every `set()`. Standard: `theme`, `accent`, `density`, `fontScale`,
  `reduceMotion`, `locale`; apps add their own with `registerSettingsApplier(name, fn(value, ctx))`. Backends without
  `apply` get the standard names for `appearance.*`, `preferences.locale` and `preferences.theme`.
- `installPachiSettings({ app, getUser, isAuthenticated })`: loads the settings at login / session restore and clears
  them at logout, without the page being open, listening to the `pachi:auth-changed` event emitted by the shell
  (`@ilpachi/pachifastquasar` >= 2.7). It also saves to the backend a theme change made with the app bar toggle
  (`pachi:theme-changed`) and a language change made with the language selector.
- Per-user cache `pachi-settings-cache:<userId>` with only the applier-bound values.
- The "Appearance" section now comes from the backend schema (`appearance`), with dedicated pickers for `theme`,
  `accent` and `density` selects and a "Reset appearance" button. The previous local section (browser-only) stays as a
  fallback when the backend has no `appearance`.
- `locale` fields rendered as a select (automatic + languages of the app); `number` fields render `type="number"` and
  save numbers.
- `SettingsManager.ensureLoaded()`, `setByApply()`, `primeUser()`, `activateUser()`, `deactivateUser()`.
- Styles for `data-font-scale` (`sm` | `lg`) and `data-reduce-motion` in `theme-defaults.scss`.
- Documentation: Appliers and auto-loading (see the README), backend contract for `appearance`/`preferences`/`apply`.

### Changed

- The Pinia store is no longer persisted in `localStorage` (it had no user in its key: another user could briefly see
  the previous settings). Initial value is `{}` (it used to contain `preferences.theme`).
- `clearSettings()` also resets the appliers to their defaults and drops responses still in flight.
- Fields with `component: "theme-toggle"` are not rendered; the page no longer applies theme/accent/density on mount
  (the appliers do, from the app boot).
- `SettingsManager.set()` when not authenticated no longer keeps `preferences.theme` locally.

## [0.5.0] - 2026-10-06

Minor bump (0.x series) because the meaning of `watch` changes.

### Fixed

- `events` / `watch` triggers sent by the backend as `{ "action": "...", "args": ... }` objects (what `pachifast`
  serializes with `ui_action(...)`) were silently skipped, so the actions of the real schema never ran. Both the object
  form (`args` as object, array or single value) and the legacy strings are now supported. The action context gains
  `args`, `params` and `arg`; the built-in `darkSet`, `darkSetWhenEquals` and `notify` also read `args.mode`,
  `args.value` and `args.message`. A trigger in an unknown format or naming an unknown action now produces a single
  `console.warn` instead of disappearing.
- "Compact" density had no effect: the page wrote `data-density="comp"` while the default styles and the shell react
  to `data-density="compact"`. The page now writes `compact`; a `comp` value saved in `localStorage` by older versions
  is read as `compact`.

### Changed

- `watch` now follows the backend semantics: the key of `{ observedField: action }` is the field whose change runs the
  action (same section, or `section.field`; snake_case keys match camelCase schema keys). Before, handlers were bound to
  the value of the field declaring the `watch`. A key that matches no field falls back to the old behaviour with a
  warning; `watch: true` is unchanged.
- New exported type `SettingsActionSpec`.

### Notes

- `ui_action(...)` has no `persist` option in the backend (only `action` and `args`), so none is supported.
- The "Wire format compatibility" notice and the density troubleshooting entry were removed from the docs.

## [0.4.2] - 2026-10-06

### Changed

- Documentation rewritten in English: complete README (installation from the internal registry, mounting in a
  `pachifastquasar` app, API reference, backend contract, styling, troubleshooting), this changelog and a `docs/`
  folder for a MkDocs site. No code changes.
- `package.json` `files` now includes `CHANGELOG.md`.

## [0.4.1] - 2026-10-06

### Fixed

- Notifications and dark mode go through the `$q` instance of the app instead of the plugins imported from `quasar`.
  In development Vite can serve two copies of `quasar` to the app and to the package, and the imported plugins were
  not installed (`create is not a function`).

### Changed

- The HTTP client references now point to `@ilpachi/use-alova` (replaces `httpachi`).

## [0.4.0] - 2026-10-05

### Added

- `menu` module (`@ilpachi/fastquasar-settings/menu`): factory of the "Settings" entry of the account menu
  (`/user/settings`, order 20, visible according to `config.auth.menu.showSettings`).
- `routes` module (`@ilpachi/fastquasar-settings/routes`): the `/user/settings` route, discovered automatically by the
  `@ilpachi/pachifastquasar` shell.

## [0.3.0] - 2026-10-05

### Added

- Named actions for the schema `events` / `watch` (`darkToggle`, `darkSet`, `darkSetWhenEquals`, `notify`) and
  `registerSettingsActions` / `listSettingsActions` to add application actions.
- Debounced saving (400 ms per key) with rollback of the previous value and a translated error notification when the
  `PUT` fails.
- Sidebar built from the categories of the schema (title, icon), with the local "Appearance" section merged in.
- Accessibility improvements (`aria-current`, `aria-pressed`, real buttons) and unit tests.

### Changed

- The release workflow skips publishing when the version already exists in the registry.

### Security

- Code coming from the backend is no longer executed: `new Function` and the need for `unsafe-eval` are gone. The old
  behaviour is available only through `setPachiSettingsOptions({ allowScriptStrings: true })`.
- Setting paths containing `__proto__`, `constructor` or `prototype` are ignored (prototype pollution).

## [0.2.0] - 2026-10-02

### Added

- First release as a standalone repository (moved from `pachifastquasar/packages`): `PachiSettingsPage`,
  `SettingsManager`, `useSettingsStore`, injectable HTTP client (`setPachiSettingsOptions`), schema texts through i18n
  keys (`titleKey`, `labelKey`, `propertyKeys`, `optionKeys`), icon resolver (`resolveSettingsIcon`,
  `setPachiSettingsIcons`) and self-contained `--pachi-*` styles.

[0.7.1]: https://github.com/ellethee/pachifastquasar/compare/fastquasar-settings@0.7.0...fastquasar-settings@0.7.1
[0.7.0]: https://github.com/ellethee/pachifastquasar/compare/fastquasar-settings@0.6.2...fastquasar-settings@0.7.0
[0.6.2]: https://github.com/ellethee/pachifastquasar/compare/fastquasar-settings@0.6.1...fastquasar-settings@0.6.2
[0.6.1]: https://github.com/ellethee/pachifastquasar/compare/fastquasar-settings@0.6.0...fastquasar-settings@0.6.1
[0.6.0]: https://github.com/ellethee/pachifastquasar/compare/fastquasar-settings@0.5.0...fastquasar-settings@0.6.0
[0.5.0]: https://github.com/ellethee/pachifastquasar/compare/fastquasar-settings@0.4.2...fastquasar-settings@0.5.0
[0.4.2]: https://github.com/ellethee/pachifastquasar/compare/fastquasar-settings@0.4.1...fastquasar-settings@0.4.2
[0.4.1]: https://github.com/ellethee/pachifastquasar/compare/fastquasar-settings@0.4.0...fastquasar-settings@0.4.1
[0.4.0]: https://github.com/ellethee/pachifastquasar/compare/fastquasar-settings@0.3.0...fastquasar-settings@0.4.0
[0.3.0]: https://github.com/ellethee/pachifastquasar/compare/fastquasar-settings@0.2.0...fastquasar-settings@0.3.0
[0.2.0]: https://github.com/ellethee/pachifastquasar/releases/tag/fastquasar-settings@0.2.0
