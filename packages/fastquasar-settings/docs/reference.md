# Reference

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
| `primeUser(userKey)` / `activateUser(userKey)` / `deactivateUser()` | | Used by `installPachiSettings` on `pachi:auth-changed`: apply the per-user cache / also load / clear. |
| `clearSettings()` | `=> void` | Cancels pending saves, stops the watchers, empties the schema and the store and resets the appliers to their defaults (the per-user cache stays). Done automatically on logout by `installPachiSettings`. |

The URL segments `category` and `key` are encoded with `encodeURIComponent`.

### `useSettingsStore`

Pinia setup store with id `settings`. It is **not persisted** (the values of the current user are loaded at login; applier-bound values are cached per user, see [Appliers](appliers.md)).

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
[Backend contract](backend-contract.md#backend-contract)). The `PUT` is sent with `{ cacheFor: null }`.

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

## HTTP client resolution

Order used for every request:

1. the client returned by `getHttp`, if set with `setPachiSettingsOptions`;
2. otherwise the alova instance of `@ilpachi/use-alova` registered by the app: `getUseAlovaInstance()({ url: baseUrl }).alova`.
   `createPachiApp` of the shell registers it (authentication header, token refresh and error dialogs work without
   extra code). The client is cached and recreated only when the registered factory or `baseUrl` changes.

If no `@ilpachi/use-alova` instance has been created yet (and `getHttp` is not set) the first request throws an error
asking to call `createUseAlova()` or to pass `getHttp`.

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
