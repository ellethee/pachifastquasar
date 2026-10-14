# Backend contract

**Minimum pachifast version:** 0.3.0 for the Appearance section (the `appearance` fields, the `apply` key of the schema and the optional `PATCH /auth/user/settings`); the plain settings endpoints (`GET`, schema, `PUT`) exist since 0.1.x. The `default` field of the schema (used by "Reset appearance") needs pachifast >= 0.6.0; older backends fall back to the built-in defaults. See the pachifast CHANGELOG.

## Backend contract

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
| `icon` | category | Material-style icon name (`"bug_report"`) or `null`. See [Icons](reference.md#icons). |
| `route` | category | Optional route of the section. Not used by the page. |
| `fields` | category | `{ fieldKey: field }`, `fieldKey` in camelCase. |
| `component` | field | Which component renders the field (see the table above). |
| `label` | field | Label text; used when `properties.label` is missing. If both are missing the key is capitalized. |
| `labelKey` | field | i18n key of the label. |
| `properties` | field | Props passed to the component (`options`, `emitValue`, `hint`, ...). |
| `propertyKeys` | field | `{ propertyName: i18nKey }` for the texts inside `properties`. |
| `optionKeys` | field | `{ optionValue: i18nKey }` for the labels of `properties.options`. |
| `apply` | field | Name of an [applier](appliers.md) (`theme`, `accent`, `density`, `fontScale`, `reduceMotion`, `locale` or an app one) run on load, from the cache and after each change. |
| `default` | field | Default value of the field (any JSON value, also `null`), exposed for every non-required field (pachifast >= 0.6.0). Used by "Reset appearance" and passed to appliers on `reset`. If missing (older backends) the package falls back to its built-in defaults for the standard `appearance.*` / `preferences.locale` fields. |
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
- `apply` sits next to `component` / `label` and names an [applier](appliers.md). Without it the package assumes the
  standard names for the fields of the table (old backends) and ignores other fields. `apply: null` disables it.
- `default` in the schema is the source of truth for "Reset appearance"; `null` is valid (`preferences.locale`: automatic).
  The defaults in the table above are hardcoded in the package only as a fallback for backends without `default`
  (`FALLBACK_DEFAULTS`).
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
app's `$q` (see [Troubleshooting](troubleshooting.md#troubleshooting)).

### Security of script strings

By default a trigger string that is not a named action is **never executed**. Only with
`setPachiSettingsOptions({ allowScriptStrings: true })` is it run as JavaScript through `new Function`, with a one-time
`console.warn` per string. That means the backend (or anyone who can alter the schema response) can run arbitrary code in
your app, and the CSP needs `'unsafe-eval'` in `script-src`. The backend of this suite emits named actions
(`ui_action("name", args)`), so you do not need the option: register your own actions with `registerSettingsActions`
instead. Enable it only for schemas you fully trust.
