# Appliers and auto-loading

Some settings change how the whole app looks or behaves (theme, accent color, density, text size, motion, language).
The package makes them effective by itself: at login, after a page reload (from a per-user cache, so there is no flash
of the default look) and every time the user changes them. The mechanism is the **applier**.

## Installing it in the app

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

## How the package learns about login and logout

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

## The `apply` attribute

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
  if (ctx.source === 'reset') return // logout / change of user: `value` is the schema `default` (or undefined), go back to it
  tableDefaults.pageSize = Number(value)
})
```

Rules: an applier must be **idempotent** (it runs with the same value at boot, at load and after changes), must not
throw (errors are logged and ignored) and receives, with `source: 'reset'` at logout, the schema `default` of its field (`null` included; `undefined` if the schema has none, e.g. old backends). Registering an
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

## Appearance section

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

## Example: an app section with its own setting (Billing)

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
