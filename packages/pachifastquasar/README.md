# @ilpachi/pachifastquasar

> **Status: beta.** Companion frontend of pachifast (Python backend by the same author). The API is evolving and may change between minor releases (0.x) — see CHANGELOG. ESM only. Requires @ilpachi/use-alova (peer). Provided "as is", without warranty of any kind (see [LICENSE](./LICENSE)). Not recommended for production use without pinning versions and testing against your pachifast backend.

Application shell for **Vue 3 / Quasar**, distributed as an npm package: layout, optional authentication,
card dashboard, i18n, router and HTTP client. A derived application only contains its own features and a
few lines of configuration.

- Layout with app bar, breadcrumbs, light/dark theme and account menu
- Optional authentication (login, silent session restore, token refresh, per-route authorization)
- Automatic dashboard of cards built from the route tree
- i18n (Italian and English out of the box, more languages in three steps)
- HTTP client (`@ilpachi/use-alova`) wired to authentication, spinner and error messages
- Runtime configuration through `QCLI_*` environment variables or code
- A Quasar config preset (`definePachiQuasarConfig`) and a scaffolding CLI (`pachifq`)

This repository contains the package (`src/`, built with Vite library mode into `dist/`) and `playground/`,
the Quasar app used to develop and try it. Full documentation lives in [`docs/`](docs/index.md).

## Requirements

- Node.js >= 20 and pnpm >= 10
- Quasar CLI with `@quasar/app-vite` v3 (and `vue-tsc` + `typescript` if you keep the default type checker)
- Peer dependencies, installed by the application so that they stay singletons: `vue`, `vue-router`,
  `quasar`, `@quasar/extras`, `pinia`, `pinia-plugin-persistedstate`, `vue-i18n`, `alova`,
  `@ilpachi/use-alova` (`^2.1.0`) and `@ilpachi/pachi-i18n` (`>=0.1.0 <1.0.0`)
- `pinia` `^3.0.0 || ^4.0.0`; Pinia 4 also needs `@vue/devtools-api` (`^8.1.5`) as a (non-optional) peer, which
  pnpm and npm install automatically but Yarn does not

## Installation

```bash
pnpm add @ilpachi/pachifastquasar @ilpachi/use-alova @ilpachi/pachi-i18n \
  vue-router pinia pinia-plugin-persistedstate vue-i18n alova
```

## Quick start

The fastest way to get a working app is the `pachifq` CLI:

```bash
pnpm add -g @ilpachi/pachifq
pachifq create my-app
cd my-app
pnpm dev
```

Without `--yes` the CLI asks for name, description, authentication, language, optional packages and backend
proxy. Useful options (see the [`pachifq` README](https://github.com/ellethee/pachifastquasar/tree/main/packages/pachifq#readme) for the full list):

| Option                 | Effect                                                                                    |
| ---------------------- | ----------------------------------------------------------------------------------------- |
| `--yes`                | no prompts, use defaults                                                                  |
| `--with <list>`        | optional packages, comma separated: `settings`, `profile`, `widgets`                      |
| `--link <path>`        | link the shell (and sibling packages) from a local folder instead of the registry         |
| `--locale <code>`      | fixed language (`QCLI_APP_LOCALE`): no detection, no language switcher                    |
| `--no-envelope`        | backend without the `{success,message,data}` envelope (`QCLI_HTTP_ENVELOPE=false`)        |
| `--no-auto-dashboard`  | disable the automatic card dashboard (`QCLI_APP_AUTO_DASHBOARD=false`)                    |
| `--registry <url>`     | npm registry for `@ilpachi/*` (default: the public npm registry)                            |
| `--no-install`, `--no-git` | skip `pnpm install` / `git init`                                                      |

```bash
pachifq create my-app --yes --locale it --with settings,profile,widgets --no-envelope
pachifq new feature invoices        # adds src/features/invoices/ to an existing app
pachifq new locale fr               # adds a language
```

The dev server proxies `/api` (HTTP and WebSocket) to `QCLI_PROXY_TARGET`, `http://localhost:8000` by default.

## Manual setup

An existing Quasar project needs five small files. The `playground/` folder is a complete working example.

`quasar.config.ts` (boot file, styles, aliases, env prefixes, Vite plugins and proxy come from the preset):

```ts
import { definePachiQuasarConfig } from '@ilpachi/pachifastquasar/quasar'

export default definePachiQuasarConfig({
  /* optional Quasar overrides */
})
```

`src/pachi-config.ts` (shared by boot file and router):

```ts
import { definePachiConfig } from '@ilpachi/pachifastquasar'
import type { PachiConfigInput } from '@ilpachi/pachifastquasar'

const baseConfig: PachiConfigInput = { app: { gravatar: true } }

export const pachiConfig: PachiConfigInput = definePachiConfig(baseConfig, import.meta.env)
```

`src/boot/pachi.ts`:

```ts
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

`src/router/index.ts` (the globs must live in the application: `import.meta.glob` cannot see app files from
inside a package):

```ts
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

`src/stores/index.ts`:

```ts
import { defineStore } from '#q-app'
import { createPachiPinia } from '@ilpachi/pachifastquasar'

export default defineStore(() => createPachiPinia())
```

`src/App.vue` is just `<router-view />`. See [Getting started](docs/getting-started.md) for the details.

## Configuration

Configuration is provided at runtime: the package never reads `import.meta.env` itself. The application calls
`definePachiConfig(base, import.meta.env)`: variables that are **set and not empty** win over the base config,
missing variables leave it untouched. Boolean variables with a `true` default are switched off with `false`.
`QCLI_*` variables are read from `src/.env` (the preset sets `envDir` to `src/`).

| Environment variable            | `definePachiConfig` key        | Default                  | Effect                                                                   |
| ------------------------------- | ------------------------------ | ------------------------ | ------------------------------------------------------------------------ |
| `QCLI_AUTH_ENABLED` (`VITE_AUTH_ENABLED`)       | `auth.enabled`           | `true`                   | `false` removes the login page and the navigation guard |
| `QCLI_AUTH_STORAGE`             | `auth.storage`                 | `local`                  | `session` keeps tokens in `sessionStorage` instead of `localStorage`     |
| `QCLI_AUTH_MENU_PROFILE` (`VITE_AUTH_MENU_PROFILE`)   | `auth.menu.showProfile`  | `true`                   | show the Profile entry in the account menu                              |
| `QCLI_AUTH_MENU_SETTINGS` (`VITE_AUTH_MENU_SETTINGS`) | `auth.menu.showSettings` | `true`                   | show the Settings entry                                                 |
| `QCLI_AUTH_MENU_HOME` (`VITE_AUTH_MENU_HOME`)         | `auth.menu.showHome`     | `true`                   | show the Home entry                                                     |
| `QCLI_APP_TITLE`                | `app.title`                    | `Pachi Fast Quasar`      | application title (bar, login)                                           |
| `QCLI_APP_DESCRIPTION`          | `app.description`              | `Quasar Vue boilerplate` | application description                                                  |
| `QCLI_APP_SHOW_LOGO`            | `app.showAppLogo`              | `true`                   | show the logo in the app bar                                             |
| `QCLI_APP_LOGO_SIZE`            | `app.logoSize`                 | `36px`                   | logo size in the bar (any CSS length)                                    |
| `QCLI_APP_LOGO_OVERLAP`         | `app.logoOverlap`              | `false`                  | `true`: fixed 52px bar and the logo hangs below it                       |
| `QCLI_APP_LOCALE`               | `app.locale`                   | (empty)                  | fixed language, e.g. `it`: no detection, persistence or switcher         |
| `QCLI_APP_SHOW_LOCALE_SWITCHER` | `app.showLocaleSwitcher`       | `true`                   | show the language switcher                                               |
| `QCLI_APP_AUTO_DASHBOARD`       | `app.autoDashboard`            | `true`                   | routes with children show a card dashboard (per route: `meta.dashboard`) |
| `QCLI_APP_HIDE_HUB_HEADER`      | `app.hideHubHeader`            | `false`                  | hide the header of the home dashboard (only the value `true` enables it) |
| `QCLI_APP_DASHBOARD_MAX_WIDTH`  | `app.dashboardMaxWidth`        | `1080px`                 | max width of the dashboard (per route: `meta.dashboardMaxWidth`) |
| `QCLI_APP_DASHBOARD_COLUMNS`    | `app.dashboardColumns`         | 3 columns                | columns of the card grid, number or CSS `grid-template-columns` (per route: `meta.dashboardColumns`) |
| `QCLI_APP_TITLE_ANIMATION`      | `app.titleAnimation`           | `rubber-band`            | hover animation of the dashboard card titles (`rubber-band`, `pulse`, `shake`, `wobble`, `tada`, `bounce`, `none`; per route: `meta.titleAnimation`) |
| `QCLI_APP_HOVER_EFFECTS` (`VITE_APP_HOVER_EFFECTS`)   | `app.hoverEffectsEnabled` | `true`                | `false` disables hover animations                                       |
| `QCLI_APP_GRAVATAR`             | `app.gravatar`                 | `false`                  | `true`: opt in to Gravatar (sends a SHA-256 hash of the email to a third party); otherwise avatars show initials only |
| `QCLI_HTTP_ENVELOPE`            | `http.envelope`                | `true`                   | `false` for backends with `PACHIFAST_ENVELOPE_ENABLED=false`             |
| `QCLI_PROXY_TARGET`             | (preset option `proxyTarget`)  | `http://localhost:8000`  | target of the dev-server `/api` proxy (WebSocket included)               |

Keys without an environment variable (`logo`, `components.layout|loginPage|errorPage`, `menuItems`,
`menuFactories`, `auth.menu.extraButtons`) are set in code. Everything is described in
[Configuration](docs/configuration.md).

## Documentation

The documentation is a set of Markdown pages in [`docs/`](docs/) laid out for MkDocs (`mkdocs.yml` at the
repository root):

| Page                                                  | Content                                                  |
| ----------------------------------------------------- | -------------------------------------------------------- |
| [Overview](docs/index.md)                             | what the shell provides and how the pieces fit           |
| [Getting started](docs/getting-started.md)            | installation, scaffolding, manual setup                  |
| [Configuration](docs/configuration.md)                | every option and environment variable                    |
| [Routing and menus](docs/routing-and-menus.md)        | feature routes, `meta.*`, account menu factories         |
| [Authentication](docs/authentication.md)              | login, refresh, WebSocket ticket, permissions            |
| [HTTP client](docs/http-client.md)                    | the wired `@ilpachi/use-alova` client                    |
| [Internationalization](docs/i18n.md)                  | messages, languages, backend error codes                 |
| [Theming and styles](docs/theming-and-styles.md)      | tokens, Sass, logo, favicon                              |
| [Backend contract](docs/backend-contract.md)          | what a pachifast backend must expose                     |
| [Packages](docs/packages.md)                          | the `@ilpachi/*` family                                  |

To preview the site locally: `pip install mkdocs-material && mkdocs serve`.

## Development

```bash
pnpm install
pnpm dev                              # playground with the package from sources (hot reload)
QCLI_AUTH_ENABLED=false pnpm dev      # without authentication
pnpm test                             # Vitest
pnpm typecheck                        # vue-tsc of the package
pnpm build                            # dist/ (library, ./quasar entry, styles.css, scss)
```

Publishing is manual and always explicit (`npm publish`, never pnpm). The `exports` of the package are `.`,
`./quasar`, `./styles.css` and `./scss/*`.

## License

[MIT](LICENSE), copyright (c) 2026 ilPachi.

## Project status

The package is in beta (`0.x`). The public API (`createPachiApp`,
`createPachiRouter`, `definePachiConfig`, `definePachiQuasarConfig`, components and types exported from the barrel)
may change between minor versions; the companion packages follow the same rule (see
[Packages](docs/packages.md)).

## Changelog

See [CHANGELOG.md](CHANGELOG.md).
