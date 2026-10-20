# Configuration

The shell is configured at runtime with a `PachiConfigInput` object. The package never reads
`import.meta.env`: the application passes the values in.

## Resolution order

```ts
import { definePachiConfig } from '@ilpachi/pachifastquasar'

export const pachiConfig = definePachiConfig(baseConfig, import.meta.env, ...overrides)
```

1. `baseConfig`: what you write in code (logo, components, menu entries, defaults of your own);
2. `import.meta.env`: `QCLI_*` / `VITE_*` variables that are **set and not empty** override the base. Missing
   variables change nothing;
3. `overrides`: optional further objects, with priority over the environment.

Finally `createPachiApp` / `createPachiRouter` apply the defaults (`DEFAULT_PACHI_CONFIG`) under the result.

Merge rules (used by `definePachiConfig` and `mergePachiConfig`): plain objects are merged recursively;
arrays, functions and Vue components replace the previous value; `undefined` never overrides.

| Function                                  | Purpose                                                                                       |
| ----------------------------------------- | --------------------------------------------------------------------------------------------- |
| `definePachiConfig(base, env, ...over)`   | `mergePachiConfig(base, pachiConfigFromEnv(env), ...over)`                                    |
| `pachiConfigFromEnv(env)`                 | partial config containing only the variables present in `env`                                 |
| `mergePachiConfig(...configs)`            | merge partial configs, last wins                                                              |
| `resolvePachiConfig(input)`               | apply defaults to a partial config                                                            |
| `setPachiConfig(input)` / `getPachiConfig()` | register / read the resolved config (done for you by `createPachiApp` and `createPachiRouter`) |

Variables can live in `src/.env`, `src/.env.local` (the preset sets Vite `envDir` to `src/`) or in the process
environment. Booleans: for variables defaulting to `true`, only the exact value `false` disables the
option; any other non-empty value means `true`. `QCLI_APP_HIDE_HUB_HEADER` is the exception: only `true`
enables it.

## Reference

### `auth`

| Key (`PachiConfigInput`)  | Environment variable                                | Default | Description                                                                          |
| ------------------------- | --------------------------------------------------- | ------- | ------------------------------------------------------------------------------------ |
| `auth.enabled`            | `QCLI_AUTH_ENABLED` or `VITE_AUTH_ENABLED`          | `true`  | `false`: no login page, no guard, everything is public                               |
| `auth.storage`            | `QCLI_AUTH_STORAGE` (`local` or `session`)          | `local` | where tokens and user data are persisted; other values are ignored                   |
| `auth.refreshMode`        | `QCLI_AUTH_REFRESH_MODE` (`body` or `cookie`)       | `body`  | `cookie`: refresh token in an HttpOnly cookie, nothing persisted (see [Security](security.md#refresh-token-in-an-httponly-cookie)); invalid values: `body` + console warning |
| `auth.menu.showProfile`   | `QCLI_AUTH_MENU_PROFILE` or `VITE_AUTH_MENU_PROFILE` | `true`  | show Profile in the account menu (when a package or the app provides the route)      |
| `auth.menu.showSettings`  | `QCLI_AUTH_MENU_SETTINGS` or `VITE_AUTH_MENU_SETTINGS` | `true` | show Settings                                                                        |
| `auth.menu.showHome`      | `QCLI_AUTH_MENU_HOME` or `VITE_AUTH_MENU_HOME`      | `true`  | show Home                                                                            |
| `auth.menu.extraButtons`  | (code only)                                         | none    | `IMenuButton[]` appended to the account menu                                         |

### `app`

| Key                       | Environment variable                                | Default                  | Description                                                                               |
| ------------------------- | --------------------------------------------------- | ------------------------ | ----------------------------------------------------------------------------------------- |
| `app.title`               | `QCLI_APP_TITLE`                                    | `Pachi Fast Quasar`      | title in the bar and on the login page                                                    |
| `app.description`         | `QCLI_APP_DESCRIPTION`                              | `Quasar Vue boilerplate` | home route description                                                                    |
| `app.showAppLogo`         | `QCLI_APP_SHOW_LOGO`                                | `true`                   | show the logo in the bar                                                                  |
| `app.logoSize`            | `QCLI_APP_LOGO_SIZE`                                | `36px`                   | logo size, any CSS length; also settable with the CSS variable `--pachi-app-logo-size`    |
| `app.logoOverlap`         | `QCLI_APP_LOGO_OVERLAP`                             | `false`                  | with a logo taller than the bar: `false` grows the bar (never clipped); `true` keeps a 52px bar and lets the logo hang below it |
| `app.locale`              | `QCLI_APP_LOCALE`                                   | none                     | fixed language code: no detection, persistence or switcher; unknown code = warning and fallback to `it` |
| `app.showLocaleSwitcher`  | `QCLI_APP_SHOW_LOCALE_SWITCHER`                     | `true`                   | show the language switcher (also hidden when only one language exists)                    |
| `app.autoDashboard`       | `QCLI_APP_AUTO_DASHBOARD`                           | `true`                   | routes with children show a card dashboard; override per route with `meta.dashboard`      |
| `app.hideHubHeader`       | `QCLI_APP_HIDE_HUB_HEADER` (`true` to enable)       | `false`                  | hide the title/description header of the home dashboard                                   |
| `app.dashboardMaxWidth`   | `QCLI_APP_DASHBOARD_MAX_WIDTH`                      | `1080px`                 | max width of the dashboard (CSS length, e.g. `1400px`, `90%`, `none`); per route: `meta.dashboardMaxWidth` |
| `app.dashboardColumns`    | `QCLI_APP_DASHBOARD_COLUMNS`                        | 3 columns                | columns of the card grid: a number (`3`) or a CSS `grid-template-columns`; per route: `meta.dashboardColumns` |
| `app.titleAnimation`      | `QCLI_APP_TITLE_ANIMATION`                          | `rubber-band`            | hover animation of the dashboard card titles: `rubber-band`, `pulse`, `shake`, `wobble`, `tada`, `bounce` or `none`; per route: `meta.titleAnimation` |
| `app.gravatar`            | `QCLI_APP_GRAVATAR`                                 | `false`                  | `true`: opt in to Gravatar (it receives a SHA-256 hash of the email); otherwise avatars show initials, no external request |
| `app.hoverEffectsEnabled` | `QCLI_APP_HOVER_EFFECTS` or `VITE_APP_HOVER_EFFECTS` | `true`                  | `false` adds the `pachi-hover-fx-disabled` class to `body` and disables hover animations  |

### `http`

| Key             | Environment variable | Default | Description                                                                                          |
| --------------- | -------------------- | ------- | ---------------------------------------------------------------------------------------------------- |
| `http.envelope` | `QCLI_HTTP_ENVELOPE` | `true`  | the backend wraps responses in `{ success, message, data }`; set `false` for a plain-body backend    |
| `http.errorDisplay` | `QCLI_HTTP_ERROR_DISPLAY` | `dialog` | how HTTP errors are shown: modal `dialog`, or non-blocking `toast`                                  |
| `http.toast.position` | `QCLI_HTTP_TOAST_POSITION` | `top-right` | toast position (`top-left`, `top`, `bottom-right`, `bottom`, `center`, ...)                     |
| `http.toast.timeout` | `QCLI_HTTP_TOAST_TIMEOUT` | `5000` | milliseconds before the toast closes; `0` keeps it until dismissed                                |

See [HTTP client](http-client.md) and [Backend contract](backend-contract.md).

### Code-only options

| Key                      | Type                                           | Description                                                                              |
| ------------------------ | ---------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `logo`                   | `string \| Component`                          | SVG path (`M...`), `img:<url>` or a Vue component; used by home route, app bar and login |
| `components.layout`      | component or `() => import(...)`               | replaces `MainLayout`                                                                    |
| `components.loginPage`   | same                                           | replaces `LoginPage` (the default accepts the `title` prop and the `logo` slot)          |
| `components.errorPage`   | same                                           | replaces `ErrorNotFound` (catch-all route)                                               |
| `menuItems`              | `IMenuButton[]` or `(items) => IMenuButton[]`  | array: appended; function: receives the final list and returns the new one               |
| `menuFactories`          | `PachiMenuItemFactory[]`                       | account-menu factories registered by the app (same contract as packages)                 |

### Dev-server variable

`QCLI_PROXY_TARGET` (default `http://localhost:8000`) is read by `definePachiQuasarConfig` (not by
`definePachiConfig`) and sets the target of the `/api` proxy, WebSocket included. The `proxyTarget` preset option
takes precedence in code; a typical pattern is `proxyTarget: process.env.QCLI_PROXY_TARGET ?? 'http://backend'`.

## Example

```ts
import { definePachiConfig } from '@ilpachi/pachifastquasar'
import { mdiBookOpenVariant } from '@quasar/extras/mdi-v7'
import myLogo from 'src/assets/logo.svg?url'

export const pachiConfig = definePachiConfig(
  {
    app: { title: 'Back office', logoSize: '48px', gravatar: true },
    logo: `img:${myLogo}`,
    menuItems: [{ label: 'Guide', icon: mdiBookOpenVariant, to: '/guide', order: 80 }]
  },
  import.meta.env
)
```

```ini
# src/.env
QCLI_APP_LOCALE=en
QCLI_HTTP_ENVELOPE=false
QCLI_PROXY_TARGET=http://localhost:8000
```

## Exported components

To build a custom layout the shell exports its components: `MainLayout`, `LoginPage`, `ErrorNotFound`,
`AppBar`, `AccountMenuButton`, `DashboardCard`, `PachiGravatar`, `PachiLogo` (prop `value` overrides the
logo), `PachiLoadingState`, `PachiEmptyState`, `PachiErrorState`, `ToggleThemeButton`, and the composables and
services `useAppBar`, `useRouteMeta`, `useRouteText`, `AuthManager`, `useAuthStore`, `WebSocketManager`,
`usePachiEventsStore`.
