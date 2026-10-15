# Usage

## Mounting it in a pachifastquasar app

The shell scans `node_modules/@ilpachi/*` for the modules of every package, so the route and the menu entry need no
code:

| Module (sub-path) | Default export | What the shell does with it |
| --- | --- | --- |
| `@ilpachi/fastquasar-admin/routes` | an array of route records | Adds `/admin` and `/admin/:app/:model` (hidden from the side menu, `props: true`). |
| `@ilpachi/fastquasar-admin/menu` | a menu factory `getMenuItem(ctx)` | Adds the "Admin" entry (order 30) to the account menu. |

The entry is visible only if `GET /api/admin/models` returns at least one model the user can view. A `403`, a `401` or
a network error hides it silently.

### Boot file

The menu entry has to load the model list outside the page, so tell the package where the HTTP client of the app is.
Call `installPachiAdmin` once, right after `createPachiApp`:

```ts
// src/boot/pachi.ts
import { defineBoot } from '#q-app'
import { createPachiApp } from '@ilpachi/pachifastquasar'
import { installPachiAdmin } from '@ilpachi/fastquasar-admin'
import { pachiConfig } from 'src/pachi-config'

export default defineBoot((ctx) => {
  createPachiApp(ctx, { config: pachiConfig })
  installPachiAdmin({ app: ctx.app })
})
```

`installPachiAdmin` listens to `pachi:auth-changed` (loads the models at login, clears them at logout) and accepts every
option of `setPachiAdminOptions`. The `app` option is no longer needed for the HTTP client and is kept only for
compatibility. Without the call the page still works but the menu entry does not appear.

`@ilpachi/use-alova` is a required peer dependency: by default the package uses the global instance registered by
`createPachiApp` (`getUseAlovaInstance()({ url: basePath }).alova`: authentication, token refresh, envelope unwrap).
If no instance exists (and no `getHttp` is set) the package throws a clear error, and the menu entry stays hidden.

!!! note "Errors are shown by the package"
    The package sends its requests with `meta: { autoError: false }`: validation (`422`), conflict (`409`) and
    permission (`403`) errors are shown inline, in the form or in the page, instead of the global error dialog.

### Options

```ts
import { setPachiAdminOptions } from '@ilpachi/fastquasar-admin'

setPachiAdminOptions({
  basePath: '/api/admin/models',               // default
  hideModels: ['auth.session'],                // or (model) => model.app === 'internal'
  labels: { 'admin.demo.item.title': 'Articles', 'demo.item.price': 'Price (EUR)' },
  formatters: {
    date: ({ defaultText }) => defaultText.toUpperCase(),        // by type
    'demo.item.price': ({ value }) => `EUR ${value}`,            // by field (wins over the type)
  },
  components: { 'demo.item.notes': MyNotesEditor },              // form control by field or by control name
})
```

`components`, `formatters` and `labels` are merged with what is already registered; the other options replace the
previous value. See [Reference](reference.md) for the exact contracts.

### Replacing the HTTP client

By default the client is the global `@ilpachi/use-alova` instance. To use another one (any object with `Get`, `Post`, `Patch`
and `Delete`, resolving the unwrapped payload):

```ts
setPachiAdminOptions({ getHttp: (basePath) => myClient(basePath) })
```

Paths are relative to `basePath` (`''` for the model list, `/demo/item/_schema`, ...).

## Using the page directly

```vue
<pachi-admin-page app="demo" model="item" base-path="/admin" />
```

Without a router the page keeps the selection in its own state; with the shell router the selection follows the route
and clicking a model navigates to `<basePath>/<app>/<model>`.

## Behaviour notes

- The table asks for `page`, `pageSize` (10, 25, 50, 100, 200), `orderBy`, `search` and one parameter per active
  filter. The initial sort is `list.ordering`. Click a column header to sort by it (ascending, descending, none);
  **Shift+click** adds columns to a multi-column sort (`orderBy=-status,number`), shown with an arrow and the priority
  number. Filters with `range: true` have a "from" and a "to" input (`<field>__gte` / `<field>__lte`).
- Delete confirmations show the title of the rows (`_options?ids=`), the first five and "and N more".
- Dates are shown in the active language; `date` values are parsed as local dates (no day shift).
- Decimals arrive as strings and are shown unchanged; when you edit one, it is sent back as a string.
- The create form hides read-only fields and the primary key; the edit form shows them disabled. Without the
  `change` permission the dialog is a read-only detail.
- Deleting asks for confirmation; the "Delete selected" action comes from the backend like any other action.
- Blob / file fields are not handled.
