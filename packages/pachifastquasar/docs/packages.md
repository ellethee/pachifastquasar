# Packages

The shell is one member of a family of reusable frontend packages. They all live in the same monorepo (`packages/<name>`), each is
published as `dist` (ESM and type declarations) on npm and declares `vue` / `quasar` as peer
dependencies. Packages never import the shell at runtime; at most they use `import type` for contracts such as
`PachiMenuItemFactory`. Versions below are read from each package's `package.json`.

## Index

| npm package | Purpose | Version | Docs / repository |
| ----------- | ------- | ------- | ---------- |
| `@ilpachi/pachifastquasar` | this application shell: layout, auth, dashboard, router, HTTP and i18n wiring, Quasar preset | 0.1.0 | [repository](https://github.com/ellethee/pachifastquasar/tree/main/packages/pachifastquasar) |
| `@ilpachi/pachifq` | scaffolding CLI: `create`, `new feature`, `new locale`, `info`, `list` | 0.1.0 | [docs](../pachifq/) · [repository](https://github.com/ellethee/pachifastquasar/tree/main/packages/pachifq) |
| `@ilpachi/use-alova` | Vue 3 wrapper for alova: auth, response pipelines, centralized error handling, overlay, file helpers, CSRF (peer of the shell) | 2.1.1 | [npm](https://www.npmjs.com/package/@ilpachi/use-alova) · [repository](https://github.com/ellethee/use-alova) (external repo) |
| `@ilpachi/pachi-i18n` | i18n on vue-i18n: instance creation, language detection and persistence, per-package messages, language switcher (peer of the shell) | 0.1.0 | [docs](../pachi-i18n/) · [repository](https://github.com/ellethee/pachifastquasar/tree/main/packages/pachi-i18n) |
| `@ilpachi/pachi-kit` | generic components, one sub-path per area: `ui` (date picker, confirm dialog, popup edit, duotone icon), `dialog`, `edit-dialog` (composable sections), `fields` (field-driven section), `table` (server-side `QTable` with CRUD through alova), `uploader` | 0.1.0 | [docs](../pachi-kit/) · [repository](https://github.com/ellethee/pachifastquasar/tree/main/packages/pachi-kit) |
| `@ilpachi/fastquasar-settings` | user settings page driven by a backend JSON schema, with an Appearance section (theme, accent, density), manager and Pinia store | 0.1.0 | [docs](../fastquasar-settings/) · [repository](https://github.com/ellethee/pachifastquasar/tree/main/packages/fastquasar-settings) |
| `@ilpachi/fastquasar-admin` | generic Admin page driven by the backend schema (model list, server-side table, forms, bulk actions, history) | 0.1.0 | [docs](../fastquasar-admin/) · [repository](https://github.com/ellethee/pachifastquasar/tree/main/packages/fastquasar-admin) |
| `@ilpachi/fastquasar-profile` | user profile page (identity, badges, personal data) receiving the user through a prop | 0.1.0 | [docs](../fastquasar-profile/) · [repository](https://github.com/ellethee/pachifastquasar/tree/main/packages/fastquasar-profile) |
| `@ilpachi/fastquasar-dashboard-widgets` | dashboard widgets (recent activity, system status) fed by injectable HTTP endpoints | 0.1.0 | [docs](../fastquasar-dashboard-widgets/) · [repository](https://github.com/ellethee/pachifastquasar/tree/main/packages/fastquasar-dashboard-widgets) |

!!! warning "Deprecated"
    `@ilpachi/httpachi` (alova HTTP factory) is **deprecated** and replaced by `@ilpachi/use-alova`. The shell
    no longer depends on it; the CLI recognizes it only to detect legacy projects.

Each package has its own README with usage, props and options.

## How packages plug into the shell

- **Routes**: a package exporting `routes.ts` (or `dist/routes.js`) is picked up by the router glob
  `/node_modules/@ilpachi/*/{routes,dist/routes,src/routes}.{ts,js}`.
- **Menu entries**: a package exporting `menu.ts` (or `dist/menu.js`) contributes account menu entries, see
  [Routing and menus](routing-and-menus.md#menu-factory-contract).
- **HTTP**: packages use `getUseAlovaInstance()` and so reuse the client (token, refresh, spinner, errors)
  created by `createPachiApp`.
- **i18n**: packages register their own messages with `usePachiI18n(messages)`; the application can override
  them.
- **Styles**: `fastquasar-*` packages define `--pachi-*` defaults with zero specificity, so they use the
  variables of your project when present.
- **Disable**: set `ilpachi-<package>-disable-route` to `true` in the `env` passed to the router to ignore the
  routes and menu entries of one package.

## Optional account packages

Add profile, settings and dashboard widgets at creation (`pachifq create --with settings,profile,widgets`) or
later with `pnpm add`. Dependencies are injected once, typically in the boot file:

```ts
// src/boot/pachi.ts (excerpt)
import { setPachiProfileUser } from '@ilpachi/fastquasar-profile'
import { AuthManager } from '@ilpachi/pachifastquasar'

setPachiProfileUser(() => AuthManager.getInstance().userInfo)
```

`fastquasar-settings` exposes `setPachiSettingsOptions` and `fastquasar-dashboard-widgets` exposes
`setPachiWidgetsHttp` for custom clients. Without custom wiring they use the client created by the shell.
`@ilpachi/pachi-kit/fields` accepts an injectable client through `setPachiFieldsHttp` and `@ilpachi/pachi-kit/table` a
replaceable factory through `setPachiAlovaFactory`.
