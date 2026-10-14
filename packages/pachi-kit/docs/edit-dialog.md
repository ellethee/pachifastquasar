# Edit dialog

A Quasar edit dialog assembled from **composable sections**. Each section owns its local state, knows whether it changed (dirty check), can be reset, validated and committed; the dialog orchestrates them: it validates everything, collects the results, hands them to you in an **awaitable** `ok` event and only closes when your save succeeds.

- Sections are plain Vue components described by an `ISectionDefinition` (`key`, `component`, `props`, `initialValue`, `order`, `container`, `side`).
- `useSection()` gives a section state with baseline, reset, commit and `hasChanges`, following an `initialValue` that arrives late (asynchronous record).
- Shared state between sections (`shared` prop, `setSharedValue`).
- Optional wrappers (`card`, `expansion`) and a side panel.
- Close protection when there are unsaved changes (`avoidHideWithChanges`) and a restore button.
- Texts in `it` and `en` via `@ilpachi/pachi-i18n`; theming with `--pachi-*` variables.

For declarative forms use the companion package [`@ilpachi/pachi-kit/fields`](fields.md), which provides a ready-made `FieldsSection`.

| I want to... | Read |
| --- | --- |
| Install it and open a dialog | [Getting started](#getting-started) |
| Write sections, containers, side panels, shared state | [Sections](#sections) |
| Validate, save asynchronously, handle errors | [Saving and validation](#saving-and-validation) |
| Protect against losing changes | [Unsaved changes](#unsaved-changes) |
| Look up props, events, slots, types | [Reference](#reference) |
| Know what the save handler should send | [Backend contract](#backend-contract) |
| Fix a problem | [Troubleshooting](#troubleshooting) |

## Getting started

### Requirements

Peer dependencies and the i18n setup are described in [Installation](installation.md). The Quasar plugins `Dialog` and `Notify` must be enabled (`framework.plugins` in `quasar.config`): `Notify` reports validation and save errors, `Dialog` opens the dialog itself and the "discard changes?" confirmation.

### A first dialog

A section is any component that exposes `reset`, `getResults` and `hasChanges`, receives an `initialValue` prop and keeps its state with `useSection`:

```vue
<!-- NameSection.vue -->
<template>
  <q-input v-model="state.name" label="Name" outlined :error="!!error" :error-message="error" />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useSection } from '@ilpachi/pachi-kit/edit-dialog'

const props = defineProps<{ initialValue?: { name: string } }>()
const { state, reset, commit, getResults, hasChanges } = useSection(
  { name: '' },
  { initialValue: () => props.initialValue },
)

const error = ref('')
function validate(): boolean {
  error.value = state.value.name.trim() ? '' : 'The name is required'
  return !error.value
}

defineExpose({ reset, commit, getResults, hasChanges: () => hasChanges.value, validate })
</script>
```

Open it with Quasar's dialog plugin and save in the `ok` handler:

```ts
import { markRaw } from 'vue'
import { useQuasar } from 'quasar'
import { PachiEditDialog } from '@ilpachi/pachi-kit/edit-dialog'
import type { AwaitableData, ISectionDefinition } from '@ilpachi/pachi-kit/edit-dialog'
import { mdiPencil } from '@quasar/extras/mdi-v7'
import NameSection from './NameSection.vue'

const $q = useQuasar()

function openEdit(item: { id: number; name: string }) {
  const sections: ISectionDefinition[] = [
    { key: 'general', title: 'General', component: markRaw(NameSection), initialValue: { name: item.name } },
  ]
  $q.dialog({
    component: PachiEditDialog,
    componentProps: { title: 'Edit item', icon: mdiPencil, sections, avoidHideWithChanges: true, width: '560px' },
  }).onOk(({ data, onSuccess, onError }: AwaitableData) => {
    api.update(item.id, data.sections.general)   // your HTTP call
      .then(onSuccess)                           // commit + close
      .catch(onError)                            // shake + notification, dialog stays open
  })
}
```

Always wrap section components with `markRaw` to avoid making them reactive.

### Real-world example

The demo application builds its create/edit dialog from two `FieldsSection`s (a general one in a card and a localization one in an expansion item) and saves through the table API:

```ts
$q.dialog({
  component: PachiEditDialog,
  componentProps: {
    title, icon,
    sections: [
      {
        key: 'general', title: 'General', icon: mdiTextBoxEdit,
        component: markRaw(FieldsSection), props: { rows: buildItemFieldRows(t) },
        initialValue: initial, order: 10,
        container: { type: 'card', flat: true, bordered: true, class: 'q-pa-md q-mb-md' },
      },
      {
        key: 'location', title: 'Location', icon: mdiMapMarker,
        component: markRaw(FieldsSection), props: { rows: buildItemLocationRows(t) },
        initialValue: initial, order: 20,
        container: { type: 'expansion', title: 'Location', icon: mdiMapMarker, defaultOpened: true },
      },
    ],
    avoidHideWithChanges: true,
    width: '720px',
    maxWidth: '95vw',
  },
}).onOk(async ({ data, onSuccess, onError }: AwaitableData) => {
  const body = { ...data.sections.general, ...data.sections.location }
  try {
    if (initial.id === undefined) await api.createRecord(body, { meta: { autoError: false } })
    else await api.updateRecord({ ...body, id: initial.id }, { meta: { autoError: false } })
    onSuccess()
  } catch (error) {
    onError(new Error(await describeError(error)))
  }
})
```

## Sections

A dialog is a list of `ISectionDefinition`. The dialog renders them top to bottom (ordered by `order`, default `999`, ties keep the array order), collects the results by `key` and orchestrates `reset`, `validate`, `commit`.

```ts
const sections: ISectionDefinition[] = [
  { key: 'general', title: 'General', component: markRaw(GeneralSection), initialValue: record, order: 10 },
  { key: 'dates', title: 'Dates', component: markRaw(DatesSection), props: { min: '2026-01-01' }, initialValue: record, order: 20 },
  { key: 'audit', title: 'Audit', component: markRaw(AuditSection), initialValue: record, side: true },
]
```

* `key` must be unique: results end up in `data.sections[key]`.
* `props` are bound to the component; `commonProps` of the dialog are merged on top of them for every section (useful for `readonly`, a locale, an API client...).
* `initialValue` is always passed as the `initialValue` prop.
* `enabled: false` removes a section dynamically (its state is not collected).
* `side: true` moves the section to a right-hand panel (320 px). Main and side areas are validated and saved together.

### Writing a section

A section is a component that:

1. declares an `initialValue` prop;
2. keeps its state with `useSection(defaultState, { initialValue: () => props.initialValue })`;
3. exposes `reset`, `getResults`, `hasChanges` (required) and optionally `validate`, `commit`.

```vue
<script setup lang="ts">
import { useSection } from '@ilpachi/pachi-kit/edit-dialog'

interface Dates { from: string | null; to: string | null }
const props = defineProps<{ initialValue?: Dates }>()

const { state, reset, commit, getResults, hasChanges } = useSection<Dates>(
  { from: null, to: null },
  { initialValue: () => props.initialValue },
)

function validate(): boolean {
  return !state.value.from || !state.value.to || state.value.from <= state.value.to
}

defineExpose({ reset, commit, getResults, hasChanges: () => hasChanges.value, validate })
</script>
```

Details worth knowing:

* `initialValue` is **followed**: if the record arrives after the dialog is mounted (asynchronous load) the baseline and the state are replaced by it. If the watched value is `undefined` nothing happens.
* `hasChanges` compares `JSON.stringify` of state and baseline: keep state JSON-serializable, and note that key order matters.
* `reset()` restores the baseline, `commit()` makes the current state the new baseline. The dialog calls `commit()` on every section after `onSuccess()`.
* If the section transforms the value on `getResults` (for example parsing a text field), compute `hasChanges` from the transformed value as the bundled `PermissionsSection` does.

### Containers

`container` wraps a section:

```ts
{ key: 'general', component: markRaw(S), container: { type: 'card', flat: true, bordered: true, class: 'q-pa-md q-mb-md' } }
{ key: 'location', component: markRaw(S), container: { type: 'expansion', title: 'Location', icon: mdiMapMarker, defaultOpened: true } }
```

| `type` | Component | Notes |
| --- | --- | --- |
| `card` | `QCard` | Other keys are passed as props / attributes. |
| `expansion` | `QExpansionItem` | `title` becomes `label`, `icon` is forwarded. |
| anything else | `div` | |

`type` is consumed by the dialog and never reaches the DOM.

### Shared state

Sections can talk to each other through a shared object. Provide the initial value with the `shared` prop, then read and write it from a section:

```ts
const { state, setSharedValue, getSharedValue, sharedState } = useSection(...)
setSharedValue('publishMode', 'draft')
const mode = getSharedValue<string>('publishMode')
```

`sharedState` is a ref; the final value is returned in `data.sharedState` of the `ok` event. Outside `PachiEditDialog` (unit tests, your own container) these members are `undefined` unless you call `useSectionsManager()` in an ancestor.

### Using the field-driven section

`@ilpachi/pachi-kit/fields` provides `FieldsSection`, a section that renders a declarative form:

```ts
import { FieldsSection } from '@ilpachi/pachi-kit/fields'
{ key: 'general', title: 'General', component: markRaw(FieldsSection), props: { rows: fieldRows }, initialValue: record }
```

Each `FieldsSection` returns only the fields it declares, so several sections on the same record can be merged with `{ ...data.sections.general, ...data.sections.location }` without overwriting each other.

## Saving and validation

### Flow

1. The user clicks the save button (visible only when there are changes).
2. The dialog calls `validate()` on every section that has it (main area, then side panel). If one returns `false` a negative notification ("There are errors to fix in the entered data.") is shown at the top, the dialog shakes and **nothing is emitted**.
3. Otherwise it collects `getResults()` of every section and emits `ok` with an **awaitable** payload.
4. Your handler does the work and calls:
   * `onSuccess()` to make the saved state the new baseline of every section (`commit()`), show the "saved" label and close the dialog (unless `closeOnSave` is `false`);
   * `onError(error)` to shake the dialog and show a negative notification `Error while saving: <message>`; the dialog stays open and the data untouched.

```ts
$q.dialog({ component: PachiEditDialog, componentProps }).onOk(({ data, onSuccess, onError }: AwaitableData) => {
  save(data.sections)
    .then(onSuccess)
    .catch(onError)
})
```

Because the dialog only closes when you call `onSuccess`, double saves and half-saved states are avoided: do not close it yourself. Save clicks are ignored while a previous save is pending (until `onSuccess`/`onError`, with a 10 s safety timeout), and errors thrown while validating or collecting results are reported like `onError`.

### Handling the result

```ts
interface AwaitableData {
  data: {
    sections: Record<string, unknown>  // by section key
    sharedState: Record<string, unknown>
  }
  onSuccess: () => void
  onError: (error: unknown) => void
}
```

`onError` accepts anything; for `Error` instances `error.message` is displayed, otherwise `String(error)`. Convert backend failures into readable messages before calling it (see the [Backend contract](#backend-contract)).

### Validation

* Put the validation inside the section (`validate()` can be asynchronous, for example to check uniqueness on the server).
* Return `true` for valid; the section is responsible for showing its own errors (for example with `q-input` `:error`).
* Sections without `validate` are considered valid.
* With `@ilpachi/pachi-kit/fields` the `FieldsSection` validates `required` and `rules` and shows the errors of every invalid field, touched or not.

### Resetting

The restore button calls `reset()` on every section. You can also call the exposed `reset()` of the dialog.

## Unsaved changes

`hasChanges()` of every section decides whether the dialog is "dirty". The dirty state drives:

* the visibility of the **restore** and **save** buttons in the footer;
* the close protection, when `avoidHideWithChanges` is `true`.

### `avoidHideWithChanges`

| State | `avoidHideWithChanges: false` (default) | `avoidHideWithChanges: true` |
| --- | --- | --- |
| No changes | Closes immediately (close button, Esc, click outside). | Closes immediately. |
| Unsaved changes | Closes immediately, changes are lost. | The dialog becomes `persistent`: Esc or a click outside shake it and open a confirmation ("There are unsaved changes. Are you sure you want to close?"); the close buttons open the same confirmation. |

`PachiDialog` from `@ilpachi/pachi-kit/dialog` uses the opposite default (`true`), and does not close on `onSuccess` of the edit save, while this dialog closes (set `closeOnSave: false` to keep it open).

After a successful save (`onSuccess`) the saved state is the new baseline, so closing no longer asks for confirmation.

```ts
componentProps: { title, sections, avoidHideWithChanges: true }
```

The confirmation is a Quasar dialog created through the application's `$q`, so the `Dialog` plugin must be enabled.

### Restoring

The restore button (and the exposed `reset()`) put every section back to its baseline. After `setOriginalState` or a change of `initialValue` the baseline is the new value.

### Saved indicator

With `closeOnSave: false`, after `onSuccess` the footer shows "saved just now", "saved Ns ago" (refreshed every second) and finally "saved". The timer stops by itself after one minute and when the dialog unmounts.

## Reference

### `PachiEditDialog` props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `sections` | `ISectionDefinition[]` | required | Sections to render. Sections with `enabled: false` are skipped, the rest is sorted by `order`. Sections with `side: true` go to the side panel. |
| `title` | `string` | required | Title shown in the toolbar (bold). Replaced by the `title` slot. |
| `icon` | `string` | `undefined` | Icon of the toolbar avatar (an SVG path from `@quasar/extras/mdi-v7`, or any Quasar icon string). Replaced by the `title-icon` slot. |
| `titleClass` | `string` | `'bg-primary text-white'` | Classes of the toolbar. |
| `rounded` | `boolean` | `false` | Rounded card corners (`--pachi-card-r`). |
| `shaped` | `boolean` | `false` | Shaped card (top-left and bottom-right corners rounded). |
| `maximized` | `boolean` | `false` | Full-screen dialog (`QDialog` `maximized`). |
| `top`, `left`, `bottom`, `right` | `string \| null` | `null` | CSS offsets applied to the card (`'10px'`). |
| `width`, `height`, `minWidth`, `minHeight`, `maxWidth`, `maxHeight` | `string \| null` | `null` | CSS sizes applied to the card (`'720px'`, `'95vw'`). |
| `cardClass` | `string` | `''` | Extra classes on the card. |
| `shared` | `Record<string, unknown>` | `{}` | Initial [shared state](#shared-state) (deep-cloned). Read **once** at setup: later changes of the prop are not applied. |
| `commonProps` | `Record<string, unknown>` | `{}` | Props passed to **every** section (merged over `section.props`). |
| `avoidHideWithChanges` | `boolean` | `false` | When `true` and there are unsaved changes the dialog becomes `persistent`, and closing it asks for confirmation. Note: `PachiDialog` (`@ilpachi/pachi-kit/dialog`) defaults to `true`; here the default is `false`. See [Unsaved changes](#unsaved-changes). |
| `closeOnSave` | `boolean` | `true` | Close the dialog when `onSuccess()` is called. With `false` the dialog stays open, the saved state becomes the new baseline and the "saved just now" label is shown. |
| `showActionLabels` | `boolean` | `false` | Shows the text label next to the icon of the footer buttons (restore, save, close). Default: icon only with a tooltip. The footer actions are right-aligned either way. |

The component is meant to be opened with Quasar's dialog plugin (`$q.dialog({ component: PachiEditDialog, componentProps })`), which also supplies the `ok` / `hide` listeners.

### Events

| Event | Payload | Description |
| --- | --- | --- |
| `ok` | `AwaitableData` = `{ data: { sections, sharedState }, onSuccess, onError }` | Emitted after **all sections validated**. `data.sections` maps each section `key` to its `getResults()`; `data.sharedState` is the shared state. Call `onSuccess()` to commit and close (or only commit, with `closeOnSave: false`), `onError(error)` to keep the dialog open and show the error. |
| `hide` | none | The dialog has been closed (Quasar `useDialogPluginComponent` event). |

### Slots

| Slot | Description |
| --- | --- |
| `title-icon` | Replaces the toolbar avatar built from `icon`. |
| `title` | Replaces the bold `title` text. |
| `toolbar-actions` | Extra content in the toolbar, before the close button. |
| `actionsBefore` | Content in the footer before the restore / save / close buttons. |
| `actionsAfter` (also `actionsafter`) | Content in the footer after the buttons. |

### Exposed members

| Member | Description |
| --- | --- |
| `reset()` | Restores every section to its baseline (main and side). |
| `shakeDialog()` | Shakes the dialog (used on validation / save errors; no side effect on the close flow). |
| `dialogRef`, `onDialogHide`, `onDialogOK` | From `useDialogPluginComponent` of Quasar. |

### Built-in footer

The footer shows the restore and save buttons **only when at least one section has changes**; the close button is always visible. After a successful save a label shows (visible only with `closeOnSave: false`, otherwise the dialog is already closed) "saved just now", "saved Ns ago" and then "saved" (the clock stops after 60 s).

### `ISectionDefinition`

| Field | Type | Description |
| --- | --- | --- |
| `key` | `string` | Unique key; it is the key of the section in `data.sections`. |
| `title` | `string` | Human title (metadata: the dialog does not render it; use `container.title` for an expansion header). |
| `icon` | `string \| null` | Icon metadata (same remark). |
| `component` | `Component` | The section component (wrap with `markRaw`). |
| `props` | `Record<string, unknown>` | Props bound to the component. |
| `initialValue` | `T` | Value passed to the component as the `initialValue` prop. |
| `order` | `number` | Ascending sort order (default `999`). |
| `enabled` | `boolean` | `false` hides the section (default `true`). |
| `side` | `boolean` | `true` renders the section in the right-hand side panel (320 px) instead of the main area. |
| `container` | `IContainer` | Optional wrapper, see below. |

`container`:

| `type` | Wrapper | Notes |
| --- | --- | --- |
| `'card'` | `QCard` | `title` / `icon` are ignored. |
| `'expansion'` | `QExpansionItem` | `title` becomes `label` (unless `label` is given) and `icon` is forwarded. |
| any other value | plain `div` | |

All other keys of `container` (`flat`, `bordered`, `class`, `defaultOpened`, ...) are bound to the wrapper as props/attributes; `type` is never rendered into the DOM.

### `ISectionExpose<T>` (what a section must expose)

| Member | Required | Description |
| --- | --- | --- |
| `reset()` | yes | Restore the baseline. |
| `getResults()` | yes | Returns the section value (sync or async). |
| `hasChanges()` | yes | `true` if the section differs from its baseline. |
| `validate()` | no | `boolean` (or promise). A `false` blocks the save and shows the validation notification. |
| `commit()` | no | Make the current state the new baseline; called after `onSuccess()`. |
| `name` | no | Optional label. |

A section receives its `initialValue` as a prop plus `section.props` and `commonProps`.

### `useSection<T>(initialState, options?)`

Local state of a section with baseline, reset and dirty check. Returns:

| Member | Type | Description |
| --- | --- | --- |
| `state` | `Ref<T>` | Editable state (deep-cloned from the initial state). |
| `originalState` | `Readonly<Ref<T>>` | Baseline. |
| `reset()` | `() => void` | `state` = clone of baseline. |
| `setOriginalState(value)` | `(value: T) => void` | Sets baseline **and** state (record loaded later). |
| `commit()` | `() => void` | Baseline = clone of the current state. |
| `getResults()` | `() => T` | The current state. |
| `hasChanges` | `ComputedRef<boolean>` | `JSON.stringify(state) !== JSON.stringify(original)`. |
| `sharedState`, `setSharedValue`, `getSharedValue` | from the dialog context | `undefined` when used outside `PachiEditDialog`. |

`options.initialValue` is a getter (`() => props.initialValue`) watched deeply and immediately: whenever it yields a value other than `undefined` **whose content differs from the last one applied** (structural comparison), baseline and state are reset to it, even when it arrives after mount. A new reference with the same content does not discard the user's edits. Values are deep-cloned (arrays, plain objects and `Date`; other objects go through `structuredClone`) after `toRaw`, so reactive objects are fine. The dirty check is a structural comparison (key order is irrelevant, an `undefined` property equals a missing one, `Date` compared by time). `getResults()` returns the live (reactive) state, not a copy: clone it if you need to keep it.

### Other exports

| Export | Description |
| --- | --- |
| `useSectionsManager(initialSharedState?)` | Creates the shared-state context and `provide`s it under `SectionContextKey`. Returns `{ sharedState, setSharedValue, getSharedValue }`. Used by `PachiEditDialog`; use it yourself if you build your own container. |
| `SectionContextKey` | `InjectionKey<ISectionContext>` to `inject` the context manually. |
| `SectionsContainer` | The component that renders a list of sections (props `sections`, `commonProps`). Exposes `resetAll`, `commitAll`, `validateAll`, `getResults`, `hasChanges`. |
| `sectionsRegistry` | Two **demo** sections (`scheduler`, `permissions`) useful for experiments and tests. Real applications define their own sections. |
| Types | `ISectionExpose`, `ISectionDefinition`, `SectionsContainerExpose`, `ISectionContext`, `SchedulerState`, `PermissionsState`, `IEditDialogData`, `AwaitableData`, `IUseSection`. |

### Translations

Messages live in the `pachiEditDialog` namespace of `@ilpachi/pachi-i18n` (`it`, `en`): `close`, `restore`, `save`, `savedNow`, `savedAgo`, `saved`, `validationErrors`, `saveError`, `discardTitle`, `discardMessage`, plus the texts of the demo sections. Define the same keys in your application messages to override them or add a language.

### CSS

Styles are injected by the JavaScript bundle. The card has the class `pachi-edit-dialog` (not `pachi-dialog`, so it can coexist with `pachi-dialog`). Custom properties are `--pachi-*` with zero-specificity defaults (`--pachi-surface`, `--pachi-border`, `--pachi-card-r`, ...); redefine them in your CSS. Layout classes: `pachi-dialog-body-split`, `pachi-dialog-editor-area`, `pachi-dialog-side-panel`, `pachi-dialog-footer`.

## Backend contract

`@ilpachi/pachi-kit/edit-dialog` **does not perform any HTTP request**. It collects the values of your sections and hands them to your `ok` handler, which talks to the backend. The contract below is therefore the one your handler is expected to follow when used together with the other `@ilpachi` packages (`@ilpachi/pachi-kit/table`, `@ilpachi/pachi-kit/fields`).

### What the `ok` handler receives

```ts
interface AwaitableData {
  data: {
    sections: Record<string, unknown>   // key of the section -> section.getResults()
    sharedState: Record<string, unknown>
  }
  onSuccess: () => void                 // commit baselines + close
  onError: (error: unknown) => void     // shake + negative notification, dialog stays open
}
```

With sections built from `FieldsSection`, `data.sections.general` is an object with only the declared fields. **It does not contain `id`**: keep the id of the opened record in your own variable.

### Typical save

| Action | Request | Success response |
| --- | --- | --- |
| Create | `POST {url}/` with the merged section values | the created record (`201`), envelope `{ success, message, data }` optional |
| Update | `PUT {url}/{id}` with the merged values (and `id`) | the updated record |
| Read before edit | `GET {url}/{id}` | the record (open the dialog with fresh data) |

The envelope is removed by the HTTP client (`@ilpachi/use-alova` or an equivalent). With `@ilpachi/pachi-kit/table` use its `createRecord` / `updateRecord`, which issue exactly these requests and reload the list.

### Errors

Failures reach `onError(error)`. The message shown is `error.message` for `Error` instances (`String(error)` otherwise), so convert backend errors into readable text first. The recommended backend error body is:

```json
{
  "detail": [
    {
      "loc": ["body", "name"],
      "msg": "Field required",
      "type": "missing",
      "code": "demo.name_required",
      "params": {}
    }
  ]
}
```

`code` is a stable machine-readable identifier (map it to a translation such as `errors.codes.demo.name_required`), `params` are the interpolation values and `loc` points to the offending input. Typical statuses to map: `403` (missing permission), `404` (record deleted by someone else: close the dialog and reload the list) and `422` (validation errors).

```ts
async function save({ data, onSuccess, onError }: AwaitableData, id?: number) {
  try {
    const body = { ...(data.sections.general as object), ...(data.sections.location as object) }
    if (id === undefined) await api.createRecord(body)
    else await api.updateRecord({ ...body, id })
    onSuccess()
  } catch (error) {
    onError(new Error(await describeError(error)))   // your own mapping of detail[].code / status
  }
}
```

## Troubleshooting

### The dialog does not close after saving

It closes only when you call `onSuccess()`. If your handler throws before reaching it, call `onError(error)` (the notification explains the problem) instead of leaving the promise pending.

### Sections lose their changes when the record arrives

Pass the record as `initialValue` and keep the state with `useSection(..., { initialValue: () => props.initialValue })`: it is followed after mount. Do not copy `props.initialValue` into a plain `ref` yourself.

### `hasChanges` is always `true` (or never `true`)

The check is `JSON.stringify(state) !== JSON.stringify(baseline)`. Make sure the state is JSON-serializable and that the key order is stable (for example do not rebuild the object with a different key order in `getResults`).

### `id` is missing from `data.sections`

Sections return only their own state (with `@ilpachi/pachi-kit/fields`, only the declared fields). Keep the id of the opened record in your own variable and add it to the request (`{ ...body, id }`).

### Duplicate copies of `quasar` in development (`create is not a function`)

In Vite dev mode an application and a linked package can resolve two copies of `quasar`. This package reads `$q` with `useQuasar()`, which injects the application's instance through a string key (`'_q_'`) and therefore works even with duplicates; the notifications and confirmation dialogs use that `$q`. If you still see the error add `resolve.dedupe: ['vue', 'quasar', 'vue-i18n', 'pinia']` to the Vite configuration and make sure the `Dialog` and `Notify` plugins are enabled.

### `vue-tsc` errors in consumers

Types are shipped as `dist/edit-dialog/index.d.ts` (generated with `vite-plugin-dts`). Use `vue-tsc` 3.x and type the `ok` handler with `AwaitableData`. A section component must be wrapped with `markRaw` when stored in a definition typed as `ISectionDefinition`.

### Special characters in messages

When overriding `pachiEditDialog.*` texts remember that `vue-i18n` treats `{ } @ |` as special: write a literal `@` as `{'@'}`.

### The dialog is cut on small screens

Set `max-width="95vw"` (and `max-height`) or `maximized`. The body scrolls inside the card; the footer stays visible.
