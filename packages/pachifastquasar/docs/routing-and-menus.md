# Routing and menus

## Where routes come from

`createPachiRouter(options)` builds the router. Route records come from three sources, all passed by the
application as the result of `import.meta.glob(..., { eager: true, import: 'default' })`:

| Option      | Glob                                                                  | Content                                             |
| ----------- | --------------------------------------------------------------------- | --------------------------------------------------- |
| `features`  | `/src/features/**/routes.ts`                                          | routes of the application (default export: array)   |
| `packages`  | `/node_modules/@ilpachi/*/{routes,dist/routes,src/routes}.{ts,js}`    | routes exported by `@ilpachi/*` packages            |
| `menus`     | `/node_modules/@ilpachi/*/{menu,dist/menu,src/menu}.{ts,js}`          | account menu factories exported by packages         |

Other options: `config`, `env` (for `ilpachi-<pkg>-disable-route`), `mode` (`hash` default, `history`,
`memory`), `base`.

`buildPachiRoutes` composes the final tree:

1. core routes with `meta.root === true`;
2. authentication routes (`/auth/login`, only when auth is enabled);
3. package and feature routes, sorted by `meta.order` (default `99`);
4. a catch-all route to the error page.

Routes with `meta.root === true` are top level (outside the main layout, for example the login page); all the
others become children of the layout mounted at `/`. A package linked locally contains both `src/` and `dist/`:
only one copy is used (preference `dist`, then package root, then `src`), so routes and menu entries are never
duplicated.

## Route `meta`

The shell augments vue-router's `RouteMeta` (import the type `PachiRouteMeta` to load the augmentation).

| Meta               | Type                                      | Description                                                                                         |
| ------------------ | ----------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `noAuth`           | `boolean`                                 | public page: no authentication required (an authenticated user is redirected to the landing page)   |
| `root`             | `boolean`                                 | mount at top level, outside the layout                                                              |
| `hidden`           | `boolean`                                 | hide from dashboard cards and menus                                                                 |
| `title`            | `string`                                  | literal title (fallback)                                                                            |
| `titleKey`         | `string`                                  | i18n key of the title, reactive to language changes; takes precedence over `title`                  |
| `description`      | `string`                                  | literal description                                                                                 |
| `descriptionKey`   | `string`                                  | i18n key of the description; takes precedence                                                       |
| `icon`             | `string`                                  | SVG icon (import from `@quasar/extras/mdi-v7`) or `img:<url>`                                       |
| `iconColor`        | `string`                                  | icon color                                                                                          |
| `img`              | `string`                                  | themed background image for card and page (static import)                                           |
| `order`            | `number`                                  | sort position (default `99`)                                                                        |
| `useMyIcon`        | `boolean`                                 | use the icon as is                                                                                  |
| `bgStyle`          | `Record<string, string>`                  | CSS style of the page background                                                                    |
| `dashboard`        | `boolean`                                 | force (`true`) or exclude (`false`) the card dashboard for a route with children; default `app.autoDashboard` |
| `statsUrl`         | `string`                                  | URL fetched for the card statistics (`IDashboardCardStat[]`); the token is sent only to same-origin URLs |
| `stats`            | `IDashboardCardStat[] \| () => ...`       | statistics shown on the card                                                                        |
| `widgets`          | `{ component, props? }[]`                 | widgets shown under the cards (see `@ilpachi/fastquasar-dashboard-widgets`)                         |
| `permissions`      | `string[]`                                | permissions the user must all have                                                                  |
| `requireStaff`     | `boolean`                                 | requires `isStaff`                                                                                  |
| `requireSuperuser` | `boolean`                                 | requires `isSuperuser`                                                                              |

Without a dashboard, a route with children needs a component containing `<router-view />` or a `redirect`.
Authorization is described in [Authentication](authentication.md#route-authorization).

### Example feature

```ts
// src/features/reports/routes.ts
import type { RouteRecordRaw } from 'vue-router'
import { mdiChartBar, mdiFileChart } from '@quasar/extras/mdi-v7'

export default [
  {
    path: '/reports',
    meta: {
      titleKey: 'reports.title',
      descriptionKey: 'reports.description',
      icon: mdiChartBar,
      order: 20,
      permissions: ['reports.view']
    },
    children: [
      {
        path: 'monthly',
        component: () => import('./pages/MonthlyReportPage.vue'),
        meta: { titleKey: 'reports.monthly', icon: mdiFileChart }
      }
    ]
  }
] as RouteRecordRaw[]
```

`/reports` has children, so it appears on the home dashboard as a card and shows a dashboard of its own
children. Set `meta: { dashboard: false }` and a component with `<router-view />` to turn that off for one route.

## Navigation guard

When authentication is disabled everything passes. Otherwise, on every navigation:

1. routes without `meta.noAuth` try a silent session restore (a stored refresh token is exchanged for a new
   access token);
2. `noAuth` routes redirect authenticated users to the landing page (`/`);
3. unauthenticated users go to `/auth/login?next=<requested path>` (only internal paths are accepted as
   `next`);
4. `AuthManager.canAccess(to.meta)` decides per-route authorization; a denied user returns to `/`.

## Account menu

The account menu is the list of entries shown by the avatar button. It is composed from, in this order:

1. package factories (modules exporting a `menu` default function) and application factories
   (`config.menuFactories`);
2. the default Home entry (omitted if a factory already provides `/`);
3. `auth.menu.extraButtons`;
4. `config.menuItems`: an array is appended; a function receives the final list and returns the new one.

Entries are sorted by `order` (default `50`; Profile `10`, Settings `20`, Home `90`; equal orders keep insertion
order). Entries whose `to` does not resolve to a real route are hidden. Profile and Settings do not come from
the shell: they are provided by `@ilpachi/fastquasar-profile` and `@ilpachi/fastquasar-settings`.

### `IMenuButton`

| Field     | Type                            | Description                              |
| --------- | ------------------------------- | ---------------------------------------- |
| `label`   | `string`                        | entry text                               |
| `caption` | `string`                        | secondary text                           |
| `icon`    | `string`                        | SVG icon                                 |
| `to`      | `string`                        | route path                               |
| `onClick` | `() => void`                    | click handler (alternative to `to`)      |
| `visible` | `boolean \| () => boolean \| null` | visibility                            |
| `order`   | `number`                        | position (default `50`)                  |

### Menu factory contract

A package exports `menu.ts` (or `dist/menu.js`) whose default export is a `PachiMenuItemFactory`. The
application can register the same kind of function in `config.menuFactories`.

```ts
import type { PachiMenuItemFactory } from '@ilpachi/pachifastquasar'
import { mdiCog } from '@quasar/extras/mdi-v7'

const getMenuItem: PachiMenuItemFactory = ({ t, router, config, user }) => ({
  label: t('pachiSettings.menu'),
  caption: t('pachiSettings.menuCaption'),
  icon: mdiCog,
  to: '/auth/settings',
  order: 20,
  visible: config.auth.menu.showSettings
})

export default getMenuItem
```

- The context is `{ t, router, config, user? }`: vue-i18n translation function, router, resolved configuration
  and the current user.
- The return value is one entry, an array of entries, or `null`.
- The shell evaluates the factory inside a `computed`, so entries follow language and user changes. An
  exception inside a factory is logged and the factory is skipped; the menu keeps working.
- A package must not import the shell at runtime (use `import type` only).
- The factory is skipped when the package routes are disabled with `ilpachi-<pkg>-disable-route`.
