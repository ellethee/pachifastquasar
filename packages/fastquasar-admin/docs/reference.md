# Reference

## Exports

| Export | Kind | Description |
| --- | --- | --- |
| `PachiAdminPage` | component | The page: model list + selected model. Props `app`, `model`, `basePath` (`/admin`). |
| `PachiAdminModelView` | component | Table, toolbar, filters and bulk actions of one model (props `app`, `model`). |
| `PachiAdminFormDialog` | component | Create / edit / detail dialog (props `modelValue`, `schema`, `mode`, `pk`; events `saved`, `deleted`). |
| `PachiAdminField` | component | One form control chosen from `field.component` (replaceable through `components`). |
| `PachiAdminLookup` | component | Async foreign-key selector (`_options`, `ids`). |
| `PachiAdminHistory` | component | Paginated history of a row with the diff. |
| `setPachiAdminOptions(opts)` / `getPachiAdminOptions()` | function | Global options. |
| `installPachiAdmin({ app, ...opts })` | function | Boot integration: `pachi:auth-changed` listener (`app` is no longer needed for the HTTP client); returns an uninstall function. |
| `createAdminApi(http)` | function | Typed client of the admin endpoints (`listModels`, `getSchema`, `list`, `get`, `create`, `update`, `remove`, `options`, `runAction`, `history`). |
| `buildPayload`, `initialFormValues`, `formFieldNames` | function | Pure form helpers (create / PATCH bodies, defaults). |
| `buildListQuery` | function | Query string of a list request. |
| `formatValue` | function | Default text of a cell for a type. |
| `loadAdminModels`, `hasAdminModels` | function | Model cache used by the menu entry. |
| `ADMIN_PATH` | constant | `'/admin'`. |
| `@ilpachi/fastquasar-admin/menu` | module | Default export and `getMenuItem(ctx)`; `visible` is a function. |
| `@ilpachi/fastquasar-admin/routes` | module | Default export: the route records. |

## `IPachiAdminOptions`

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `getHttp` | `(basePath: string) => IPachiAdminHttp` | `@ilpachi/use-alova` instance | Custom HTTP client (replaces the global `@ilpachi/use-alova` instance). Paths are relative to `basePath`. |
| `basePath` | `string` | `/api/admin/models` | Prefix of the admin API. |
| `components` | `Record<string, Component>` | `{}` | Replaces a form control. Key: `app.model.field` or a control name (`input`, `number`, `select`, ...). Props: `modelValue`, `field`, `name`, `label`, `readonly`, `error`, `schema`; emits `update:modelValue`. |
| `formatters` | `Record<string, AdminFormatter>` | `{}` | Cell text. Key: `app.model.field` or a type (`date`, `boolean`, `json`, ...). Receives `{ value, row, name, field, schema, locale, defaultText }`. |
| `labels` | `Record<string, string>` | `{}` | Overrides a backend text by message key or by `app.model.field`. |
| `hideModels` | `string[] \| (model) => boolean` | `[]` | Models to hide (`app.model`). |

## Messages

Namespace `pachiAdmin` in `src/locales/it.ts` (reference) and `en.ts`. The app can redefine any key; a new language is a
new file in the app messages.
