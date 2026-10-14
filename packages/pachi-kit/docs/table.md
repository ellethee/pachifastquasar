# Table

A Vue 3 / Quasar table component built on `QTable` with **server-side pagination and multi-column sorting**, a search box, row actions, selection with bulk actions and **built-in CRUD** against a REST resource. HTTP calls go through [alova](https://alova.js.org), so an application that already provides an authenticated client gets headers, token refresh and error handling for free.

- Server-side (default) or client-side (`localPagination`) paging and sorting.
- Typed events (`pt2:*`), typed slots and a typed exposed API (`reload`, `createRecord`, `updateRecord`, `deleteRecord`, `bulkUpdate`, `bulkDelete`, ...).
- Per-row permissions with `canEdit` / `canDelete`.
- Confirmation dialogs, error banner / error slot, spinner or skeleton during slow loads.
- Texts translated with `@ilpachi/pachi-i18n` (`it`, `en`).
- Theming through `--pachi-*` CSS variables.

### Where to go next

| I want to... | Read |
| --- | --- |
| Install it and render a first table | [Getting started](#getting-started) |
| Page, sort and filter on the server | [Server-side tables](#server-side-tables) |
| Show edit/delete only to some users or rows | [Row actions and permissions](#row-actions-and-permissions) |
| Act on the selected rows | [Selection and bulk actions](#selection-and-bulk-actions) |
| Customize cells, toolbar and error state | [Slots](#slots) |
| Handle events and errors | [Events and errors](#events-and-errors) |
| Plug in my own HTTP client | [HTTP client](#http-client) |
| Look up a prop, event or method | [Reference](#reference) |
| Know what the backend must implement | [Backend contract](#backend-contract) |
| Fix a problem | [Troubleshooting](#troubleshooting) |

## Getting started

### Requirements

`table` needs the optional peers `@ilpachi/use-alova` (`^2.1.1`, required by this area) and `alova` (`^3.3.0`); see [Installation](installation.md). Quasar's `Dialog` and `Notify` plugins must be enabled (`framework.plugins` in `quasar.config`, or `app.use(Quasar, { plugins: { Dialog, Notify } })`): `Dialog` is used for the delete confirmation and `Notify` for action errors.

### First table

```vue
<template>
  <pachi-table2
    ref="table"
    url="/api/items"
    :columns="columns"
    :initial-sort="[{ column: 'createdAt', direction: 'desc' }]"
    use-col-actions
    selection="multiple"
    dense
    @pt2:edit-item="onEdit"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { QTableColumn } from 'quasar'
import { PachiTable2 } from '@ilpachi/pachi-kit/table'
import type { PachiTable2Exposed } from '@ilpachi/pachi-kit/table'

interface Item { id: number; name: string; price: number; createdAt: string }

const table = ref<PachiTable2Exposed<Item> | null>(null)

const columns: QTableColumn<Item>[] = [
  { name: 'id', label: '#', field: 'id', align: 'left', sortable: true },
  { name: 'name', label: 'Name', field: 'name', align: 'left', sortable: true },
  { name: 'price', label: 'Price', field: 'price', align: 'right', sortable: true },
  { name: 'createdAt', label: 'Created', field: 'createdAt', align: 'left', sortable: true },
]

function onEdit(row: Item) {
  // open your own dialog, then call table.value?.updateRecord({ ...row, name: 'New name' })
}
</script>
```

What you get without further code: a filter input (sent as `search`), clickable headers (multi-sort, sent as `orderBy=name,-price`), pagination (`page`, `pageSize`), a delete button with confirmation (`DELETE /api/items/{id}`), a floating bar when rows are selected, spinner on slow loads.

The table needs a backend that follows the [backend contract](#backend-contract).

### Real-world example

The demo application ships a complete table with exact filters, server-side sorting, per-row permissions, bulk actions and a create/edit dialog built with `@ilpachi/pachi-kit/edit-dialog`. Its table template looks like this:

```vue
<pachi-table2
  ref="table"
  :url="ITEMS_URL"
  :columns="columns"
  :extra-params="extraParams"
  :watching-states="watchingStates"
  :initial-sort="initialSort"
  use-col-actions="emit-delete"
  :can-edit="canEditRow"
  :can-delete="canDeleteRow"
  error-banner
  :selection="canEdit || canDelete ? 'multiple' : 'none'"
  :rez-offset="16"
  dense
  @pt2:data="onData"
  @pt2:load-error="onLoadError"
  @pt2:edit-item="onEditRow"
  @pt2:delete-item="onDeleteRow"
  @pt2:record-created="onCreated"
  @pt2:record-deleted="onDeleted"
  @pt2:record-updated="onUpdated"
  @row-dblclick="onRowDblClick"
>
  <template #toolbar-actions="{ api }">
    <q-btn color="primary" label="Create" @click="openCreate()" />
    <q-btn flat round :icon="mdiRefresh" @click="api.reload()" />
  </template>

  <template #body-cell-status="{ slotProps }">
    <q-td :props="slotProps">
      <q-badge :color="statusColor(slotProps.row.status)" :label="slotProps.row.status" />
    </q-td>
  </template>

  <template #selection-dialog="{ selected, api }">
    <q-btn flat label="Deactivate" @click="bulkDeactivate(api, selected)" />
  </template>
</pachi-table2>
```

## Server-side tables

By default the table delegates paging, sorting and searching to the server. Every change of page, page size, sort, search text, `extraParams` or `watchingStates` triggers a new `GET {url}` (debounced by 300 ms, never cached).

### Request parameters

| Parameter | Source |
| --- | --- |
| `page`, `pageSize` | QTable pagination (initial page `1`, page size `50`) |
| `orderBy` | header clicks: first click ascending, second descending, third removes the column; several columns can be sorted at once. Format `name,-createdAt` |
| `search` | the filter input of the toolbar |
| anything in `extraParams` | exact filters coming from your UI |

The column `name` is the sort key, so it must match the backend field (`{ name: 'createdAt', field: 'createdAt' }`). Columns with `sortable: false` do not sort.

### Exact filters with `extraParams`

Build the object in a computed and include only the filters that are set. A change reloads the data from the first page.

```ts
const extraParams = computed<Record<string, unknown>>(() => {
  const params: Record<string, unknown> = {}
  if (filters.category) params.category = filters.category
  if (filters.active !== null) params.active = filters.active
  if (filters.countryId !== null) params.country_id = filters.countryId   // snake_case if the backend says so
  return params
})
```

```vue
<pachi-table2 url="/api/demo/items" :columns="columns" :extra-params="extraParams" />
```

### Reloading from outside

* `watching-states` reloads when any listed value changes: `:watching-states="[tenantId, refreshTick]"`.
* Call `table.value?.reload()` (or `api.reload()` in a slot) imperatively, for example after saving in your own dialog.
* Changing `url` re-creates the HTTP client and reloads from page 1.

### Initial and reported sort

```vue
<pachi-table2 :initial-sort="[{ column: 'createdAt', direction: 'desc' }]" @pt2:update:multi-sort="onSort" />
```

`pt2:update:multi-sort` gives the new `IOrderState[]` after every header click. If the `initialSort` prop changes the sort is reset to it.

### Client-side mode

With `local-pagination` the table requests `page` and `pageSize=0` only (no `orderBy`, no `search`), expects **all** rows in `items`, and sorts, filters and pages them in the browser. `nullsLast` (`true` or an array of column names) moves empty values to the end when sorting.

```vue
<pachi-table2 url="/api/small-list" :columns="columns" local-pagination :nulls-last="['dueDate']" />
```

`local-pagination` is read once at setup; change the component `:key` to switch mode.

### Layout

The component sizes itself to the viewport: it sets the container height to `calc(100vh - <top offset> - <space below>)` so that the table scrolls inside and the header stays sticky. The space below is the height of the following siblings plus 8 px; pass `:rez-offset="16"` to fix it, and `rez-delay` to change the debounce of the computation.

### Loading states

A spinner dialog (or a skeleton with `use-skeleton`) appears only if loading lasts longer than `lazy-loading-timeout` (300 ms), so fast requests never flash.

## Row actions and permissions

`use-col-actions` adds an "Actions" column with an edit button (pencil) and a delete button (bin).

| Value | Behaviour |
| --- | --- |
| `use-col-actions` (`true`) | Edit button emits `pt2:edit-item`; delete button asks for confirmation and calls `DELETE {url}/{id}`. |
| `use-col-actions="emit-delete"` | Delete button emits `pt2:delete-item` and does nothing else: you decide what to do (custom message, soft delete, ...). |

The edit button is rendered **only if an `@pt2:edit-item` listener exists**.

### `canEdit` and `canDelete`

Both accept a boolean or a function of the row, and are reactive:

```vue
<pachi-table2
  url="/api/items"
  :columns="columns"
  use-col-actions="emit-delete"
  :can-edit="(row: Item) => hasPermission('items.edit') && !row.locked"
  :can-delete="canDeleteRow"
  @pt2:edit-item="onEdit"
  @pt2:delete-item="onDelete"
/>
```

* `false` hides the button; a function is evaluated per row.
* If both are `false` the whole actions column disappears (the check is static: with functions the column stays visible and each button decides).
* A function typed on the row (`(row: Item) => boolean`) also fixes the generic `T` of the component, so `@pt2:edit-item` and the slots are typed without a cast.
* These flags only control the UI. The server must enforce the permissions (typically `403`).
* `deleteRecord` through the exposed API is **not** filtered by `canDelete`; the flag is checked when the button is clicked.

### Confirming and deleting yourself

With `emit-delete`, use `api.confirmAction` to keep the standard dialog:

```ts
async function onDelete(row: Item, api: PachiTable2Api<Item>) {
  await api.confirmAction(`Delete "${row.name}"?`, () => api.deleteRecord(row))
}
```

`confirmAction` resolves `true` if the user confirmed and `false` otherwise. An error thrown by the action is shown with `Notify` and does not reject.

After a successful delete the table clears the selection, reloads (or moves to the previous page if the current one became empty) and emits `pt2:record-deleted`.

## Selection and bulk actions

Pass a Quasar `selection` mode to enable checkboxes: `selection="multiple"` (or `single`). The selection is kept by the table; read it from the exposed `selected`, from the slots, or set it with `api.setSelected(items)`.

While at least one row is selected a floating bar appears. Its content is the `selection-dialog` slot; a "clear selection" button is appended automatically.

```vue
<pachi-table2 ref="table" url="/api/items" :columns="columns" selection="multiple">
  <template #selection-dialog="{ selected, api }">
    <q-btn flat label="Activate" @click="activate(api, selected)" />
    <q-btn flat color="negative" label="Delete" @click="remove(api, selected)" />
  </template>
</pachi-table2>
```

### Two families of bulk operations

| | Requests | Partial failure | Typical use |
| --- | --- | --- | --- |
| `bulkUpdate(items)` / `bulkDelete(items)` | **one** request (`POST /bulk-update`, `POST /bulk-delete`) | handled by the server | backends with bulk endpoints |
| `multipleUpdate(items)` / `multipleDelete(items)` | **one request per item** (`PUT /{id}`, `DELETE /{id}`) in parallel with `Promise.allSettled` | always reloads, emits the event for the successful items and throws an `Error` (`cause` = array of rejection reasons) | backends without bulk endpoints |

```ts
// bulk update: only id + the fields that change
async function activate(api: PachiTable2Api<Item>, rows: Item[]) {
  const items = rows.map((r) => ({ id: r.id, status: 'active' }))
  await api.confirmAction(`Activate ${rows.length} items?`, async () => {
    await api.bulkUpdate(items)
    api.setSelected([])
  })
}

// one PUT per row with the whole record
async function raisePrice(api: PachiTable2Api<Item>, rows: Item[]) {
  const items = rows.map((r) => ({ ...r, price: Math.round(r.price * 110) / 100 }))
  await api.confirmAction(`Raise the price of ${rows.length} items?`, () => api.multipleUpdate(items))
}

// one POST with the array of ids
const remove = (api: PachiTable2Api<Item>, rows: Item[]) =>
  api.confirmAction(`Delete ${rows.length} items?`, () => api.bulkDelete(rows))
```

`bulkDeleteSelected()` and `multipleDeleteSelected()` are shortcuts that use the current selection. Deleting clears the selection automatically; after an update clear it yourself (`api.setSelected([])`).

### Types

`bulkUpdate` takes `PachiTable2BulkItem<T>[]`, that is `Partial<T> & { id: string | number }`. The `id` key is always called `id` in the bulk-update body, even if `rowKey` is different; `bulkDelete` sends the values of the `rowKey` field.

## Slots

Every slot receives the exposed API as `api`, so you can call `api.reload()`, `api.createRecord()`, ... without a template ref.

### Toolbar

```vue
<template #toolbar-actions="{ api, selected, filter }">
  <q-btn color="primary" :icon="mdiPlus" label="Create" @click="openCreate" />
  <q-btn flat round :icon="mdiRefresh" aria-label="Reload" @click="api.reload()" />
</template>
```

### Custom cells

Name the slot after the column `name`. Render a `q-td` and bind `slotProps` to it so that alignment, classes and `key` are preserved. `slotProps.row` is typed as `T`.

```vue
<template #body-cell-active="{ slotProps }">
  <q-td :props="slotProps">
    <q-icon :name="slotProps.row.active ? mdiCheckCircle : mdiCloseCircle"
            :color="slotProps.row.active ? 'positive' : 'grey'" />
  </q-td>
</template>
```

`header-cell-<name>` works the same way for headers. For simple formatting prefer the `format` option of the column (`format: (val) => money.format(Number(val))`) over a slot.

### Any other QTable slot

`body`, `top`, `no-data`, `loading`, `item` (grid mode) and every other QTable slot are forwarded with the scope `{ slotProps, api }`, where `slotProps` is the original QTable scope. Three slots are managed by the component and cannot be overridden: `header-cell` (multi-sort headers), `bottom` (pagination) and `body-cell-pachitable2_actions` (row actions).

### Error state

```vue
<template #error="{ error, retry }">
  <q-banner class="text-negative">
    {{ String(error) }}
    <template #action><q-btn flat label="Retry" @click="retry" /></template>
  </q-banner>
</template>
```

If you do not need a custom layout use the `error-banner` prop instead.

### Selection bar

See [Selection and bulk actions](#selection-and-bulk-actions).

## Events and errors

### Reacting to data

```vue
<pachi-table2
  url="/api/items"
  :columns="columns"
  @pt2:data="(page) => (total = page.total)"
  @pt2:load-error="(error) => (total = 0)"
  @pt2:update:multi-sort="(sort) => (sortSummary = sort.map((s) => `${s.column} ${s.direction}`).join(', '))"
/>
```

Use `pt2:data` rather than `pt2:loaded`: the latter delivers the raw alova success event (the page is in `event.data`) and exists for backward compatibility.

### Reacting to changes

`pt2:record-created`, `pt2:record-updated` and `pt2:record-deleted` receive an **array** of records, because they are also emitted by the bulk operations. For `bulkUpdate` the array holds the partial items you passed, so a message such as "updated 3 items" is safer than reading a field:

```ts
function onUpdated(rows: Array<Partial<Item>>) {
  const [only] = rows
  const message = rows.length === 1 && only?.name !== undefined
    ? `Saved "${only.name}"`
    : `${rows.length} items updated`
  Notify.create({ type: 'positive', message })
}
```

### Errors of the list

If the list request fails the table keeps the previous rows, sets the exposed `error`, emits `pt2:load-error` and shows, depending on your setup:

* the `error` slot, if provided;
* otherwise a banner with a "Retry" button when `error-banner` is set;
* otherwise nothing (you can still react to the event).

The error is cleared when a new request starts.

### Errors of the actions

`createRecord`, `updateRecord`, `deleteRecord`, `bulkUpdate`, `bulkDelete` **reject** with the HTTP client's error. Handle it where you call them:

```ts
try {
  await api.createRecord(body, { meta: { autoError: false } })  // silence the global dialog of @ilpachi/use-alova
  dialogHide()
} catch (error) {
  if (error instanceof ResponseError && error.status === 422) showFieldErrors(error)
}
```

* `meta` is passed to the alova request; `autoError: false` is understood by `@ilpachi/use-alova` (and by any client that reads it).
* `confirmAction` catches errors of the confirmed action and reports them with `Notify` (negative).
* `multipleUpdate` / `multipleDelete` throw a summary `Error` (`"Operation succeeded on {ok} of {total} items"`, translated) whose `cause` is the array of individual reasons; the list is reloaded in any case.

## HTTP client

The table resolves its [alova](https://alova.js.org) instance in this order:

1. the factory registered with `setPachiAlovaFactory` (if any);
2. the instance of `@ilpachi/use-alova` (`getUseAlovaInstance()({ url }).alova`), which is registered by `createUseAlova()`. This is what `createPachiApp` of the `pachifastquasar` boilerplate does, so **authorization header, token refresh on 401, error dialogs and envelope unwrapping work without extra code**.

`@ilpachi/use-alova` is a required peer dependency. If there is neither a registered factory nor a created `use-alova` instance, the table throws `@ilpachi/pachi-kit/table needs an @ilpachi/use-alova client: call createUseAlova() ... or register one with setPachiAlovaFactory()`.

### Replacing the client

Register a factory once at application start-up; it has precedence over everything else:

```ts
import { createAlova } from 'alova'
import adapterFetch from 'alova/fetch'
import VueHook from 'alova/vue'
import { setPachiAlovaFactory } from '@ilpachi/pachi-kit/table'

setPachiAlovaFactory(({ url = '' } = {}) => createAlova({
  baseURL: url,
  statesHook: VueHook,
  requestAdapter: adapterFetch(),
  beforeRequest: (method) => { method.config.headers.Authorization = `Bearer ${getToken()}` },
  responded: (response) => response.json(),
}))
```

Whatever client you use must return the parsed JSON (the list response must already be `{ items, total, ... }`, i.e. envelope removed) and must reject on HTTP errors. All requests are sent with `cacheFor: null`.

### Using the client yourself

`api.Get`, `api.Post`, `api.Put` and `api.Delete` are bound to the table's `url`:

```ts
const stats = await api.Get<{ count: number }>('/stats')    // GET {url}/stats
```

## Reference

All names below are exported from `@ilpachi/pachi-kit/table` unless stated otherwise. `T` is the row type; it is inferred from `canEdit`/`canDelete` (functions typed on the row), from the listeners or can be fixed with a typed ref (`PachiTable2Exposed<T>`).

### Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `url` | `string` | required | Base endpoint of the resource. It is the `baseURL` of every request. Reactive: when it changes the data is reloaded from page 1. |
| `columns` | `QTableColumn[]` | required | Quasar column definitions. `name` is also the sort key sent in `orderBy`, so it must match the backend field. Reactive. |
| `rowKey` | `string` | `'id'` | Identifier field. Used in `PUT /{id}`, `DELETE /{id}` and in the `bulk-delete` body. Reactive. |
| `extraParams` | `Record<string, unknown>` | `{}` | Extra query parameters merged into the list request (they override the standard ones). A change reloads the data. |
| `watchingStates` | `unknown[]` | `[]` | Values that reload the data when they change. Items are compared shallowly, so a literal array `[a, b]` in a template is fine (refs are already unwrapped in templates; refs and getters are also accepted when you pass them directly). |
| `initialSort` | `{ column: string, direction: 'asc' \| 'desc' }[]` | `[]` | Initial multi-column sort. If the prop changes the sort state is reset. `initalSort` (typo) is kept as a backward compatible alias. |
| `localPagination` | `boolean` | `false` | Client-side pagination and sorting: `orderBy` and `search` are not sent and the page size is `0` (all rows). Read once at setup. |
| `nullsLast` | `boolean \| string[]` | `false` | With local sorting, places `null`/`undefined` values last (all columns, or only the listed ones). |
| `useColActions` | `boolean \| 'emit-delete'` | `false` | Adds the actions column (edit / delete). With `'emit-delete'` the delete button emits `pt2:delete-item` instead of calling the API. Reactive. |
| `canEdit` | `boolean \| (row: T) => boolean` | `true` | Shows the edit button (only if an `@pt2:edit-item` listener exists). `false` hides it, a function decides per row. Reactive. |
| `canDelete` | `boolean \| (row: T) => boolean` | `true` | Shows the delete button (also with `'emit-delete'`). `false` hides it, a function decides per row. Reactive. If both `canEdit` and `canDelete` are `false` the actions column disappears. |
| `errorBanner` | `boolean` | `false` | Shows a banner with the error message and a "Retry" button when the list request fails (alternative to the `error` slot). |
| `grid` | `boolean` | `false` | QTable grid mode. |
| `useSkeleton` | `boolean` | `false` | Shows a skeleton instead of the spinner during slow loads. Read once at setup. |
| `lazyLoadingTimeout` | `number` | `300` | Milliseconds before the spinner / skeleton appears. |
| `rezDelay` | `number` | `100` | Debounce (ms) of the height computation. |
| `rezOffset` | `number` | auto | Space (px) reserved below the table. When omitted it is the height of the following siblings plus 8 px. |

Undeclared attributes are forwarded to `QTable` (`selection`, `dense`, `flat`, `bordered`, `separator`, ...), and so are undeclared listeners (`@row-click`, `@row-dblclick`, ...). The component sets `flat`, `bordered`, `rows-per-page-options="[0]"` and `row-key` itself; the selection is two-way bound internally (use `api.setSelected()` or the exposed `selected`).

Props documented as "read once at setup" are not reactive: to change them at runtime re-create the component (for example with `:key`).

### Events

Events are fully typed (`PachiTable2Events<T>`), so `@pt2:*` handlers get the right parameters under `vue-tsc`.

| Event | Payload | Emitted when |
| --- | --- | --- |
| `pt2:data` | `IPaginatedResponse<T>` = `{ items, total, page, pageSize }` | A list request succeeds. Prefer this one. |
| `pt2:loaded` | the alova success event; the paginated response is in `event.data` (`PachiTable2LoadedEvent<T>`) | A list request succeeds. Kept for backward compatibility. |
| `pt2:load-error` | `unknown` (normally an `Error`) | A list request fails. |
| `pt2:request` | `string` (the current filter) | The user changes page or page size (server-side mode only). |
| `pt2:update:multi-sort` | `IOrderState[]` | The user changes the sort by clicking a header. |
| `pt2:record-created` | `T[]` | After `createRecord` (one element: the server response). |
| `pt2:record-updated` | `T[]` | After `updateRecord`, `patchRecord`, `bulkUpdate` (the items you passed, possibly partial) and `multipleUpdate` (the successful rows). |
| `pt2:record-deleted` | `T[]` | After `deleteRecord`, `bulkDelete` and `multipleDelete` (the successful rows). |
| `pt2:edit-item` | `row: T, api: PachiTable2Api<T>` | The user clicks the edit button of a row. |
| `pt2:delete-item` | `row: T, api: PachiTable2Api<T>` | The user clicks the delete button and `use-col-actions="emit-delete"`. |

In SFC templates `@pt2:edit-item` and `@pt2:editItem` are equivalent (Vue normalizes both to `onPt2:editItem`); from render functions / JSX `'onPt2:edit-item'` works too. The edit button is shown only if a listener for `pt2:edit-item` exists (any of these forms is recognized).

### Slots

| Slot | Scope | Description |
| --- | --- | --- |
| `toolbar-actions` | `{ selected, filter, pagination, paginationHook, api }` | Content on the right side of the filter toolbar (create button, reload, ...). |
| `selection-dialog` | `{ selected, rows, api }` | Buttons of the floating bar shown while at least one row is selected. A "clear selection" button is always appended. |
| `error` | `{ error, retry, api }` | Shown when the list request fails (replaces the `error-banner`). `retry()` repeats the request. |
| `body-cell-<name>` | `{ slotProps, api }` | Custom cell of column `<name>`. `slotProps` is the QTable scope (`row: T`, `col`, `value`, `rowIndex`, `key`, ...). Render a `q-td` with `:props="slotProps"`. |
| `header-cell-<name>` | `{ slotProps, api }` | Custom header cell of column `<name>`. |
| any other QTable slot (`body`, `top`, `no-data`, `loading`, ...) | `{ slotProps, api }` | Forwarded to `QTable`, except the ones managed by the component: `header-cell`, `bottom` and `body-cell-pachitable2_actions`. |

`{ slotProps, api }` can be destructured without casts: `#body-cell-status="{ slotProps }"`.

### Exposed API (template `ref` and `api` in slots/events)

The same object is spread on the component instance (`table.value?.reload()`) and passed as `api` to slots and `pt2:edit-item` / `pt2:delete-item`. Type of the template ref: `PachiTable2Exposed<T>`; type of `api`: `PachiTable2Api<T>`.

| Member | Signature | Description |
| --- | --- | --- |
| `reload` | `() => Promise<void>` | Repeats the list request with the current page, sort, filter and params. |
| `createRecord` | `(item: Partial<T>, options?) => Promise<T>` | `POST {url}/`; reloads, emits `pt2:record-created`, resolves with the server response. |
| `updateRecord` | `(item: T, options?) => Promise<T>` | `PUT {url}/{rowKey}` with the whole record; reloads, emits `pt2:record-updated`. |
| `patchRecord` | `(item: T, options?) => Promise<T>` | Partial update: sends `PATCH {url}/{id}` with the item you pass. |
| `deleteRecord` | `(item: T) => Promise<void>` | `DELETE {url}/{rowKey}`; clears the selection, reloads (or goes back one page if the current page became empty), emits `pt2:record-deleted`. |
| `bulkUpdate` | `(items: PachiTable2BulkItem<T>[]) => Promise<void>` | One `POST {url}/bulk-update` with `{ items }`; each item is `{ id, ...changedFields }`. Reloads, emits `pt2:record-updated` with the items you passed. |
| `bulkDelete` | `(items: T[]) => Promise<void>` | One `POST {url}/bulk-delete` with the array of `rowKey` values. Clears the selection, reloads, emits `pt2:record-deleted`. |
| `multipleUpdate` | `(items: T[]) => Promise<void>` | One `PUT {url}/{id}` per item, in parallel (`Promise.allSettled`). Always reloads; emits `pt2:record-updated` for the successful ones; if any failed it throws an `Error` whose `cause` is the array of reasons. |
| `multipleDelete` | `(items: T[]) => Promise<void>` | One `DELETE {url}/{id}` per item, same semantics as `multipleUpdate`. |
| `bulkDeleteSelected` | `() => Promise<void>` | `bulkDelete(selected)` (no-op if nothing is selected). |
| `multipleDeleteSelected` | `() => Promise<void>` | `multipleDelete(selected)` (no-op if nothing is selected). |
| `confirmAction` | `(message: string, action: (payload?: T) => void \| Promise<void>, payload?: T) => Promise<boolean>` | Opens the Quasar confirmation dialog; on OK awaits `action`. An error thrown by `action` is shown with `Notify` (no unhandled rejection). Resolves `true` if confirmed, `false` if cancelled. |
| `setSelected` | `(items: T[]) => void` | Replaces the selection. |
| `setFilter` | `(value: string) => void` | Sets the search text (same as typing in the toolbar input). |
| `onRequest` | `(props: { pagination }) => void` | QTable `@request` handler (used internally; ignored with `localPagination`). |
| `alova`, `Get`, `Post`, `Put`, `Delete` | alova instance and its methods | HTTP client bound to the current `url`; use `Get/Post/Put/Delete` if `url` can change (they follow it). |
| `rows` | `T[]` | Current rows (ref content). |
| `selected` | `T[]` | Current selection. |
| `filter` | `string` | Current search text. |
| `loading` | `boolean` | A list request is in flight. |
| `error` | `unknown` | Last list loading error (`null` when the last request succeeded). Exposed by the component; not yet part of the `PachiTable2Exposed<T>` type. |
| `api` | `PachiTable2Api<T>` | The object above, as a single value. |

`options` of `createRecord` / `updateRecord` / `patchRecord` is `{ meta?: Record<string, unknown> }` (`IPachiTable2RequestOptions`); `meta` is passed to the alova request, for example `{ meta: { autoError: false } }` to silence the global error dialog of `@ilpachi/use-alova`. Single-record and bulk actions reject on HTTP errors, so wrap them in `try/catch` (or use `confirmAction`, which reports the error).

### Types

| Type | Description |
| --- | --- |
| `IPachiTable2Props` | Options accepted by `usePachiTable2` (the component props plus reactive getters). |
| `IOrderState` | `{ column: string; direction: 'asc' \| 'desc' }`. |
| `IMultipleSortColumnInfo` | Sort info of a column (direction, position, icon, tooltip, `found`). |
| `IPaginatedResponse<T>` | `{ items: T[]; total: number; page: number; pageSize: number }`. |
| `PachiTable2Api<T>` | Methods of the exposed API (see above). |
| `PachiTable2Exposed<T>` | `PachiTable2Api<T>` plus `rows`, `selected`, `filter`, `loading`, `api`. |
| `PachiTable2Events<T>` | Typed emits (same names as `pachiTable2Emits`). |
| `PachiTable2LoadedEvent<T>` | Payload of `pt2:loaded` (`{ data: IPaginatedResponse<T> }`). |
| `PachiTable2BulkItem<T>` | `Partial<T> & { id: string \| number }`, element of `bulkUpdate`. |
| `IPachiTable2RequestOptions` | `{ meta?: Record<string, unknown> }`. |
| `PachiTable2SlotScope<T>`, `PachiTable2QTableSlotProps<T>` | Scope of the forwarded QTable slots. |
| `PachiTable2ToolbarScope<T>`, `PachiTable2SelectionScope<T>`, `PachiTable2ErrorScope<T>` | Scopes of `toolbar-actions`, `selection-dialog`, `error`. |
| `PachiTable2PaginationState`, `PachiTable2PaginationProps` | State and props of the pagination component. |
| `AlovaExt`, `PachiAlovaFactory`, `IPachiAlovaOptions` | Types of the HTTP factory (see [HTTP client](#http-client)). |
| `RowFlag<T>` | `boolean \| ((row: T) => boolean)`. |

### Other exports

| Export | Description |
| --- | --- |
| `PachiTable2` | The table component. |
| `PachiTable2Pagination` | The pagination component used in the `bottom` slot (`maxPages`, `boundaryLinks`, `directionLinks`, `boundaryNumbers`, `ellipses`, `input`, `disable`, `rowsPerPageOptions`, `showRowsPerPage`, `showInfo`). Emits `update:modelValue`, `page-change`, `rows-per-page-change`. |
| `usePachiTable2(options, emit?)` | The composable behind the component. `options` can be an object, a ref or (recommended inside a component) a getter `() => ({ ...props })`. Returns the table state (`rows`, `columns`, `filter`, `pagination`, `loading`, `selected`, `loadError`, `paginationHook`, ...) plus the API methods. Must be called from `setup()` (it uses `inject` and `getCurrentInstance`). |
| `pachiTable2Emits` | Array of the emitted event names (use it with `defineEmits` when you wrap the composable). |
| `multiSort(items, sortState, nullsLast?)` | Pure multi-column sort used for `localPagination` (numeric, accent-sensitive collation). |
| `setPachiAlovaFactory(factory)` | Replaces the HTTP client resolution (see [HTTP client](#http-client)). |
| `createPachiAlova(options?)` | Creates the alova instance with the same resolution order as the table (registered factory, then `@ilpachi/use-alova`). |
| `resolveRowFlag(flag, row)`, `hasEventListener(vnodeProps, event)` | Helpers used for `canEdit`/`canDelete` and listener detection. |

### Translations

The package registers its messages in the `pachiTable2` namespace of `@ilpachi/pachi-i18n` (languages `it` and `en`). Keys: `filter`, `clearSelection`, `actions`, `sortAsc`, `sortDesc`, `all`, `rowsPerPage`, `confirmTitle`, `confirmDelete`, `multipleFailed`, `loadError`, `retry`. To override a text or add a language define the same keys under `pachiTable2` in your application messages: the application always wins.

### CSS

Styles are injected by the JavaScript bundle, nothing has to be imported. Every custom property is `--pachi-*` (the package reads `--pachi-card-r`, `--pachi-surface`, `--pachi-surface-2`, `--pachi-surface-3`, `--pachi-border`, `--pachi-muted`, `--pachi-accent-soft`, `--pachi-accent-mid`, `--pachi-font`) and every class starts with `pachi-` (`pachi-table-2`, `pachi-modern-table`, `pachi-selection-dialog`, ...). Defaults have zero specificity (`:where(...)`): redefine the variables in your own CSS and they win.

## Backend contract

`PachiTable2` talks to a REST resource rooted at `url`. All paths below are relative to it (for `url="/api/demo/items"`, `POST /` means `POST /api/demo/items/`). The shapes are those exercised by the demo backend used to validate the package.

### List

```http
GET {url}?page=1&pageSize=50&orderBy=name,-createdAt&search=lamp&category=tools&active=true
```

| Parameter | Description |
| --- | --- |
| `page` | 1-based page number. |
| `pageSize` | Rows per page (default `50`; `0` with `localPagination`). |
| `orderBy` | Comma separated list of fields, `-` prefix for descending (`name,-createdAt`). Position in the list is the sort priority. Not sent with `localPagination`; it may be an empty string when no sort is active, which the backend should treat as "default order". |
| `search` | Free-text filter typed in the toolbar (debounced 300 ms). Not sent with `localPagination`. |
| any key of `extraParams` | Exact filters, for example `extraParams: { category: 'tools', country_id: 2 }`. They override the standard parameters with the same name. Send only keys that are set. |

Response (`200`):

```json
{
  "success": true,
  "message": "",
  "data": {
    "items": [{ "id": 12, "name": "Desk lamp", "price": 39.9 }],
    "total": 134,
    "page": 1,
    "pageSize": 50
  }
}
```

The `{ success, message, data }` envelope is removed by the HTTP client (`@ilpachi/use-alova` does it). A bare `{ items, total, page, pageSize }` body works as well. The table reads `items` (rows) and `total` (pagination); it is the same shape as `IPaginatedResponse<T>`.

### Create, update, delete

| Action | Request | Success response |
| --- | --- | --- |
| Create | `POST {url}/` with the record as JSON body | the created record (`201`), enveloped or not |
| Update | `PUT {url}/{id}` with the **whole** record as JSON body (it includes the `id` field) | the updated record |
| Delete | `DELETE {url}/{id}` | `204 No Content`, no body and no envelope |

`{id}` is the value of the `rowKey` field (default `id`). Note that create posts to `{url}/` **with a trailing slash**: make the route reachable with and without it (most frameworks redirect, but a redirect on `POST` is not safe). `patchRecord` sends `PATCH {url}/{id}`, so the backend must accept it too.

`multipleUpdate(items)` and `multipleDelete(items)` simply send one `PUT` / `DELETE` per item (see above), in parallel.

### Bulk

| Action | Request | Response |
| --- | --- | --- |
| `bulkDelete(rows)` | `POST {url}/bulk-delete` with the **raw JSON array** of ids: `[3, 5, 8]` | `{ "deleted": 3 }` |
| `bulkUpdate(items)` | `POST {url}/bulk-update` with `{ "items": [{ "id": 3, "status": "active" }, { "id": 5, "active": false }] }` | `{ "updated": 2 }` |

In `bulk-update` only the keys present in each item are changed (partial update). The table does not read the response body of the bulk calls; it reloads the list afterwards.

### Errors

Any non-2xx response rejects the promise of the action and, for the list, fires `pt2:load-error`. The recommended error body (understood by `@ilpachi/use-alova`) is:

```json
{
  "detail": [
    {
      "loc": ["body", "price"],
      "msg": "Input should be greater than or equal to 0",
      "type": "greater_than_equal",
      "code": "demo.price_min",
      "params": { "ge": 0 }
    }
  ]
}
```

`code` is a stable identifier you can map to a translated message (for example `errors.codes.<code>`), `params` are the interpolation values and `loc` points to the offending field.

## Troubleshooting

### `create is not a function` / Dialog or Notify do nothing in development

In Vite dev mode the application and a linked package can resolve **two copies of `quasar`**; plugins installed on the application's copy do not exist on the package's one. `@ilpachi/pachi-kit/table` avoids the problem by calling `Dialog` and `Notify` through the application's `$q` (read with `getCurrentInstance()` in `setup()`), and only falls back to the imported plugins when there is no `$q` (tests, usage outside components). If you still see it:

* make sure `Dialog` and `Notify` are enabled in `framework.plugins`;
* add `resolve.dedupe: ['vue', 'quasar', 'vue-i18n', 'pinia']` to the Vite configuration of the application;
* call composables that use `$q` (such as `usePachiTable2`) only from `setup()`.

### Listeners typed as `never` in `vue-tsc`

Event types are published in `dist/table/*.d.ts`. Use `vue-tsc` 3.x in the consuming project. If a listener parameter is still `any` or `never`, check that `T` can be inferred: type `canEdit` / `canDelete` as `(row: Item) => boolean` or type the template ref as `PachiTable2Exposed<Item>`.

### The edit button does not appear

It is rendered only if (a) `use-col-actions` is set, (b) an `@pt2:edit-item` (or `@pt2:editItem`) listener exists and (c) `canEdit` is not `false` for that row.

### Special characters in messages (`@`, braces)

Messages are compiled by `vue-i18n`, where `{ } @ |` are special. When you override a `pachiTable2.*` text, escape them: `'support{\'@\'}example.com'`.

### The table does not reload when a ref changes

`watching-states` compares items by identity (shallow). Pass the **values** (`[tenantId]` in a template, or `[tenantId.value]` in script); a new object each time reloads on every render.

### `localPagination`, `useSkeleton` or `grid` changes are ignored

`localPagination` and `useSkeleton` are read once. Re-create the table with a `:key`.

### The list shows no rows although the request succeeds

The response (after envelope removal) must be `{ items: [], total, page, pageSize }`. A bare array is not accepted. Check the network tab and whether your HTTP client removes the `{ success, data }` envelope.

### `POST` to `{url}/` returns 404 or 307

Create posts to the resource URL **with a trailing slash**. Declare the route with and without it on the backend.

### The table is cut at the bottom or has no height

Its height is computed from the viewport and the siblings below it. Give the siblings a stable size, or fix the reserved space with `:rez-offset="16"`; with `grid` mode the grid container scrolls inside the table.
