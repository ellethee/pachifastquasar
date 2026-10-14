# @ilpachi/fastquasar-settings

> **Status: beta.** Companion frontend of pachifast (Python backend by the same author). The API is evolving and may change between minor releases (0.x) — see CHANGELOG. ESM only. Requires @ilpachi/use-alova (peer) and a pachifast backend (see backend-contract). Provided "as is", without warranty of any kind (see [LICENSE](./LICENSE)). Not recommended for production use without pinning versions and testing against your pachifast backend.

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
HTTP contract described in [Backend contract](#backend-contract), so any backend that speaks it will work.

## Contents

- [Requirements](#requirements)
- [Installation](#installation)
- [Mounting it in a pachifastquasar app](#mounting-it-in-a-pachifastquasar-app)
- [Using the page directly](#using-the-page-directly)
- [Reference](#reference)
- [Backend contract](#backend-contract)
- [Appliers and auto-loading](#appliers-and-auto-loading)
- [Schema actions (events and watch)](#schema-actions-events-and-watch)
- [Translations](#translations)
- [Icons](#icons)
- [HTTP client resolution](#http-client-resolution)
- [Styling](#styling)
- [Troubleshooting](#troubleshooting)
- [Changelog](#changelog)
- [License](#license)

## Requirements

Peer dependencies (declared in `package.json`, installed by your app):

| Package | Range | Notes |
| --- | --- | --- |
| `vue` | `^3.5.0` | |
| `quasar` | `^2.20.0` | Used for the form components, `Dark` and `Notify`. |
| `@quasar/extras` | `^2.0.0` | Icons are SVG paths from `@quasar/extras/mdi-v7`. |
| `pinia` | `^3.0.0` | Required: the settings live in a Pinia store. |
| `vue-i18n` | `^11.0.0` | |
| `@ilpachi/pachi-i18n` | `>=0.1.0 <1.0.0` | Messages and `usePachiI18n`. |
| `@ilpachi/use-alova` | `^2.1.1` | Required: default HTTP client (`getUseAlovaInstance()`), registered by `createPachiApp` (or pass `getHttp`). |

Optional: `pinia-plugin-persistedstate` is no longer used by this package (the store is not persisted: values that must
survive a reload live in a per-user cache).

The package ships ES modules only (`"type": "module"`) with TypeScript declarations.

## Installation

```bash
pnpm add @ilpachi/fastquasar-settings
```

Install the peer dependencies too if your app does not have them yet: `@ilpachi/pachi-i18n`, `@ilpachi/use-alova`, `@quasar/extras`, `pinia`, `quasar`, `vue`, `vue-i18n`.

## Mounting it in a pachifastquasar app

With the `@ilpachi/pachifastquasar` shell nothing has to be written for the route and the menu entry: the shell scans
`node_modules/@ilpachi/*` for two modules of every package and registers what they export.

| Module (sub-path) | Default export | What the shell does with it |
| --- | --- | --- |
| `@ilpachi/fastquasar-settings/routes` (`dist/routes.js`) | an array of route records | Adds the `/user/settings` route to the router. |
| `@ilpachi/fastquasar-settings/menu` (`dist/menu.js`) | a menu factory `getMenuItem(ctx)` | Adds the "Settings" entry to the account menu. |

The scan is configured once in the app router (this is the default of the generated apps):

```ts
// src/router/index.ts
import { defineRouter } from '#q-app'
import { createPachiRouter } from '@ilpachi/pachifastquasar'
import { pachiConfig } from 'src/pachi-config'

export default defineRouter(function () {
  return createPachiRouter({
    config: pachiConfig,
    env: import.meta.env,
    mode: import.meta.env.QUASAR_VUE_ROUTER_MODE,
    base: import.meta.env.QUASAR_VUE_ROUTER_BASE,
    features: import.meta.glob('/src/features/**/routes.ts', { eager: true, import: 'default' }),
    packages: import.meta.glob('/node_modules/@ilpachi/*/{routes,dist/routes,src/routes}.{ts,js}', {
      eager: true,
      import: 'default',
    }),
    menus: import.meta.glob('/node_modules/@ilpachi/*/{menu,dist/menu,src/menu}.{ts,js}', {
      eager: true,
      import: 'default',
    }),
  })
})
```

### The route

```ts
{
  path: '/user/settings',
  meta: {
    hidden: true, // not shown in the side menu, reachable from the account menu
    titleKey: 'pachiSettings.pageTitle',
    descriptionKey: 'pachiSettings.description',
    icon: mdiCog,
  },
  beforeEnter: () => ensureMessages(), // registers the package messages before the title is rendered
  component: () => import('./components/PachiSettingsPage.vue'),
}
```

### The menu factory

`menu.ts` exports `getMenuItem(ctx)` (also as default export). It follows the `PachiMenuItemFactory` contract of the
shell, but the context type is declared locally (`IPachiSettingsMenuContext`), so the package never imports the shell.

```ts
getMenuItem({ t, config }) // =>
{
  label: t('pachiSettings.menuLabel'),
  caption: t('pachiSettings.menuCaption'),
  icon: mdiCog,
  to: '/user/settings',
  order: 20,
  visible: config?.auth?.menu?.showSettings ?? true,
}
```

The entry is hidden when the shell is configured with `auth.menu.showSettings = false`
(`QCLI_AUTH_MENU_SETTINGS=false`).

### Boot file

The page works without any configuration: the HTTP client comes from the `@ilpachi/use-alova` instance registered by
`createPachiApp` of the shell. A boot file is only needed to tell the package when the user is authenticated, or to use
the manager before the page is mounted:

```ts
// src/boot/pachi.ts
import { defineBoot } from '#q-app'
import { AuthManager, createPachiApp } from '@ilpachi/pachifastquasar'
import { setPachiSettingsOptions } from '@ilpachi/fastquasar-settings'
import { pachiConfig } from 'src/pachi-config'

export default defineBoot((ctx) => {
  createPachiApp(ctx, { config: pachiConfig /* , messages */ })

  setPachiSettingsOptions({
    isAuthenticated: () => AuthManager.getInstance().isAuthenticated,
  })
})
```

To load the settings at login, clear them at logout and apply theme, accent, density, language, etc. everywhere (not
only in the page), call `installPachiSettings({ app: ctx.app, getUser, isAuthenticated })` in the same boot file: see
[Appliers and auto-loading](#appliers-and-auto-loading). With it, calling `clearSettings()` by hand is no longer needed.

### Replacing the route with your own

To mount the page elsewhere (another path, a wrapper, extra `components`), disable the package routes with
`ilpachi-fastquasar-settings-disable-route` (the account-menu entry disappears with them) and declare your own route in
a feature of the app:

```ts
// src/features/account/routes.ts
import { defineComponent, h } from 'vue'
import type { RouteRecordRaw } from 'vue-router'
import { PachiSettingsPage } from '@ilpachi/fastquasar-settings'
import ToggleThemeButton from '../../components/ToggleThemeButton.vue'

const SettingsRoute = defineComponent(() => () =>
  h(PachiSettingsPage, { components: { 'theme-toggle': ToggleThemeButton } }),
)

export default [
  { path: '/account/settings', meta: { hidden: true, title: 'Settings' }, component: SettingsRoute },
] as RouteRecordRaw[]
```

## Using the page directly

Outside the shell (any Vue 3 + Quasar + Pinia + `@ilpachi/pachi-i18n` app) import the component:

```vue
<template>
  <pachi-settings-page :components="{ 'theme-toggle': ToggleThemeButton }" />
</template>

<script setup lang="ts">
import { PachiSettingsPage } from '@ilpachi/fastquasar-settings'
import ToggleThemeButton from './ToggleThemeButton.vue'
</script>
```

The `components` prop registers custom components that a schema field can reference by name in its `component`
attribute. Reading and writing a setting from anywhere:

```ts
import { SettingsManager } from '@ilpachi/fastquasar-settings'

const settings = SettingsManager.getInstance()
await settings.loadSettings() // after login: values + schema, one request each

settings.get('preferences', 'theme') // 'dark'
settings.set('preferences', 'theme', 'light') // optimistic update, debounced PUT (400 ms)

// reactive, v-model friendly
const theme = settings.getReactiveForKey<string>('preferences', 'theme')
theme.value = 'dark'

// a whole section as an object of computed refs
const audit = settings.getReactiveFor<{ disableActivityLog: boolean }>('audit')
audit.disableActivityLog.value = true
```

`setPachiSettingsOptions({ ... })` (see [Options](#options)) configures the HTTP client and the authentication check.

## Reference

### Exports

Everything below is exported from `@ilpachi/fastquasar-settings` unless stated otherwise.

| Export | Kind | Description |
| --- | --- | --- |
| `PachiSettingsPage` | component | The settings page. |
| `SettingsManager` | class | Singleton service (`SettingsManager.getInstance()`). |
| `useSettingsStore` | Pinia store (`id: 'settings'`) | State holder: `userSettings`, `getValue`, `setValue`, `clearSettings`, `resetSettings`. |
| `setPachiSettingsOptions(opts)` | function | Sets the global options (merged with the current ones). Call it once at startup. |
| `getPachiSettingsOptions()` | function | Returns the current options (all keys present). |
| `registerSettingsActions(actions)` | function | Registers named actions usable from the schema `events` / `watch`. |
| `listSettingsActions()` | function | Names of the available actions (built-in and registered), sorted. |
| `resolveSettingsIcon(name)` | function | Resolves a backend icon name to an SVG path (or `undefined`). |
| `setPachiSettingsIcons(map)` | function | Extends the icon map with `{ name: svgPath }`. |
| `@ilpachi/fastquasar-settings/menu` | module | Default export and `getMenuItem(ctx)`; also `SETTINGS_PATH` (`'/user/settings'`) and the types `IPachiSettingsMenuContext`, `IPachiSettingsMenuItem`. |
| `@ilpachi/fastquasar-settings/routes` | module | Default export: the array of route records; type `IPachiRouteRecord`. |

Exported types: `ISettingsActionContext`, `ISettingsActionDeps`, `SettingsActionHandler`, `IPachiSettingsHttp`,
`IPachiSettingsOptions`, `IPachiSettingsRequestConfig`, `IUserSettings`, `IUserSettingsResponse`,
`ISettingsSchemaResponse`, `ISettingsSchema`, `ISettingsCategory`, `ISettingsSchemaExtended`, `ComponentType`,
`SettingValue`.

### `PachiSettingsPage`

| Props | Type | Default | Description |
| --- | --- | --- | --- |
| `components` | `Record<string, Component>` | `undefined` | Custom components resolvable from the `component` attribute of a schema field (for example `{ 'theme-toggle': ToggleThemeButton }`). |

| Events | Description |
| --- | --- |
| none | The page emits no events. |

| Slots | Description |
| --- | --- |
| none | The page exposes no slots. |

How a field is rendered: the `component` attribute of the schema field selects the Vue component.

| `component` value | Rendered as |
| --- | --- |
| `string`, `text`, `number`, `input`, `QInput` | `QInput` |
| `toggle`, `QToggle` | `QToggle` |
| `checkbox`, `QCheckbox` | `QCheckbox` |
| `select`, `QSelect` | `QSelect` |
| a key of the `components` prop | that component |
| anything else | `QToggle` if the current value is a boolean, otherwise `QInput` |

Every field receives `v-model` (bound to the store through `getReactiveForKey`), the translated `properties` (see
[Translations](#translations)), `dense`, `outlined`, and the resolved `events` handlers. The value type is not coerced:
a `number` field is a plain `QInput` and writes whatever Quasar emits (a string unless the schema passes
`type: 'number'` in `properties`).

The page states: a spinner while loading, an error panel with a "Retry" button (which reloads the browser window) when
the schema or the values cannot be loaded, and an "empty section" panel for a section without fields.

**Sidebar sections.** Built from the schema categories (`Object.keys(schema)`): title from `titleKey` (translated) or
`title`, icon from `icon` (see [Icons](#icons)). The local `appearance` section is added if the schema has no category
with that name; when it has one, a single entry shows both. While the schema is not loaded, six fixed entries are shown:
`profile`, `notifications`, `editor`, `database`, `appearance`, `api` (texts in `pachiSettings.sections.<key>.{label,desc}`).

**The local "Appearance" section** is not stored on the backend. It saves in `localStorage` of the browser:

| `localStorage` key | Values | Effect |
| --- | --- | --- |
| `pachi-prefs-theme` | `dark` (default), `light`, `auto` | `$q.dark.set(true / false / 'auto')`. Same key as the shell's `ToggleThemeButton`. |
| `pachi-prefs-accent` | `teal` (default), `indigo`, `amber`, `violet`, `coral` | Sets `--pachi-accent`, `--pachi-accent-soft` and `--pachi-accent-ink` as inline style on `<html>`. |
| `pachi-prefs-density` | `comf` (default), `compact` | Sets the `data-density` attribute on `<html>` (`compact` is what the default styles and the shell react to). A legacy value `comp` is read as `compact`. |

A "Reset" button removes the three keys and restores the defaults. The preferences are applied when the page is mounted.

### `SettingsManager`

| Member | Signature | Description |
| --- | --- | --- |
| `getInstance()` | `static () => SettingsManager` | The singleton. |
| `loadSettings()` | `() => Promise<IUserSettingsResponse>` | `GET /user/settings` and `GET /user/settings/schema` in parallel, stores the values, starts the schema watchers. Returns `{}` (and warns) when `isAuthenticated()` is false. The schema is then available in `schema`. |
| `loadSettingsSchema()` | `() => Promise<ISettingsSchemaResponse>` | Loads only the schema and (re)starts the watchers. |
| `schema` | getter `ISettingsSchemaResponse` | Last loaded schema (`{}` before the first load). |
| `userSettings` | getter / setter | The `{ category: { key: value } }` object of the store. |
| `get(category, key)` | `=> SettingValue \| undefined` | Reads a value (the key may be a dotted path, `a.b`). |
| `set(category, key, value)` | `=> void` | Updates the store immediately and sends the value with a debounced `PUT` (400 ms per `category/key`). If the request fails the previous value is restored and a negative notification (`pachiSettings.saveError`) is shown. The field's applier (`apply`) runs immediately and the per-user cache is updated. When not authenticated the call is ignored with a warning. |
| `getApplicationSettings(category)` | `=> IUserSettings \| undefined` | The values of one category. |
| `getReactiveFor<T>(category)` | `=> { [K in keyof T]: ComputedRef<T[K]> }` | Proxy returning a writable `computed` for each key. |
| `getReactiveForKey<T>(category, key)` | `=> ComputedRef<T \| undefined>` | Writable `computed` (getter reads the store, setter calls `set`). |
| `ensureLoaded()` | `() => Promise<IUserSettingsResponse>` | Reuses the load in progress or done for the current user (the page uses it), otherwise `loadSettings()`. |
| `setByApply(name, value)` | `=> boolean` | Saves the field bound to the applier `name` (e.g. `theme`), if the user is authenticated and the value differs. |
| `primeUser(userKey)` / `activateUser(userKey)` / `deactivateUser()` | | Used by `installPachiSettings` on `pachi:auth-changed`. |
| `clearSettings()` | `=> void` | Cancels pending saves, stops the watchers, empties the schema and the store and resets the appliers to their defaults. Automatic on logout with `installPachiSettings`. |

The URL segments `category` and `key` are encoded with `encodeURIComponent`.

### `useSettingsStore`

Pinia setup store with id `settings`. It is **not persisted**: the values of the current user are loaded at login; applier-bound values are cached per user.

| Member | Description |
| --- | --- |
| `userSettings` | `ref<Record<string, IUserSettings>>`. Initial value: `{}`. |
| `getValue(category, key)` | Reads a value; `key` may be a dotted path. |
| `setValue(category, key, value)` | Writes a value; paths containing `__proto__`, `constructor` or `prototype` are ignored. |
| `clearSettings()` | Resets `userSettings` to the initial value. |
| `resetSettings()` | Alias of `clearSettings()` (kept for compatibility). |

### Options

`setPachiSettingsOptions(opts: IPachiSettingsOptions)`; every key is optional and merged with the current options.

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `getHttp` | `() => IPachiSettingsHttp` | the `@ilpachi/use-alova` client registered by the app (`createPachiApp`) | Returns the HTTP client (see [HTTP client resolution](#http-client-resolution)). It is called at every request. |
| `isAuthenticated` | `() => boolean` | `() => true` | When it returns `false`, `loadSettings` and `set` do not call the backend. |
| `baseUrl` | `string` | `'/api/auth'` | `url` passed to `@ilpachi/use-alova` to create the default client (requests are relative to it). Changing it recreates the cached client. It has no effect on a client set with `getHttp`. |
| `allowScriptStrings` | `boolean` | `false` | Legacy fallback: run as JavaScript (`new Function`) the `events` / `watch` strings that are not named actions. Needs `unsafe-eval` in the CSP and runs code coming from the backend: leave it off unless you trust the schema. |

`IPachiSettingsHttp` is the minimal client the package needs:

```ts
interface IPachiSettingsHttp {
  Get<T = unknown>(url: string, config?: IPachiSettingsRequestConfig): PromiseLike<T>
  Put(url: string, data?: unknown, config?: IPachiSettingsRequestConfig): PromiseLike<unknown>
}
// IPachiSettingsRequestConfig: { cacheFor?: number | null; [key: string]: unknown }
```

An alova instance satisfies it. Requests are relative to `baseUrl` (`/user/settings`, `/user/settings/schema`,
`/user/settings/{category}/{key}`) and must resolve with the **already unwrapped** payload (see
[Backend contract](#backend-contract)). The `PUT` is sent with `{ cacheFor: null }`.

A custom client example (alova with the base URL `/api/auth` and the app's authentication):

```ts
setPachiSettingsOptions({
  getHttp: () => ({
    Get: (url, config) => alova.Get(url, config),
    Put: (url, data, config) => alova.Put(url, data, config),
  }),
  isAuthenticated: () => authManager.isAuthenticated,
})
```

## Backend contract

**Minimum pachifast version:** 0.3.0 for the Appearance section (the `appearance` fields, the `apply` key of the schema and the optional `PATCH /auth/user/settings`); the plain settings endpoints (`GET`, schema, `PUT`) exist since 0.1.x. The `default` field of the schema (used by "Reset appearance") needs pachifast >= 0.6.0; older backends fall back to the built-in defaults. See the pachifast CHANGELOG.

All paths are relative to `baseUrl` (default `/api/auth`). The three endpoints require an authenticated user.

| Method and path | Purpose |
| --- | --- |
| `GET /api/auth/user/settings` | Current values of the user, nested by category. Keys in camelCase. |
| `GET /api/auth/user/settings/schema` | The UI schema used to render the form. |
| `PUT /api/auth/user/settings/{category}/{key}` | Sets one value. Body `{"value": <string \| number \| boolean \| null>}`. |

For `PUT` the section and the key can be written in `snake_case` or in the camelCase used by the schema
(`disableActivityLog` or `disable_activity_log`). The page uses the keys as they come from the schema (camelCase).

### Envelope

By default the backend wraps every successful (2xx) JSON response:

```json
{ "success": true, "message": "...", "data": { } }
```

The package reads the **payload** (`data`), so the HTTP client must unwrap the envelope. The client of
`@ilpachi/pachifastquasar` does (`unwrapEnvelope`, disabled with `QCLI_HTTP_ENVELOPE=false` when the backend runs with
`PACHIFAST_ENVELOPE_ENABLED=false`). A custom client passed with `getHttp` must unwrap it too (or the backend must run with the
envelope switched off).

### `GET /user/settings` (payload)

```json
{
  "preferences": { "theme": "dark" },
  "audit": { "disableActivityLog": false }
}
```

### `GET /user/settings/schema` (payload)

```json
{
  "audit": {
    "title": "Audit",
    "titleKey": "settings.audit.title",
    "icon": "bug_report",
    "route": null,
    "fields": {
      "disableActivityLog": {
        "component": "toggle",
        "label": "Disable activity log (development/debug only)",
        "labelKey": "settings.audit.disable_activity_log.label"
      }
    }
  },
  "preferences": {
    "title": "Preferences",
    "titleKey": "settings.preferences.title",
    "icon": "tune",
    "route": null,
    "fields": {
      "theme": {
        "component": "select",
        "label": "Theme",
        "labelKey": "settings.preferences.theme.label",
        "properties": {
          "options": [
            { "label": "Light", "value": "light" },
            { "label": "Dark", "value": "dark" }
          ],
          "emitValue": true
        },
        "optionKeys": { "light": "settings.preferences.theme.options.light" },
        "events": { "update:modelValue": { "action": "darkSet", "args": {} } }
      }
    }
  }
}
```

The example is illustrative: titles, labels and options depend on the sections your project defines.

| Schema attribute | Level | Description |
| --- | --- | --- |
| `title` | category | Title (translated by the backend with the language of the request). |
| `titleKey` | category | i18n key of the title (`settings.<section>.title`). |
| `icon` | category | Material-style icon name (`"bug_report"`) or `null`. See [Icons](#icons). |
| `route` | category | Optional route of the section. Not used by the page. |
| `fields` | category | `{ fieldKey: field }`, `fieldKey` in camelCase. |
| `component` | field | Which component renders the field (see the table above). |
| `label` | field | Label text; used when `properties.label` is missing. If both are missing the key is capitalized. |
| `labelKey` | field | i18n key of the label. |
| `properties` | field | Props passed to the component (`options`, `emitValue`, `hint`, ...). |
| `propertyKeys` | field | `{ propertyName: i18nKey }` for the texts inside `properties`. |
| `optionKeys` | field | `{ optionValue: i18nKey }` for the labels of `properties.options`. |
| `apply` | field | Name of an [applier](#appliers-and-auto-loading) (`theme`, `accent`, `density`, `fontScale`, `reduceMotion`, `locale` or an app one) run on load, from the cache and after each change. |
| `events` | field | `{ vueEvent: action }`, see [Schema actions](#schema-actions-events-and-watch). |
| `watch` | field | `{ observedField: action }` (runs when the observed field changes) or `true` (legacy: reuse `events`). |

### `PUT /user/settings/{category}/{key}`

Request body:

```json
{ "value": "dark" }
```

The response carries the updated values (the package ignores its content; an empty `204` answer is also accepted by the
default client).

### Contract for appearance and applied settings

The core backend (`pachifast`) exposes these sections; any other section is rendered generically.

| Section | Field | Type / values (default) | `apply` |
| --- | --- | --- | --- |
| `appearance` | `theme` | `dark` \| `light` \| `auto` (`auto`) | `theme` |
| | `accent` | `teal` \| `indigo` \| `amber` \| `violet` \| `coral` (`teal`) | `accent` |
| | `density` | `comf` \| `compact` (`comf`) | `density` |
| | `fontScale` | `sm` \| `md` \| `lg` (`md`) | `fontScale` |
| | `reduceMotion` | boolean (`false`) | `reduceMotion` |
| `preferences` | `locale` | string or `null` = automatic (`null`) | `locale` |
| | `timezone` | IANA string or `null` | none |
| | `dateFormat` | `auto` \| `dmy` \| `mdy` \| `ymd` (`auto`) | none |
| | `tablePageSize` | integer 10-100 (`25`) | none (app applier) |

- `select` fields are sent as `component: "select"` with `properties.options: [{ label, value }]`, `emitValue` and
  `mapOptions` set to `true`, and `optionKeys: { value: "settings.appearance.theme.options.dark" }`.
- `number` fields carry `properties.min` / `properties.max`.
- `apply` sits next to `component` / `label` and names an [applier](#appliers-and-auto-loading). Without it the package assumes the
  standard names for the fields of the table (old backends) and ignores other fields. `apply: null` disables it.
- `GET /user/settings` returns every field with its default for values never saved, so the page never sees holes.
- `preferences.theme` no longer exists. If an old backend still sends it (with `component: "theme-toggle"`) the field is
  not rendered.
- `PUT /user/settings/{category}/{key}` validates the value (type, `options`, `min`/`max`) and answers `422` with
  `detail[0].code = "user.settings_value_invalid"`, `loc = ["body", "value"]`, `params = { category, key }`; the package
  restores the previous value and shows `pachiSettings.saveError`. It accepts numbers (int/float) and `null`.
- Optional: `PATCH /user/settings` with `{ "appearance": { "theme": "dark" }, ... }`, all-or-nothing, same `422`, answers
  with all values. The package does not require it (it uses one `PUT` per field).

### Errors

Errors are never a 2xx. The backend answers with a non-2xx status and:

```json
{
  "detail": [
    {
      "loc": ["body", "value"],
      "msg": "...",
      "type": "value_error",
      "code": "user.settings_key_invalid",
      "params": { "category": "audit", "key": "nope" }
    }
  ]
}
```

| Status | `code` | Meaning |
| --- | --- | --- |
| `422` | `user.settings_category_invalid` | The `{category}` is not a settings section. |
| `422` | `user.settings_key_invalid` | The `{key}` does not exist in that section. |
| `422` | `user.settings_value_invalid` | The value is not valid for the field (type, option, range). |
| `401` | | Missing or expired token (the shell client refreshes the token and retries). |

When a `PUT` fails, `SettingsManager` restores the previous value and shows the translated
`pachiSettings.saveError` notification.

## Appliers and auto-loading

Some settings change how the whole app looks or behaves (theme, accent color, density, text size, motion, language).
The package makes them effective by itself: at login, after a page reload (from a per-user cache, so there is no flash
of the default look) and every time the user changes them. The mechanism is the **applier**.

### Installing it in the app

Call `installPachiSettings` once in the boot file, after `createPachiApp`:

```ts
// src/boot/pachi.ts
import { defineBoot } from '#q-app'
import { AuthManager, createPachiApp } from '@ilpachi/pachifastquasar'
import { installPachiSettings } from '@ilpachi/fastquasar-settings'

export default defineBoot((ctx) => {
  createPachiApp(ctx, { config: pachiConfig /* , messages */ })

  installPachiSettings({
    app: ctx.app, // $q is taken from the app
    getUser: () => AuthManager.getInstance().userInfo, // key of the per-user cache at boot
    isAuthenticated: () => AuthManager.getInstance().isAuthenticated,
  })
})
```

Without this call the package keeps working as before (the page loads the settings when it is opened), but nothing is
applied outside the page and nothing is cleaned up at logout.

### How the package learns about login and logout

The package never imports the shell. The shell (`@ilpachi/pachifastquasar` >= 2.7) emits two `CustomEvent`s on `window`,
and `installPachiSettings` listens to them:

| Event | `detail` | Emitted when |
| --- | --- | --- |
| `pachi:auth-changed` | `{ authenticated, userId, username }` | The authenticated user changes: login, restore of the session after a reload, change of user, logout (`authenticated: false`, ids `null`). A refresh of the token or of the user data does not emit. |
| `pachi:theme-changed` | `{ theme: 'dark' \| 'light' }` | The user toggles the theme with the `ToggleThemeButton` of the app bar. |

What the package does:

- `pachi:auth-changed` with a user: if it is another user than before, the previous settings are discarded and appliers
  go back to their defaults; then the cache of the new user is applied (no flash) and `GET /user/settings` +
  `GET /user/settings/schema` run (once, shared with the settings page). The page no longer is the only trigger.
- `pachi:auth-changed` without a user: pending saves are cancelled, the store is emptied, appliers are reset to their
  defaults (accent, density, text size, motion). Theme and language stay: they are choices of the device (login page).
  The per-user cache is kept (keyed by user, so it never reaches another user) to avoid a flash at the next login.
- `pachi:theme-changed`: if the schema has a field with `apply: "theme"` and the user is authenticated, the new value is
  saved with `PUT`, so the app bar toggle and `appearance.theme` never disagree. Against an old backend without such a
  field nothing is saved (the toggle keeps using `localStorage`).
- A change of the language with the selector of `@ilpachi/pachi-i18n` is saved the same way in the field with
  `apply: "locale"` (if any).

The store is **no longer persisted** in `localStorage` (it had no user in its key, so another user could see the previous
settings for a moment). Values needed before the response live in the per-user cache.

### The `apply` attribute

A schema field can declare `"apply": "<name>"`: the value of the field is passed to the applier `<name>` at load time,
from the cache at boot and after every `set()`. Fields without `apply` are only stored.

Standard appliers (registered by the package):

| Name | Values | Effect |
| --- | --- | --- |
| `theme` | `dark`, `light`, `auto` | `$q.dark.set(...)`; the value is also written to `localStorage` `pachi-prefs-theme`, which the shell's `ToggleThemeButton` reads. |
| `accent` | `teal`, `indigo`, `amber`, `violet`, `coral` | Sets `--pachi-accent`, `--pachi-accent-soft`, `-mid`, `-ink`, `-deep` on `<html>` (`teal` removes them: the theme defaults apply). |
| `density` | `comf`, `compact` | Attribute `data-density` on `<html>` (read by the shell and by the default styles). |
| `fontScale` | `sm`, `md`, `lg` | Attribute `data-font-scale` (`sm`/`lg`; `md` removes it) and variable `--pachi-font-scale`, styled in `theme-defaults.scss`. |
| `reduceMotion` | boolean | Attribute `data-reduce-motion="true"`; the default styles shorten animations and transitions. |
| `locale` | code, or `null` | Changes the language of `@ilpachi/pachi-i18n` (`it-IT` matches `it`). `null` = automatic (`navigator.languages`). |

When the schema has no `apply` attribute (backend older than the contract) the package assumes the standard appliers for
`appearance.theme|accent|density|fontScale|reduceMotion`, `preferences.locale` and `preferences.theme`.
`"apply": null` switches this default off for a field.

### Your own appliers

```ts
import { registerSettingsApplier } from '@ilpachi/fastquasar-settings'

// ctx: { name, category?, key?, source: 'cache' | 'load' | 'set' | 'reset' }
registerSettingsApplier('tablePageSize', (value, ctx) => {
  if (ctx.source === 'reset') return // logout / change of user: `value` is undefined, go back to the default
  tableDefaults.pageSize = Number(value)
})
```

Rules: an applier must be **idempotent** (it runs with the same value at boot, at load and after changes), must not
throw (errors are logged and ignored) and receives `value === undefined` with `source: 'reset'` at logout. Registering an
existing name replaces it; `registerSettingsApplier` returns the function that undoes the registration. Register custom
appliers before the user logs in (in the boot file); the cache applies only appliers that exist at that moment.

`tablePageSize` is deliberately **not** applied by the shell: each table component decides how to use it. Register an
applier as above (or read `SettingsManager.getInstance().get('preferences', 'tablePageSize')`).

### The per-user cache

After each load and each change the package writes, for the current user, the values of the fields that have an applier
in `localStorage` under `pachi-settings-cache:<userId>`:

```json
{ "v": 1, "apply": { "appearance.theme": "theme" }, "values": { "appearance.theme": "dark" } }
```

Only applier-bound fields are cached (never other settings, which may be sensitive). At boot `installPachiSettings`
applies the cache of `getUser()` before the first render.

### Appearance section

When the schema has an `appearance` section it is rendered like any other, with generic components, except that a
`select` whose `apply` is `theme`, `accent` or `density` (or a field with `component: "theme"` / `"accent"`, with
`properties.options`) uses a dedicated picker (theme previews, color pills, segmented toggle). The section also gets a
"Reset appearance" button that sends the defaults (`theme: auto`, `accent: teal`, `density: comf`, `fontScale: md`,
`reduceMotion: false`) for the fields present.

When the backend has **no** `appearance` section, the page keeps its previous local "Appearance" section (theme, accent
and density saved only in the browser) as a fallback. Fields with `component: "theme-toggle"` (old backends put one in
`preferences`) are not rendered: the theme is a field of `appearance`.

A field `preferences.locale` that is a plain input is shown as a select with "Automatic" (`null`) and the languages the
app offers. A `number` field is rendered with `type="number"` and saves a number (`null` when empty); `properties.min`
and `properties.max` are passed to the input and validated by the backend (`422`, the previous value is restored).

### Example: an app section with its own setting (Billing)

The backend declares a section of the app; the page renders it and `apply` hooks the value into the frontend:

```json
{
  "billing": {
    "title": "Billing",
    "icon": "receipt",
    "fields": {
      "invoiceLayout": {
        "component": "select",
        "apply": "invoiceLayout",
        "label": "Invoice layout",
        "properties": { "options": [{ "label": "Classic", "value": "classic" }, { "label": "Compact", "value": "compact" }], "emitValue": true, "mapOptions": true }
      },
      "paymentTermsDays": { "component": "number", "label": "Payment terms (days)", "properties": { "min": 0, "max": 120 } }
    }
  }
}
```

```ts
// src/boot/pachi.ts
registerSettingsApplier('invoiceLayout', (value) => {
  document.documentElement.setAttribute('data-invoice-layout', String(value ?? 'classic'))
})
```

For anything not covered by the standard components, map a component name to your own component with the
`components` prop of `PachiSettingsPage` (`{ 'color-grid': MyColorGrid }`): the component receives `modelValue`,
the field `properties` and emits `update:modelValue`.

## Schema actions (events and watch)

Fields may declare `events` (`{ vueEvent: action }`) and `watch`. The backend sends each trigger as an object with the
name of an action the frontend already knows and JSON arguments, never code:

```json
{ "events": { "update:modelValue": { "action": "darkSet", "args": {} } } }
```

Supported formats. Every trigger of `events` / `watch` can be written in either of these forms:

| Form | Example | Notes |
| --- | --- | --- |
| Object `{ action, args }` (what `pachifast` sends, `ui_action(...)`) | `{"action": "darkSet", "args": {"mode": "dark"}}` | `args` is normally a JSON object (the Python `**args`); an array or a single value is accepted too. Never executed as code. |
| String (legacy) | `"darkToggle"`, `"notify:Hello"`, `"() => $q.dark.toggle()"` | `name`, `name:argument` and the two historical scripts below. |

Arguments reach the action in its context: `ctx.params` (the `args` object, `{}` otherwise), `ctx.args` (always an
array: an array stays as is, a single value becomes `[value]`) and `ctx.arg` (the first scalar argument as a string, or
the text after `:` in the string form).

| String specification | Meaning |
| --- | --- |
| `name` | Runs the action `name`. |
| `name:argument` | Runs the action with `ctx.arg = 'argument'`. |
| `() => $q.dark.toggle()` | Legacy string, mapped to `darkToggle`. |
| `(v) => Dark.set(v === 'dark')` | Legacy string, mapped to `darkSetWhenEquals:dark` (the compared word may differ). |

A trigger in an unknown format (neither a string nor `{ action, args }`) or naming an unregistered action is skipped
with a single `console.warn`; other strings are ignored (with a warning) unless `allowScriptStrings` is on.

Limits: the backend has no `persist` option for `ui_action(...)` (only `action` and `args` exist), so nothing is
persisted by the schema; an action that needs it must do it itself. `args` that are not JSON are not supported.

Built-in actions:

| Action | Argument | Effect |
| --- | --- | --- |
| `darkToggle` | none | Toggles the dark theme (`$q.dark.toggle()`). |
| `darkSet` | `dark`, `light` or `auto` (`ctx.arg`, or `args.mode`); without argument the event value is used (`true` / `'dark'` mean dark) | Sets the dark mode. |
| `darkSetWhenEquals` | the expected value (`ctx.arg` or `args.value`, default `dark`) | Turns the dark mode on when the event value equals the argument, off otherwise. |
| `notify` | the message text (`ctx.arg` or `args.message`) | Shows a notification. |

`watch` follows the backend: `watch={"theme": ui_action("applyTheme")}` on a field means "run `applyTheme` when the field
`theme` changes". The key is the **observed** field: a field of the same section (`theme`; snake_case keys are matched
to the camelCase schema keys) or `section.field` for another section, and the handler receives the new value of that
field. The handlers also run once at load time (`immediate: true`). If the key matches no field, a warning is printed
and the field that declares the `watch` is observed instead (fallback for schemas that use a bare key). `watch: true`
(legacy, not produced by the backend) re-uses the `events` handlers on the value of the declaring field. Watchers are
started by `loadSettings` / `loadSettingsSchema` and stopped by `clearSettings`.

Applications add their own actions:

```ts
import { registerSettingsActions } from '@ilpachi/fastquasar-settings'

registerSettingsActions({
  // ctx: { arg?, args?, params?, Dark?, Notify?, $q? } followed by the event arguments (for `watch`, the new value)
  refreshMenu: (ctx, ...eventArgs) => {
    /* ... */
  },
})
```

A registered action overrides a built-in with the same name. `Dark` and `Notify` in the context are resolved on the
app's `$q` (see [Troubleshooting](#troubleshooting)).

### Security of script strings

By default a trigger string that is not a named action is **never executed**. Only with
`setPachiSettingsOptions({ allowScriptStrings: true })` is it run as JavaScript through `new Function`, with a one-time
`console.warn` per string. That means the backend (or anyone who can alter the schema response) can run arbitrary code in
your app, and the CSP needs `'unsafe-eval'` in `script-src`. The backend of this suite emits named actions
(`ui_action("name", args)`), so you do not need the option: register your own actions with `registerSettingsActions`
instead. Enable it only for schemas you fully trust.

## Translations

Texts of the package live in the `pachiSettings` namespace (Italian reference, English), registered through
`@ilpachi/pachi-i18n`. They are registered once, **without overriding** what the app already defines, so an app can
redefine any text, or add a language, by declaring the same keys in its own messages.

| Key | English text |
| --- | --- |
| `pachiSettings.pageTitle` | User settings |
| `pachiSettings.description` | Manage your user profile settings |
| `pachiSettings.menuLabel` | Settings |
| `pachiSettings.menuCaption` | Manage your user profile settings |
| `pachiSettings.sections.<key>.label` / `.desc` (`profile`, `notifications`, `editor`, `database`, `appearance`, `api`) | Texts of the known sections |
| `pachiSettings.themes.dark` / `light` / `auto` | Dark, Light, System |
| `pachiSettings.accents.teal` / `indigo` / `amber` / `violet` / `coral` | Accent names |
| `pachiSettings.densities.comf` / `comp` | Comfortable · 40px rows, Compact · 32px rows |
| `pachiSettings.loading`, `errorTitle`, `errorDesc`, `retry`, `saveError` | Loading, error and save feedback |
| `pachiSettings.appearance`, `appearanceNote`, `theme`, `accent`, `density` | Titles of the Appearance section |
| `pachiSettings.resetTitle`, `resetDesc`, `reset` | The "reset local preferences" box |
| `pachiSettings.emptyTitle`, `emptyDesc` | Empty section |

**Texts coming from the schema.** The schema may carry i18n keys instead of (or next to) the texts: `titleKey`,
`labelKey`, `propertyKeys` and `optionKeys`. If the key exists in the app messages it is translated, otherwise the text
already in the schema is used. These `settings.*` keys are **not** inside this package: they belong to the backend and
are exported into the app (`src/i18n/generated/<lang>.json`, produced by `pachifast locale export`). The page reacts to
a language change.

## Icons

All icons are SVG paths from `@quasar/extras/mdi-v7`. Icons that the backend sends as a name cannot be imported by name;
`resolveSettingsIcon(name)` resolves them:

| Input | Result |
| --- | --- |
| `null`, `undefined`, empty | `undefined` (no icon) |
| a valid SVG path (starts with `M`/`m` followed by a number) | the path itself |
| a name in the map | the mapped path |
| anything else (`mdi-xxx`, unknown name) | `undefined` |

Default map: `bug_report`, `tune`, `settings`, `person`, `palette`, `notifications`, `security`, `language`, `lock`.
The app extends it:

```ts
import { mdiBriefcase } from '@quasar/extras/mdi-v7'
import { setPachiSettingsIcons } from '@ilpachi/fastquasar-settings'

setPachiSettingsIcons({ work: mdiBriefcase })
```

## HTTP client resolution

Order used for every request:

1. the client returned by `getHttp`, if set with `setPachiSettingsOptions`;
2. otherwise the alova instance of `@ilpachi/use-alova` registered by the app: `getUseAlovaInstance()({ url: baseUrl }).alova`.
   `createPachiApp` of the shell registers it (authentication header, token refresh and error dialogs work without
   extra code). The client is cached and recreated only when the registered factory or `baseUrl` changes.

If no `@ilpachi/use-alova` instance has been created yet (and `getHttp` is not set) the first request throws an error
asking to call `createUseAlova()` or to pass `getHttp`.

## Styling

The package works on its own. It loads default values for the theme variables with zero specificity (`:where(...)`), a
dark theme on `:root`, a light theme on `body.body--light`, and a compact density on `:root[data-density='compact']`. If
the project defines the same `--pachi-*` variables, its values win. No CSS class of the host project is required, and
the component styles are not `scoped` (classes start with `pachi-st-`).

CSS variables read by the page (defaults: dark / light):

| Variable | Dark default | Light default | Used for |
| --- | --- | --- | --- |
| `--pachi-bg` | `#0a0d12` | `#f0f4f8` | Background of inset elements |
| `--pachi-surface` | `#10141b` | `#ffffff` | Cards, sidebar |
| `--pachi-surface-2` | `#161b23` | `#e8edf3` | Section headers, hover |
| `--pachi-surface-3` | `#1c2230` | `#dde3eb` | Hover of secondary controls |
| `--pachi-border` | `#1f2530` | `#d1d9e0` | Borders |
| `--pachi-border-hi` | `#2a3140` | `#b8c3cc` | Highlighted borders |
| `--pachi-ink` | `#e6eaf2` | `#1a2232` | Main text |
| `--pachi-ink-2` | `#b7becc` | `#3a4252` | Secondary text |
| `--pachi-muted` | `#7b8494` | `#6b7688` | Descriptions |
| `--pachi-accent` | `#2dd4bf` | `#2dd4bf` | Active section, selection |
| `--pachi-accent-soft` | `rgba(45,212,191,.12)` | `rgba(45,212,191,.1)` | Active backgrounds |
| `--pachi-accent-ink` | `#5eead4` | `#0f766e` | Accent text |
| `--pachi-red` | `#f87171` | `#dc2626` | Reset box |
| `--pachi-red-soft` | `rgba(248,113,113,.14)` | `rgba(220,38,38,.1)` | Reset box background |
| `--pachi-font` | `'Geist', 'Inter Tight', system-ui, -apple-system, sans-serif` | same | Text font |
| `--pachi-mono` | `'Geist Mono', 'JetBrains Mono', ui-monospace, monospace` | same | Monospace text |

The defaults file also defines, for projects that share the same theme: `--pachi-faint`, `--pachi-accent-mid`,
`--pachi-accent-deep`, `--pachi-blue`, `--pachi-blue-soft`, `--pachi-amber`, `--pachi-amber-soft`, `--pachi-green`,
`--pachi-title-font`, `--pachi-row-h` (40px, compact 32px), `--pachi-pad` (22px, compact 16px) and `--pachi-card-r`
(12px, compact 8px).

Besides reading them, the `accent` applier **writes** `--pachi-accent`, `--pachi-accent-soft`, `--pachi-accent-mid`,
`--pachi-accent-ink` and `--pachi-accent-deep` on `<html>` when the user picks an accent colour (`teal` removes them), so
those variables cannot be overridden permanently by the stylesheet of the project. The `density`, `fontScale` and
`reduceMotion` appliers write the attributes `data-density`, `data-font-scale` (`sm` | `lg`, with `--pachi-font-scale`)
and `data-reduce-motion="true"` on `<html>`; the default styles react to them (the font-scale and reduced-motion rules
are slightly more specific than `:where` because they must beat Quasar's `body` font size and transitions).

## Troubleshooting

**`create is not a function`, notifications or dark mode that do nothing (development only).** In development Vite may
serve two copies of `quasar` (one for the app and one for the package, pre-bundled separately). The plugins imported by
the package would then not be installed in its copy. The package avoids the problem: it uses the `$q` instance of the
app (resolved in `setup()` and remembered) for `Notify` and `Dark`, and only falls back to the imported plugins when no
`$q` has ever been available (tests, use outside a component). Do not replace this with `useQuasar()` or with the
plugins imported from `quasar` in your own action handlers: use `ctx.Dark` and `ctx.Notify`.

**Package state seems empty or duplicated** (`setPachiSettingsOptions` has no effect, registered actions are not found,
two manager instances). The state of the package (options, the manager singleton, registered actions) lives in module
scope, so the module must be loaded once. In development, exclude the `@ilpachi/*` packages from the Vite dependency
pre-bundling, so the routes/menu modules loaded with `import.meta.glob` and your own imports share one copy:

```ts
// quasar.config.ts
build: {
  extendViteConf(viteConf) {
    viteConf.optimizeDeps = {
      ...viteConf.optimizeDeps,
      exclude: [...(viteConf.optimizeDeps?.exclude ?? []), '@ilpachi/fastquasar-settings'],
    }
  },
}
```

`definePachiQuasarConfig` of `@ilpachi/pachifastquasar` already does this for every `@ilpachi/*` dependency of the app
(and de-duplicates `vue`, `quasar`, `pinia`, `vue-i18n` and the other singletons through `resolve.dedupe`); you only need
the snippet above outside the shell.

**The page shows "Loading error".** The schema or the values request failed. Check that the user is authenticated, that
`baseUrl` points to the auth router (`/api/auth`), that the dev proxy forwards `/api`, and that the HTTP client unwraps
the `{success, message, data}` envelope (a custom `getHttp` client must do it itself).

**Schema `events` do nothing.** Check the format: the package reads `{ action, args }` objects and `"name"` / `"name:arg"` strings (see
[Schema actions](#schema-actions-events-and-watch)), and the action must exist (`listSettingsActions()`). Unknown
actions print `Settings: azione "<spec>" sconosciuta` in the console.

**Settings of the previous user appear after a login.** The store is persisted; call
`SettingsManager.getInstance().clearSettings()` on logout.

## Changelog

See [CHANGELOG.md](./CHANGELOG.md).

## License

[MIT](./LICENSE) © ilPachi
