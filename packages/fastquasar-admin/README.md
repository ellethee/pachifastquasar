# @ilpachi/fastquasar-admin

> **Status: beta.** Companion frontend of pachifast (Python backend by the same author). The API is evolving and may change between minor releases (0.x) — see CHANGELOG. ESM only. Requires @ilpachi/use-alova (peer) and a pachifast backend (see backend-contract). Provided "as is", without warranty of any kind (see [LICENSE](./LICENSE)). Not recommended for production use without pinning versions and testing against your pachifast backend.

A generic **Admin** page for Vue 3 / Quasar apps, driven by the schema of the backend (`pachifast` admin API under
`/api/admin/models`): model list, server-side table (search, sorting, pagination, filters), create / edit dialog
generated from the fields (including async lookups and JSON), bulk actions and per-row history. Buttons follow the
permissions of the current user. Full documentation in `docs/` (MkDocs site of the monorepo).

## Install

```bash
pnpm add @ilpachi/fastquasar-admin
```

Peer dependencies: `vue ^3.5`, `quasar ^2.20`, `@quasar/extras ^2`, `vue-i18n ^11`, `@ilpachi/pachi-i18n >=0.1.0 <1.0.0`, `@ilpachi/use-alova ^2.1` (required: the HTTP client comes from the instance registered by `createPachiApp`, or from `getHttp`).

## Mount it in a pachifastquasar app

The shell discovers `@ilpachi/fastquasar-admin/routes` (`/admin`, `/admin/:app/:model`) and
`@ilpachi/fastquasar-admin/menu` (the "Admin" account-menu entry, visible only if the user can see a model). Add one
line to the boot file so the menu can load the models with the HTTP client of the app:

```ts
import { installPachiAdmin } from '@ilpachi/fastquasar-admin'

export default defineBoot((ctx) => {
  createPachiApp(ctx, { config: pachiConfig })
  installPachiAdmin({ app: ctx.app })
})
```

## Options

```ts
import { setPachiAdminOptions } from '@ilpachi/fastquasar-admin'

setPachiAdminOptions({
  basePath: '/api/admin/models',
  hideModels: ['auth.session'],
  labels: { 'admin.demo.item.title': 'Articles' },
  formatters: { 'demo.item.price': ({ value }) => `EUR ${value}` },   // by type or by app.model.field
  components: { 'demo.item.notes': MyNotesEditor },                   // form control by field or control name
})
```

`getHttp` replaces the HTTP client. `installPachiAdmin` accepts the same options plus `app`.

## Backend contract, styling, reference

**Minimum pachifast version:** 0.5.0 (list, detail, create, update, delete, `_schema` and `_options` exist from 0.4.0; change history, bulk actions and the `lookup` component need 0.5.0; from 0.11.0 the lists default to page 1 of 25 and at most 200 rows per page). See the pachifast CHANGELOG.

See `docs/backend-contract.md`, `docs/styling.md` and `docs/reference.md`. Styles use `--pachi-*` variables with
zero-specificity defaults; the page scrolls inside the one-viewport layout of the shell.

## Changelog

See `CHANGELOG.md`.

## License

MIT
