# Getting started

## 1. Installation

The `@ilpachi/*` packages are published on npm; no registry configuration is needed:

```bash
pnpm add @ilpachi/pachifastquasar @ilpachi/use-alova @ilpachi/pachi-i18n
```

## 2. Create an application with the CLI

```bash
pnpm add -g @ilpachi/pachifq
pachifq create my-app
```

`pachifq create` generates a small application (it no longer clones a boilerplate): `package.json`,
`quasar.config.ts`, `src/pachi-config.ts`, `src/boot/pachi.ts`, `src/router/index.ts`, `src/stores/index.ts`,
`src/css/`, `src/i18n/{generated,overrides}`, `src/features/`, `public/` (favicons), `src/.env` (only the
choices you made) and `src/.env.example` (every option, commented).

| Option                | Effect                                                                                          |
| --------------------- | ----------------------------------------------------------------------------------------------- |
| `--yes`               | accept defaults, no prompts                                                                     |
| `--with <list>`       | optional packages: `settings`, `profile`, `widgets` (comma separated)                           |
| `--link <path>`       | link the shell and sibling packages from a local folder (`link:`) instead of the registry       |
| `--locale <code>`     | fixed language (`QCLI_APP_LOCALE`)                                                              |
| `--no-envelope`       | backend without the response envelope (`QCLI_HTTP_ENVELOPE=false`)                              |
| `--no-auto-dashboard` | `QCLI_APP_AUTO_DASHBOARD=false`                                                                 |
| `--registry <url>`    | registry for `@ilpachi/*` (default: the public npm registry)                            |
| `--no-install`        | do not run `pnpm install`                                                                       |
| `--no-git`            | do not run `git init`                                                                           |

Then add features:

```bash
pachifq new feature invoices --title "Invoices" --icon mdiFileDocumentOutline --order 10 --yes
pachifq new locale fr
pachifq info          # diagnostics of the current project
pachifq list          # features already present
```

Start the dev server (it proxies `/api` to `QCLI_PROXY_TARGET`, default `http://localhost:8000`):

```bash
pnpm dev
QCLI_AUTH_ENABLED=false pnpm dev    # without login
```

## 3. Manual setup

Install the package and its peers:

```bash
pnpm add @ilpachi/pachifastquasar @ilpachi/use-alova @ilpachi/pachi-i18n \
  vue-router pinia pinia-plugin-persistedstate vue-i18n alova
```

Pinia 3 and 4 are both supported; Pinia 4 also needs `@vue/devtools-api` as a peer (pnpm and npm install it for
you, with Yarn add it yourself).

### `quasar.config.ts`

```ts
import { definePachiQuasarConfig } from '@ilpachi/pachifastquasar/quasar'

export default definePachiQuasarConfig(
  { /* Quasar overrides: objects are merged recursively, arrays are concatenated */ },
  { proxyTarget: 'http://localhost:8000', port: 9001 } // preset options, all optional
)
```

The preset provides: boot file `pachi`, global styles, `roboto-font`, SPA build, env prefixes
`VITE_`/`QCLI_` read from `src/`, the aliases `src/ assets/ boot/ stores/ features/`, `resolve.dedupe` of the
singletons, the `@intlify/unplugin-vue-i18n` plugin (`runtimeOnly: false`), `vite-plugin-checker` (disable
with `checker: false`), the `/api` proxy, the `svg-mdi-v7` icon set and the Quasar plugins `Dialog`,
`Notify`, `Loading`, `Dark`. Options: `proxyTarget`, `port`, `checker`, `lang`, `aliases`. A function
`(base, ctx) => config` can be passed instead of an object for full control.

### Configuration file

```ts
// src/pachi-config.ts
import { definePachiConfig } from '@ilpachi/pachifastquasar'
import type { PachiConfigInput } from '@ilpachi/pachifastquasar'

const baseConfig: PachiConfigInput = {
  app: { title: 'My app', gravatar: true },
  http: { envelope: true }
}

export const pachiConfig: PachiConfigInput = definePachiConfig(baseConfig, import.meta.env)
```

### Boot file

```ts
// src/boot/pachi.ts
import { defineBoot } from '#q-app'
import { composePachiMessages, createPachiApp } from '@ilpachi/pachifastquasar'
import { pachiConfig } from 'src/pachi-config'

export default defineBoot(ctx => {
  createPachiApp(ctx, {
    config: pachiConfig,
    messages: composePachiMessages({
      generated: import.meta.glob('../i18n/generated/*.json', { eager: true, import: 'default' }),
      overrides: import.meta.glob('../i18n/overrides/*.{ts,json}', { eager: true, import: 'default' }),
      locales: import.meta.glob('../i18n/locales/*.ts', { eager: true, import: 'default' }),
      features: import.meta.glob('/src/features/**/locales/*.ts', { eager: true, import: 'default' })
    })
  })
})
```

`createPachiApp(ctx, { config?, messages? })` registers the configuration, creates the HTTP client (exposed
with `app.provide('useAlova', ...)` and `$useAlova`), provides the avatar resolver (`pachiAvatarUrl`),
installs i18n and adds the `pachi-hover-fx-disabled` body class when hover effects are off. It is also exported
as `pachiBoot`.

### Router

```ts
// src/router/index.ts
import { defineRouter } from '#q-app'
import { createPachiRouter } from '@ilpachi/pachifastquasar'
import { pachiConfig } from 'src/pachi-config'

export default defineRouter(() =>
  createPachiRouter({
    config: pachiConfig,
    env: import.meta.env,
    mode: import.meta.env.QUASAR_VUE_ROUTER_MODE,
    base: import.meta.env.QUASAR_VUE_ROUTER_BASE,
    features: import.meta.glob('/src/features/**/routes.ts', { eager: true, import: 'default' }),
    packages: import.meta.glob('/node_modules/@ilpachi/*/{routes,dist/routes,src/routes}.{ts,js}', {
      eager: true,
      import: 'default'
    }),
    menus: import.meta.glob('/node_modules/@ilpachi/*/{menu,dist/menu,src/menu}.{ts,js}', {
      eager: true,
      import: 'default'
    })
  })
)
```

The router is created before the boot files run in Quasar. Passing the same `pachiConfig` to both guarantees
that router and boot share one configuration.

### Store and root component

```ts
// src/stores/index.ts
import { defineStore } from '#q-app'
import { createPachiPinia } from '@ilpachi/pachifastquasar'

export default defineStore(() => createPachiPinia())
```

```vue
<!-- src/App.vue -->
<template>
  <router-view />
</template>
```

### Styles

`definePachiQuasarConfig` already loads `@ilpachi/pachifastquasar/styles.css`. To customize the Quasar
palette, see [Theming and styles](theming-and-styles.md).

## 4. Add a feature

A feature is a folder `src/features/<name>/` whose `routes.ts` default-exports an array of route records:

```ts
// src/features/invoices/routes.ts
import type { RouteRecordRaw } from 'vue-router'
import { mdiFileDocumentOutline } from '@quasar/extras/mdi-v7'

export default [
  {
    path: '/invoices',
    component: () => import('./pages/InvoicesPage.vue'),
    meta: { titleKey: 'invoices.title', icon: mdiFileDocumentOutline, order: 10 }
  }
] as RouteRecordRaw[]
```

Details in [Routing and menus](routing-and-menus.md).

## 5. Optional packages

Profile, settings and dashboard widgets are separate packages (see [Packages](packages.md)). Installed in the
application they register their own routes and account menu entries automatically, because the router globs
scan `node_modules/@ilpachi/*`.

```bash
pnpm add @ilpachi/fastquasar-settings @ilpachi/fastquasar-profile @ilpachi/fastquasar-dashboard-widgets
```

To disable the routes (and menu entries) of one package without uninstalling it, set an environment variable
named `ilpachi-<package>-disable-route` to `true` (for example `ilpachi-fastquasar-settings-disable-route`).
The value is read from the `env` object you pass to `createPachiRouter`.

!!! note
    The Quasar preset only exposes variables with the prefixes `VITE_` and `QCLI_` to `import.meta.env`. A
    variable called `ilpachi-<package>-disable-route` is therefore visible to the router only if you extend
    `envPrefix` (or build the `env` object yourself, e.g. `{ ...import.meta.env, 'ilpachi-...': 'true' }`).
