# Edit dialog fields

A **field-driven section** for [`@ilpachi/pachi-kit/edit-dialog`](edit-dialog.md): describe a form as an array of rows of field definitions and `FieldsSection` renders, validates and tracks it.

- Field types: `text`, `textarea`, `number`, `boolean`, `select` (static or remote, with filtering and creation on the fly), `pdate` (date picker), or any custom component.
- Remote selects loaded with a single GET, through an injectable HTTP client (the `@ilpachi/use-alova` authenticated client is picked up automatically).
- **Dependent selects** (`dependsOn`, `params`): a city list that reloads when the country changes and clears itself.
- `required` and synchronous `rules`, `validate()` that shows every error, `commit()` / `reset()` / `hasChanges()` baseline handling.
- State limited to the declared fields, so several sections on the same record can be merged without overwriting each other.
- Texts in `it` and `en`; `--pachi-*` theming.

| I want to... | Read |
| --- | --- |
| Install it and show a first form | [Getting started](#getting-started) |
| Define fields, rows and types | [Defining fields](#defining-fields) |
| Load select options from the backend | [Remote selects](#remote-selects) |
| Make a select depend on another field | [Dependent selects](#dependent-selects) |
| Validate and track changes | [Validation and state](#validation-and-state) |
| Look up a key, prop or type | [Reference](#reference) |
| Know what the backend must return | [Backend contract](#backend-contract) |
| Fix a problem | [Troubleshooting](#troubleshooting) |

## Getting started

### Requirements

`fields` builds on the `edit-dialog` area (`useSection`) and on the `ui` area (`PachiDatePicker` for `type: 'pdate'`), both shipped in this package, and needs the optional peer `@ilpachi/use-alova` (`^2.1.1`, default HTTP client of the remote selects). The Quasar `Notify` plugin must be enabled (errors loading select options are reported with a notification). See [Installation](installation.md) for the installation.

### A first form in a dialog

```ts
import { markRaw } from 'vue'
import { useQuasar } from 'quasar'
import { PachiEditDialog } from '@ilpachi/pachi-kit/edit-dialog'
import type { AwaitableData, ISectionDefinition } from '@ilpachi/pachi-kit/edit-dialog'
import { FieldsSection } from '@ilpachi/pachi-kit/fields'
import type { IFieldRow } from '@ilpachi/pachi-kit/fields'

const rows: IFieldRow[] = [
  [{ field: 'title', label: 'Title', required: true, maxlength: 120, counter: true }],
  [
    { field: 'genre', label: 'Genre', type: 'select', url: '/api/genres', optionLabel: 'name', optionValue: 'id', useInput: true },
    { field: 'year', label: 'Year', type: 'number' },
  ],
  [{ field: 'published', label: 'Published', type: 'pdate' }],
  [{ field: 'notes', label: 'Notes', type: 'textarea', autogrow: true }],
  [{ field: 'active', label: 'Active', type: 'boolean' }],
]

const $q = useQuasar()
const sections: ISectionDefinition[] = [
  { key: 'main', title: 'Book', component: markRaw(FieldsSection), props: { rows }, initialValue: book ?? {} },
]

$q.dialog({
  component: PachiEditDialog,
  componentProps: { title: 'Edit book', sections, avoidHideWithChanges: true },
}).onOk(({ data, onSuccess, onError }: AwaitableData) => {
  save(data.sections.main).then(onSuccess).catch(onError)   // data.sections.main = { title, genre, year, ... }
})
```

Each inner array is a **row**: its fields are laid out side by side. `initialValue` is the record (or `{}` for a new one).

`FieldsSection` can also be used standalone (in a page) as long as the surrounding code calls its exposed `validate()`, `getResults()` and `commit()`.

### Real-world example

The demo application defines the general section like this: a text field with counter and hint, remote selects (one with creation on the fly), numbers with rules, a toggle and a textarea:

```ts
export function buildItemFieldRows(t: Translate): IFieldRow[] {
  return [
    [{ field: 'name', label: t('items.fields.name'), required: true, maxlength: 120, counter: true, clearable: true }],
    [
      { field: 'category', label: t('items.fields.category'), type: 'select', url: `${LOOKUPS_URL}/categories`,
        required: true, useInput: true, clearable: true },
      { field: 'status', label: t('items.fields.status'), type: 'select', url: `${LOOKUPS_URL}/statuses`, required: true },
    ],
    [
      { field: 'price', label: t('items.fields.price'), type: 'number', step: 'any', prefix: '€',
        rules: [(v: unknown) => v === null || Number(v) >= 0 || t('items.validation.priceMin')] },
      { field: 'quantity', label: t('items.fields.quantity'), type: 'number',
        rules: [(v: unknown) => v === null || (Number.isInteger(Number(v)) && Number(v) >= 0) || t('items.validation.quantityInt')] },
    ],
    [{ field: 'active', label: t('items.fields.active'), type: 'boolean' }],
    [{ field: 'notes', label: t('items.fields.notes'), type: 'textarea', autogrow: true, maxlength: 500, counter: true, clearable: true }],
  ]
}
```

and the localization section with a dependent select:

```ts
export function buildItemLocationRows(t: Translate): IFieldRow[] {
  return [[
    { field: 'countryId', label: t('items.fields.country'), type: 'select', url: `${LOOKUPS_URL}/countries`, clearable: true },
    {
      field: 'cityId', label: t('items.fields.city'), type: 'select', url: `${LOOKUPS_URL}/cities`,
      dependsOn: 'countryId',
      params: (values: Record<string, unknown>) => ({ countryId: values.countryId }),
      clearable: true,
    },
  ]]
}
```

The two sections are merged at save time with `{ ...data.sections.general, ...data.sections.location }`.

## Defining fields

A form is an array of rows, a row is an array of field definitions (`IFieldDef`). Only `field` and `label` are required.

```ts
const rows: IFieldRow[] = [
  [{ field: 'name', label: 'Name', required: true }],                       // one field
  [{ field: 'price', label: 'Price', type: 'number' }, { field: 'qty', label: 'Qty', type: 'number' }],  // two side by side
]
```

### Types

| `type` | Component |
| --- | --- |
| `text` (default) | `QInput` |
| `textarea` | `QInput` (`type="textarea"`) |
| `number` | `QInput` (`type="number"`), emits `number` or `null` |
| `boolean` | `QToggle` |
| `select` | `QSelect` (static `options` or remote `url`) |
| `pdate` | `PachiDatePicker` from `@ilpachi/pachi-kit/ui` (default mask `YYYY-MM-DD`) |

### Passing Quasar props through

Every key that is not part of the package vocabulary reaches the Quasar component:

```ts
{ field: 'price', label: 'Price', type: 'number', step: 'any', prefix: '€', class: 'col-4' }
{ field: 'tags', label: 'Tags', type: 'select', url: '/api/tags', multiple: true, useChips: true }
{ field: 'notes', label: 'Notes', type: 'textarea', autogrow: true, maxlength: 500, counter: true }
```

### Static select

```ts
{ field: 'level', label: 'Level', type: 'select', options: [{ label: 'Low', value: 1 }, { label: 'High', value: 3 }] }
```

The select always uses `emit-value` and `map-options`: the model holds the option value (`optionValue`, default `value`), the UI shows the label (`optionLabel`, default `label`, or a function).

### Custom components

`component` replaces the standard control. The component receives `v-model` plus every non-reserved key of the definition as props, and `options` if present:

```ts
import MyColorPicker from './MyColorPicker.vue'
{ field: 'color', label: 'Color', component: markRaw(MyColorPicker), palette: 'material' }
```

The package does not attach its own `filter` / `new-value` listeners to custom components. If the component exposes `validate()` it is called by `validate()`.

### Read-only forms

`<fields-section :rows="rows" readonly />` (or `props: { rows, readonly: true }` in a section definition) makes all fields read-only and disables toggles.

## Dependent selects

Use `dependsOn` (and optionally `params`) when the options of a select depend on the value of another field of the same section.

```ts
const rows: IFieldRow[] = [[
  { field: 'countryId', label: 'Country', type: 'select', url: '/api/countries', clearable: true },
  {
    field: 'cityId', label: 'City', type: 'select', url: '/api/cities', clearable: true,
    dependsOn: 'countryId',                                   // name or array of names
    params: (values) => ({ countryId: values.countryId }),    // object, or function of the current values
    // resetOnDependencyChange: false,                        // default true
  },
]]
```

Behaviour:

* While a dependency is empty (`null`, `undefined`, `''` or `[]`) **nothing is requested** and the options are empty. `0` and `false` count as values.
* When a dependency changes the options are requested again with the re-evaluated `params`: `GET /api/cities?pageSize=1000&countryId=2`. Empty values are omitted from the query; arrays are sent comma separated.
* Without `params`, the dependencies are sent as `<field>=<value>` (here `countryId=2` too).
* When the **user** changes a dependency, the dependent value is cleared (`null`, or `[]` for `multiple`) unless `resetOnDependencyChange: false`. Loading a record (`initialValue`) or calling `reset()` never clears it, so editing an existing record keeps its city.
* `pageSize` is always sent by the package; a `pageSize` returned by `params` is ignored.

`FieldsSection` passes the section state to every field. If you render a `DynamicField` yourself give it the state with the `values` prop; with `useRemoteSelect(field, values)` the second argument is the state (value, ref or getter).

```vue
<dynamic-field v-model="city" :field="cityField" :values="{ countryId: country }" />
```

## Remote selects

A select with `url` loads its options from the backend when the section is created (and again when `url` or the dependencies change).

```ts
{ field: 'category', label: 'Category', type: 'select', url: '/api/demo/lookups/categories', required: true, useInput: true, clearable: true }
```

* One request: `GET {url}?pageSize=1000`. The response is `{ items, total, page, pageSize }` (or a plain array). Each item needs `value` and `label` (change them with `optionValue` / `optionLabel`).
* There is **no server-side search**: with `useInput` the user types and the loaded options are filtered in the browser (case-insensitive, on the label).
* `pageSize` can be raised per field (`pageSize: 5000`); in development a console warning tells you when the backend reports more items than were received.
* While loading, the select shows its loading state; if the request fails a negative notification appears and the options stay empty (`useRemoteSelect(...).error` is `true`).

### Creation on the fly

With `useInput: true`, typed text that matches no option becomes a virtual option whose **value is the typed text**. The backend receives a string instead of an id for that field and is expected to resolve it (get-or-create by name). Text equal to an existing label (ignoring case) selects the existing option and its id.

### HTTP client

Resolution order, performed once in `setup()`:

1. the client registered with `setPachiFieldsHttp`;
2. the `@ilpachi/use-alova` instance (`getUseAlovaInstance()`, created by `createUseAlova()`, which `createPachiApp` of `pachifastquasar` does for you: authorization header, token refresh and error handling included).

If neither exists, an error is thrown asking you to call `createUseAlova()` or `setPachiFieldsHttp()`.

Register your own client once at start-up:

```ts
import { setPachiFieldsHttp } from '@ilpachi/pachi-kit/fields'

setPachiFieldsHttp({
  async get(url, params) {
    const qs = new URLSearchParams(Object.entries(params ?? {}).map(([k, v]) => [k, String(v)]))
    const res = await fetch(`${url}?${qs}`, { headers: { Authorization: `Bearer ${getToken()}` } })
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
    return res.json()
  },
})
```

The client must return the decoded body already without any `{ success, data }` envelope, and must throw on failures (the package turns the error into a notification).

### Using it outside forms

```ts
const { options, loading, error, filterFn, createValueFn, reload } = useRemoteSelect(
  () => ({ field: 'city', label: 'City', type: 'select', url: '/api/cities' }),
)
```

Bind `options`, `filterFn` (`@filter`) and `createValueFn` (`@new-value`) to your own `QSelect`. Call it from `setup()`.

## Validation and state

### `required` and `rules`

```ts
{ field: 'name', label: 'Name', required: true }
{ field: 'price', label: 'Price', type: 'number', rules: [(v) => v === null || Number(v) >= 0 || 'Must be 0 or more'] }
```

* `required` adds the rule "Required field" (translated), appends ` *` to the label and treats `null`, `undefined`, `''` and `[]` as empty (`0` and `false` are valid).
* `rules` are synchronous functions `(value) => true | string`; the string is the error message. They run after `required`.
* Quasar shows the errors while the user interacts. `validate()` forces them on **every** invalid field at once, including untouched ones, and returns `true` only if all fields are valid. `PachiEditDialog` calls it before emitting `ok`.

### Baseline, dirty state, reset

| Method | Effect |
| --- | --- |
| `hasChanges()` | State differs from the baseline (JSON comparison). |
| `reset()` | State goes back to the baseline. |
| `commit()` | The current state becomes the baseline. `PachiEditDialog` calls it through `commitAll()` after `onSuccess()`. |
| `setOriginalState(value)` | Replaces baseline and state. |
| `getResults()` | The state. |

### `initialValue` is reactive

If the record arrives after the dialog is mounted (asynchronous load) baseline and state are replaced. Passing a **new but equal** object (same declared fields, same values) does not discard what the user typed.

### Only declared fields

The state contains only the keys declared in `rows`. Other keys of the record (`id`, `createdAt`, fields handled by another section) never appear in `getResults()`:

* several `FieldsSection`s on the same record can be merged with `{ ...a, ...b }` without overwriting each other;
* **the `id` is not part of the results**: keep it from the record you opened.

### Numbers

`type: 'number'` converts the typed text to a `number`; an empty or non-numeric value gives `null` (not `0`), so rules should accept `null` as shown above.

## Reference

### `IFieldDef`

One field of the form. Every key that is not listed as "reserved" is passed unchanged (`v-bind`) to the underlying component, so any Quasar prop (`dense`, `class`, `prefix`, `maxlength`, `counter`, `step`, `autogrow`, `use-chips`, ...) works.

| Key | Type | Default | Description |
| --- | --- | --- | --- |
| `field` | `string` | required | Property name in the section state (and in `getResults()`). Also the Vue `key`: must be unique inside the section. *Reserved.* |
| `label` | `string` | required | Label. A `*` is appended when `required` is true. |
| `type` | `'text' \| 'textarea' \| 'number' \| 'boolean' \| 'select' \| 'pdate' \| string` | `'text'` | Which component is rendered, see [Field types](#field-types). *Reserved.* |
| `component` | Vue component | none | Renders this component instead of the standard ones (`v-model` + all other keys as props). `type` is ignored. *Reserved.* |
| `url` | `string` | none | Endpoint of a **remote select** (needs `type: 'select'`). *Reserved.* |
| `options` | `unknown[]` | none | Static options of a **local select** (alternative to `url`). *Reserved.* |
| `optionLabel` | `string \| (item) => string` | `'label'` | Key (or function) of the label of an option. *Reserved.* |
| `optionValue` | `string` | `'value'` | Key of the value of an option. *Reserved.* |
| `multiple` | `boolean` | `false` | Multiple selection (the value is an array). Also decides the reset value (`[]` instead of `null`). |
| `useChips` | `boolean` | `false` | Show selected values as chips (Quasar `use-chips`). |
| `useInput` | `boolean` | `false` | Typing filters the options; with remote/local selects it also enables **creation on the fly** (`new-value`). |
| `clearable` | `boolean` | `false` | Clear icon. |
| `autogrow` | `boolean` | `false` | Textarea that grows with its content. |
| `mask` | `string` | `'YYYY-MM-DD'` for `pdate` | Date mask of `PachiDatePicker`. |
| `pageSize` | `number` | `1000` | `pageSize` requested for a remote select. Invalid values (non-numeric, `<= 0`) fall back to `1000`. |
| `required` | `boolean` | `false` | Adds a "Required field" rule, an asterisk to the label, and is enforced by `validate()`. |
| `rules` | `((val: unknown) => boolean \| string)[]` | none | Synchronous rules. Return `true` for valid, or a string with the error message. They run after the `required` rule. |
| `hint` | `string` | none | Help text under the field. |
| `dependsOn` | `string \| string[]` | none | Field(s) of the same section this select depends on. *Reserved.* |
| `params` | `Record<string, unknown> \| (values) => Record<string, unknown>` | none | Extra query parameters of the remote GET. *Reserved.* |
| `resetOnDependencyChange` | `boolean` | `true` | With `dependsOn`: clear the value when a dependency is changed by the user. *Reserved.* |

*Reserved* keys are consumed by the package and not forwarded to the component. A form row is `IFieldRow = IFieldDef[]` (fields side by side); a form is `IFieldRow[]`.

### Field types

| `type` | Rendered component | Emitted value | Notes |
| --- | --- | --- | --- |
| `text` (default) | `QInput` | `string` | |
| `textarea` | `QInput type="textarea"` | `string` | Use `autogrow`, `maxlength`, `counter`. |
| `number` | `QInput type="number"` | `number` or `null` | Empty or non-numeric input gives `null`. Pass `step: 'any'` for decimals. |
| `boolean` | `QToggle` | `boolean` | Only `label` (with `*` if required) and `readonly` are applied. |
| `select` | `QSelect` | the option value (`emit-value` + `map-options` are always on) | Local (`options`) or remote (`url`); filter, creation on the fly, multiple. |
| `pdate` | `PachiDatePicker` (`@ilpachi/pachi-kit/ui`) | string in `mask` format | Default mask `YYYY-MM-DD`. |
| any + `component` | your component | whatever it emits | Receives `v-model` and every non-reserved key as props. |

Standard components are rendered `outlined dense stack-label` and fill the row (`col-grow`).

### `FieldsSection` (component)

A section for `PachiEditDialog` (or any container that follows the `ISectionExpose` contract).

| Prop | Type | Description |
| --- | --- | --- |
| `rows` | `IFieldRow[]` | The form definition. Required. |
| `initialValue` | `IFieldsState` | The record. Reactive: a change resets baseline and state (a new but equal object does **not** discard edits). Only the declared fields are copied. |
| `readonly` | `boolean` | Makes every field read-only (toggles are disabled). |

| Exposed member | Description |
| --- | --- |
| `getResults()` | The state: only the fields declared in `rows`. |
| `hasChanges()` | `true` if the state differs from the baseline. |
| `reset()` | Restore the baseline. Does **not** clear dependent selects. |
| `setOriginalState(value)` | Replace baseline and state. |
| `commit()` | Make the current state the new baseline (`hasChanges()` becomes `false`). |
| `validate()` | Run `required` and `rules` on all fields, show every error, return `true` only if all are valid. |
| `name` | `'FieldsSection'`. |

### `DynamicField` (component)

Renders one field; useful outside a section.

| Prop | Type | Description |
| --- | --- | --- |
| `modelValue` | `unknown` | Value (`v-model`). |
| `field` | `IFieldDef` | Definition. |
| `readonly` | `boolean` | Read-only. |
| `values` | `IFieldsState` | Current values of the section, needed by `dependsOn` / `params`. |

Event: `update:modelValue`. Exposed: `validate(): boolean`.

### `useRemoteSelect(field, values?)`

Composable behind remote selects. Call it from `setup()`. `field` and `values` accept a value, a ref or a getter.

| Returned member | Type | Description |
| --- | --- | --- |
| `options` | `Ref<unknown[]>` | Options currently visible (after filtering). |
| `loading` | `Ref<boolean>` | A request is in flight. |
| `error` | `Ref<boolean>` | The last load failed. |
| `filterFn(val, update)` | function | Handler for `@filter` of `QSelect` (client-side, case-insensitive, on the label). |
| `createValueFn(val, done)` | function | Handler for `@new-value` of `QSelect` (creation on the fly). |
| `reload()` | `() => Promise<void>` | Fetch the options again. |

Options are reloaded when `type`, `url`, `options`, the resolved `params` or the readiness of the dependencies change. Out-of-order responses are discarded. On error a negative `Notify` ("Unable to load the options of "<label>"") is shown and `error` is set.

### HTTP client

| Export | Description |
| --- | --- |
| `IPachiFieldsHttp` | `{ get<T>(url: string, params?: Record<string, string \| number>): PromiseLike<T> }`. |
| `setPachiFieldsHttp(http)` | Registers the client used by remote selects (call once at start-up). Highest precedence. |
| `getPachiFieldsHttp()` | Resolves the client: registered client, then the `@ilpachi/use-alova` instance (`getUseAlovaInstance()`, cached). Throws if none is available. |

### Types

`IFieldDef`, `IFieldRow`, `IFieldType`, `IFieldsState` (`Record<string, unknown>`), `IPachiFieldsHttp`, `IRemoteSelectApi`.

### Translations

Namespace `pachiEditDialogFields` (`it`, `en`) via `@ilpachi/pachi-i18n`: `loadError` (`{label}`) and `required`. Labels and hints come from your field definitions. Define the same keys in your application messages to override them.

### CSS

Styles are injected by the bundle. Classes: `pachi-fields-section`, `pachi-fields-row`; custom properties are `--pachi-*` with zero-specificity defaults, redefine them in your own CSS.

## Backend contract

The package performs **only GET requests, to load the options of remote selects**. Saving the form is up to the dialog's `ok` handler (see `@ilpachi/pachi-kit/edit-dialog`).

### Options of a remote select

```http
GET {field.url}?pageSize=1000
GET {field.url}?pageSize=1000&countryId=2        # dependent select
```

| Query parameter | Description |
| --- | --- |
| `pageSize` | `1000` by default (`field.pageSize` to change). A single request fetches all the options; there is no pagination or server-side search. It cannot be overridden through `params`. |
| the keys returned by `field.params` | Extra filters. `null`, `undefined`, `''` and empty arrays are dropped; arrays are sent as `a,b`; numbers stay numbers, everything else is stringified. |
| `<dependency>=<value>` | Without `params`, each field listed in `dependsOn` is sent under its own name. |

Response:

```json
{
  "success": true,
  "message": "",
  "data": {
    "items": [
      { "value": 1, "label": "Italy" },
      { "value": 2, "label": "France" }
    ],
    "total": 2,
    "page": 1,
    "pageSize": 1000
  }
}
```

* The `{ success, message, data }` envelope is removed by the HTTP client (`@ilpachi/use-alova`); with a custom client registered through `setPachiFieldsHttp` the body must already be `{ items, total, page, pageSize }`. A bare array is also accepted.
* Each item needs the keys named by `optionValue` (default `value`) and `optionLabel` (default `label`). Extra keys (for example `countryId` on a city) are kept on the option object and can be read from a custom `optionLabel` function.
* If `total` is greater than the number of `items` received, a warning is printed in the console in development: raise `field.pageSize`.

### Creation on the fly

For a select with `useInput: true`, text that does not match any option is turned into a "virtual" option whose value is **the typed string**. The form therefore sends a string where it normally sends an id: the backend must accept `id | string` for that field and create or look up the entity by name (get-or-create). Text that matches an existing label (case-insensitive) selects that option and gives its id.

### Saving

The values returned by `getResults()` are plain JSON: numbers (`number` fields, `null` when empty), booleans, strings, ids or arrays of ids (`multiple`). A typical mapping:

| Action | Request | Success response | Failure |
| --- | --- | --- | --- |
| Create | `POST {url}/` with the merged results | the created record | `{ "detail": [{ "loc", "msg", "type", "code", "params" }] }` |
| Update | `PUT {url}/{id}` with the merged results and `id` | the updated record | same |
| Delete | `DELETE {url}/{id}` | `204`, no body | same |

For tables see `@ilpachi/pachi-kit/table` (list, bulk-delete `POST` with an array of ids -> `{ "deleted": n }`, bulk-update `{ "items": [{ "id", ... }] }` -> `{ "updated": n }`).

Error bodies use the shape `{ "detail": [{ "loc": ["body", "name"], "msg": "...", "type": "...", "code": "demo.name_required", "params": {} }] }`: `code` is stable and translatable, `params` are its interpolation values.

## Troubleshooting

### `create is not a function` / the error notification does nothing in development

In Vite dev mode the application and a linked package can resolve **two copies of `quasar`**; plugins installed on the application's copy do not exist on the other. `useRemoteSelect` avoids this by notifying through the application's `$q` (read in `setup()`); it falls back to the imported `Notify` plugin only when no `$q` exists (tests, usage outside components). If you still see the error: enable the `Notify` plugin in `framework.plugins` and add `resolve.dedupe: ['vue', 'quasar', 'vue-i18n', 'pinia']` to the Vite configuration.

### `vue-tsc` complains in the consuming project

Use `vue-tsc` 3.x. Type the rows with `IFieldRow[]` and the validation rules as `(val: unknown) => boolean | string`; when a rule reads a typed value cast it inside the rule (`(v) => (v as number) >= 0 || '...'`). Section components stored in `ISectionDefinition` must be wrapped with `markRaw`. Make sure the peers `@ilpachi/pachi-kit/edit-dialog` (`^3.0.0`), `@ilpachi/pachi-kit/ui` (`^2.0.0`) and `@ilpachi/pachi-i18n` are installed in compatible versions.

### `@` or braces in labels or messages break the text

Messages go through `vue-i18n`, where `{ } @ |` are special syntax. In the message files (yours, or overrides of `pachiEditDialogFields.*`) write a literal `@` as `{'@'}`. Labels and hints in field definitions are used as given: if you build them with `t()`, the escaping applies to the message that `t()` reads, not to the definition.

### The `id` is not in the results

`getResults()` only contains the fields declared in `rows`, by design. Keep the id of the opened record in your handler and add it to the request: `{ ...data.sections.general, id }`.

### A dependent select is always empty

* The dependency must be a **declared field of the same section** (`dependsOn: 'countryId'` refers to `field: 'countryId'`).
* Standalone `DynamicField` needs the `values` prop.
* Check the request in the network tab: with `params` as a function make sure it returns the right key names (the backend might expect `country_id`).

### Select options appear truncated

Only `pageSize` items (default 1000) are requested. Increase `pageSize` in the field definition or reduce the lookup; a development console warning reports the discrepancy.

### `required` on a boolean does nothing

A `false` toggle is a valid value. Use a rule such as `rules: [(v) => v === true || 'You must accept']`.

### Remote select shows no options and no error

The response must be `{ items: [...] }` or a plain array, after envelope removal. If you replaced the HTTP client with `setPachiFieldsHttp`, make sure it returns the parsed body, not a `Response`.
