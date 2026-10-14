# @ilpachi/fastquasar-dashboard-widgets

> **Status: beta.** Companion frontend of pachifast (Python backend by the same author). The API is evolving and may change between minor releases (0.x) — see CHANGELOG. ESM only. Requires @ilpachi/use-alova (peer) and a pachifast backend (see backend-contract). Provided "as is", without warranty of any kind (see [LICENSE](./LICENSE)). Not recommended for production use without pinning versions and testing against your pachifast backend.

Two dashboard widgets for Vue 3 / Quasar apps, fed by plain HTTP endpoints:

- `PachiDashboardActivityCard`: the most recent activity entries (one line each, with the time).
- `PachiDashboardSystemCard`: version, environment, uptime and a status indicator of the backend.

Both cards load their data from a `url` you give them, optionally refresh it on a timer, show a skeleton while loading,
a distinct error state with a "Retry" button, and an empty state. The HTTP client is injectable. They are designed to be
listed in the `meta.widgets` of a route of an `@ilpachi/pachifastquasar` app, and can be used in any other Vue 3 page.

## Contents

- [Requirements](#requirements)
- [Installation](#installation)
- [Mounting it in a pachifastquasar app](#mounting-it-in-a-pachifastquasar-app)
- [Using the cards directly](#using-the-cards-directly)
- [Reference](#reference)
- [Backend contract](#backend-contract)
- [HTTP client resolution](#http-client-resolution)
- [Translations](#translations)
- [Styling](#styling)
- [Troubleshooting](#troubleshooting)
- [Changelog](#changelog)
- [License](#license)

## Requirements

Peer dependencies (declared in `package.json`, installed by your app):

| Package | Range | Notes |
| --- | --- | --- |
| `vue` | `^3.5.0` | |
| `quasar` | `^2.20.0` | Uses `QIcon`, `QBtn` and the `date` utility. |
| `@quasar/extras` | `^2.0.0` | Icons are SVG paths from `@quasar/extras/mdi-v7`. |
| `vue-i18n` | `^11.0.0` | |
| `@ilpachi/pachi-i18n` | `>=0.1.0 <1.0.0` | Messages and `usePachiI18n`. |
| `@ilpachi/use-alova` | `^2.1.1` | Required. Default HTTP client (global instance, registered by `createPachiApp`). |

The package ships ES modules only (`"type": "module"`) with TypeScript declarations. It has no routes and no menu
entry: unlike the profile and settings packages there is nothing for the shell to discover.

## Installation

```bash
pnpm add @ilpachi/fastquasar-dashboard-widgets
```

Install the peer dependencies too if your app does not have them yet: `@ilpachi/pachi-i18n`, `@ilpachi/use-alova`, `@quasar/extras`, `quasar`, `vue`, `vue-i18n`.

## Mounting it in a pachifastquasar app

The shell shows the widgets of a route under the cards of its dashboard. A route declares them in `meta.widgets`, an
array of `{ component, props }` (`IDashboardWidget`). Declare them in a feature of your app, wrapping the components
with `markRaw` so Vue does not make them reactive:

```ts
// src/features/monitoring/routes.ts
import { markRaw } from 'vue'
import type { RouteRecordRaw } from 'vue-router'
import {
  PachiDashboardActivityCard,
  PachiDashboardSystemCard,
} from '@ilpachi/fastquasar-dashboard-widgets'

export default [
  {
    path: '/monitoring',
    meta: {
      title: 'Monitoring',
      dashboard: true, // render this route as a dashboard of cards
      widgets: [
        {
          component: markRaw(PachiDashboardSystemCard),
          props: { url: '/api/demo/lab/system', refreshInterval: 30_000 },
        },
        {
          component: markRaw(PachiDashboardActivityCard),
          props: { url: '/api/admin/audit/activity?limit=10', refreshInterval: 15_000 },
        },
      ],
    },
    children: [
      { path: 'logs', meta: { title: 'Logs' }, component: () => import('./pages/LogsPage.vue') },
    ],
  },
] as RouteRecordRaw[]
```

Notes:

- The widgets are rendered only when the route is shown as a dashboard (a route with children and the automatic
  dashboard on, `meta.dashboard: true`, or the home route). A single widget takes the full width.
- `url` is requested exactly as written, so give the full path (`/api/...`) of an endpoint that the app's HTTP client can
  reach (same origin, or through the development proxy).
- With the shell client, requests carry the authentication header, refresh the token on `401`, and the response
  envelope is unwrapped: see [HTTP client resolution](#http-client-resolution).

### Boot file (optional)

With the shell nothing else is required: the cards pick up the authenticated `@ilpachi/use-alova` client registered by `createPachiApp`. A boot
file is only needed to use a different client for the widgets:

```ts
// src/boot/pachi.ts
import { setPachiWidgetsHttp } from '@ilpachi/fastquasar-dashboard-widgets'

// once at startup; `client` is an alova instance (or any object with Get(url, config))
setPachiWidgetsHttp(() => ({ Get: (url, config) => client.Get(url, config) }))
```

## Using the cards directly

```vue
<template>
  <div class="row q-col-gutter-md">
    <div class="col-12 col-md-6">
      <pachi-dashboard-system-card url="/api/demo/lab/system" />
    </div>
    <div class="col-12 col-md-6">
      <pachi-dashboard-activity-card url="/api/admin/audit/activity?limit=10" :refresh-interval="15000" />
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  PachiDashboardActivityCard,
  PachiDashboardSystemCard,
} from '@ilpachi/fastquasar-dashboard-widgets'
</script>
```

Passing a client to a single card:

```vue
<pachi-dashboard-system-card url="/api/system" :http="customClient" />
```

## Reference

### Exports

| Export | Kind | Description |
| --- | --- | --- |
| `PachiDashboardActivityCard` | component | Recent activity list. |
| `PachiDashboardSystemCard` | component | System information card. |
| `setPachiWidgetsHttp(factory)` | function | Sets the factory that returns the HTTP client of all the widgets. Call it once at startup. |
| `getPachiWidgetsHttp()` | function | Returns the client currently resolved (see [HTTP client resolution](#http-client-resolution)). |
| `IPachiWidgetsHttp` | type | `{ Get<T>(url: string, config?: Record<string, unknown>): PromiseLike<T> }`. |
| `PachiWidgetsHttpFactory` | type | `() => IPachiWidgetsHttp`. |
| `IDashboardActivity` | type | One activity entry. |
| `IDashboardSystemInfo` | type | The system information object. |

### Props (both cards)

| Props | Type | Default | Description |
| --- | --- | --- | --- |
| `url` | `string` | required | Endpoint to `GET` (JSON). Reactive: when it changes, the card goes back to the loading state and requests again. |
| `http` | `IPachiWidgetsHttp` | `undefined` | Client for this card. Reactive (a change requests again). Wins over the global client. |
| `refreshInterval` | `number` (ms) | `0` | Polling interval. `0` or negative means no polling. The timer is stopped when the card is unmounted and restarted when the prop changes. |

| Events | Description |
| --- | --- |
| none | The cards emit no events. |

| Slots | Description |
| --- | --- |
| none | The cards expose no slots. |

Every request is sent with `{ meta: { autoError: false } }`, so the error dialog of the app is not opened: errors are
shown inside the card. Responses that arrive out of order, or after the card was unmounted, are ignored.

States of a card:

| State | When | What is shown |
| --- | --- | --- |
| Loading | first request (and after a `url` or `http` change) | Skeleton rows (5 for the activity card, 4 for the system card). |
| Error | the request failed (network, HTTP error, exception) | A message ("— failed to load", `role="alert"`) and a "Retry" button that requests again. |
| Empty | activity: the list has no items; system: the response is not an object | "— no recent activity" / "— data not available". |
| Data | otherwise | The list or the rows. |

### `PachiDashboardActivityCard`

Shows a list of entries, one line each: a small icon, `description` (or `path` when there is no description), and the
time of `timestamp` as `HH:mm:ss` (in the browser's time zone, formatted with Quasar's `date.formatDate`). All texts
are rendered as plain text, never as HTML. The response is validated: anything that is not an array gives an empty list,
and items that are not objects are dropped.

### `PachiDashboardSystemCard`

Shows these rows, each hidden when the value is missing or empty: **Version** (`version`), **Environment**
(`environment`), **Uptime** (`uptime`, shown as received), and always **Status** with a coloured dot:

| `status` | Label | Dot colour |
| --- | --- | --- |
| `ok` | Operational | `--pachi-accent` |
| `warn` | Warning | `--pachi-amber` |
| `error` | Error | `--pachi-red` |

The response must be a JSON object (an array or a primitive gives the "data not available" state). A missing `status`
is shown as "Operational".

### Types

```ts
interface IDashboardActivity {
  timestamp: string
  user_id?: number
  method: string
  status_code: number
  username?: string
  id: number
  path: string
  duration_ms: number
  description?: string
}

interface IDashboardSystemInfo {
  version?: string
  environment?: string
  status: 'ok' | 'warn' | 'error'
  uptime?: string
}
```

The keys of `IDashboardActivity` are `snake_case`, exactly as the backend sends them. See the notes in
[Backend contract](#backend-contract) about `user_id`.

## Backend contract

**Minimum pachifast version:** none in particular: `GET /api/admin/audit/activity` has been in pachifast since 0.1.0 (the default exclusion of `refresh-token` paths is applied from 0.8.0); the system card only needs an endpoint returning the shape below (a project route, not part of pachifast). See the pachifast CHANGELOG.

The cards do not know any endpoint: they request the `url` you give them. The shapes below are the ones produced by a
`pachifast` backend and by the demo project.

By default the backend wraps every successful (2xx) JSON response in an envelope:

```json
{ "success": true, "message": "...", "data": { } }
```

The cards expect the **payload** (`data`), so the HTTP client must unwrap the envelope. The client of
`@ilpachi/pachifastquasar` does (`unwrapEnvelope`; switch it off with `QCLI_HTTP_ENVELOPE=false` when the backend runs
with `PACHIFAST_ENVELOPE_ENABLED=false`). A client registered with `setPachiWidgetsHttp` or passed in the `http` prop is used as is: the widgets make no
assumption on the shape, but an enveloped response is an object, not an array, so the activity card would show its
empty state if the client does not unwrap it.

### Recent activity: `GET /api/admin/audit/activity`

| | |
| --- | --- |
| Request | `GET /api/admin/audit/activity?limit=10` with the bearer token |
| Access | **superusers only**. Other users get `403`. |
| Availability | the route exists only when the activity log is enabled on the backend (`PACHIFAST_ACTIVITY_LOG_ENABLED=true`, setting `activity_log_enabled`); otherwise `404`. |
| Query | `limit` (1 to 500, default 10); optional filters `search`, `userId`, `method`, `statusCode`, `dateFrom`, `dateTo`, `pathContains`, `excludePaths`, `orderBy` (default `-timestamp`, newest first). By default paths containing `refresh-token` are excluded (setting `activity_log_exclude_paths`). |
| Response | the plain list (no pagination) of the latest entries. |

Only write requests (`POST`, `PUT`, `PATCH`, `DELETE`) under `/api` with a status below 500 are logged.

Payload (inside the envelope `data`):

```json
[
  {
    "id": 42,
    "timestamp": "2026-10-05T14:02:23.430541Z",
    "user_id": "0f0b5a0c-5d0e-4a64-9f2e-2f0c8c0f9a11",
    "username": "mrossi",
    "method": "POST",
    "path": "/api/demo/items",
    "status_code": 201,
    "duration_ms": 12,
    "description": "mrossi created item 7"
  }
]
```

| Field | Type | Notes |
| --- | --- | --- |
| `id` | integer | Used as the list key. |
| `timestamp` | string | ISO 8601, UTC. Only the time is shown. |
| `user_id` | string (UUID) or `null` | The type `IDashboardActivity.user_id` declares `number`, but the backend sends a UUID string or `null`. The cards do not read it. |
| `username` | string or `null` | Denormalised: it survives the deletion of the user. Not displayed. |
| `method` | string | Not displayed. |
| `path` | string | Shown when `description` is empty. |
| `status_code` | integer | Not displayed. |
| `duration_ms` | integer or `null` | Not displayed. |
| `description` | string or `null` | Built by the backend from the `log_as` template of the route. |

### System information: `GET /api/demo/lab/system` (demo project)

The system card does not have a built-in endpoint in `pachifast`; the demo project exposes one that returns the shape the
card understands (any endpoint with the same shape works):

```json
{
  "success": true,
  "message": "...",
  "data": {
    "version": "1.2.3",
    "environment": "debug",
    "status": "ok",
    "uptime": "1h 12m 5s"
  }
}
```

| Field | Type | Notes |
| --- | --- | --- |
| `version` | string | Optional. |
| `environment` | string | Optional (the demo sends `debug` or `production`). |
| `status` | `'ok' \| 'warn' \| 'error'` | Drives the label and the dot colour. |
| `uptime` | string | Optional. Shown exactly as received (the demo sends a formatted text such as `1h 12m 5s`; a value of `0` is hidden). |

### Errors

Errors are never a 2xx. The backend answers with a non-2xx status and:

```json
{
  "detail": [
    { "loc": ["header", "authorization"], "msg": "...", "type": "...", "code": "...", "params": {} }
  ]
}
```

Any failure (`401`, `403`, `404`, network error, invalid JSON) puts the card into its error state; the body is not
inspected. A `401` is handled before by the shell client, which refreshes the token and retries.

## HTTP client resolution

The client is resolved, in this order:

1. the `http` prop of the card;
2. the factory set with `setPachiWidgetsHttp`;
3. the global `@ilpachi/use-alova` instance (`getUseAlovaInstance()`, registered by `createPachiApp` of the shell, or by
   your own `createUseAlova()`), so authentication header, token refresh and the envelope unwrapping work without
   code. The client is cached until the global factory changes. If no instance exists, an error is thrown asking for
   `createUseAlova()` or `setPachiWidgetsHttp()`.

`IPachiWidgetsHttp` is the only thing a custom client must implement:

```ts
interface IPachiWidgetsHttp {
  Get<T = unknown>(url: string, config?: Record<string, unknown>): PromiseLike<T>
}
```

## Translations

Texts of the package live in the `pachiDashboardWidgets` namespace (Italian reference, English), registered through
`@ilpachi/pachi-i18n`. They are registered once, **without overriding** what the app already defines, so an app can
redefine any text, or add a language, by declaring the same keys in its own messages.

| Key | English text |
| --- | --- |
| `pachiDashboardWidgets.retry` | Retry |
| `pachiDashboardWidgets.activity.code` | activity |
| `pachiDashboardWidgets.activity.title` | Recent activity |
| `pachiDashboardWidgets.activity.empty` | — no recent activity |
| `pachiDashboardWidgets.activity.error` | — failed to load |
| `pachiDashboardWidgets.system.code` | system |
| `pachiDashboardWidgets.system.title` | System |
| `pachiDashboardWidgets.system.empty` | — data not available |
| `pachiDashboardWidgets.system.error` | — failed to load |
| `pachiDashboardWidgets.system.version` | Version |
| `pachiDashboardWidgets.system.environment` | Environment |
| `pachiDashboardWidgets.system.uptime` | Uptime |
| `pachiDashboardWidgets.system.status` | Status |
| `pachiDashboardWidgets.system.statusOk` | Operational |
| `pachiDashboardWidgets.system.statusWarn` | Warning |
| `pachiDashboardWidgets.system.statusError` | Error |

## Styling

The package works on its own. It loads default values for the theme variables with zero specificity (`:where(...)`), a
dark theme on `:root`, a light theme on `body.body--light`, and a compact density on `:root[data-density='compact']`. If
the project defines the same `--pachi-*` variables, its values win. No CSS class of the host project is required, and
the component styles are not `scoped` (classes start with `pachi-pdw-`, `pachi-dac-` and `pachi-dsc-`). The card has a
minimum height of 230 px.

CSS variables read by the cards (defaults: dark / light):

| Variable | Dark default | Light default | Used for |
| --- | --- | --- | --- |
| `--pachi-surface` | `#10141b` | `#ffffff` | Card background |
| `--pachi-surface-2` | `#161b23` | `#e8edf3` | Skeleton |
| `--pachi-surface-3` | `#1c2230` | `#dde3eb` | Skeleton shimmer |
| `--pachi-border` | `#1f2530` | `#d1d9e0` | Card border |
| `--pachi-border-hi` | `#2a3140` | `#b8c3cc` | Border on hover, background grid |
| `--pachi-ink` | `#e6eaf2` | `#1a2232` | Title and values |
| `--pachi-muted` | `#7b8494` | `#6b7688` | Row labels |
| `--pachi-faint` | `#525b6b` | `#9aa3b0` | Card code, empty state |
| `--pachi-accent` | `#2dd4bf` | `#2dd4bf` | "ok" status dot |
| `--pachi-accent-ink` | `#5eead4` | `#0f766e` | Icons |
| `--pachi-amber` | `#fbbf24` | `#d97706` | "warn" status dot |
| `--pachi-red` | `#f87171` | `#dc2626` | "error" status dot, error message |
| `--pachi-font` | `'Geist', 'Inter Tight', system-ui, -apple-system, sans-serif` | same | Title |
| `--pachi-mono` | `'Geist Mono', 'JetBrains Mono', ui-monospace, monospace` | same | Code, times, values |

The defaults file also defines, for projects that share the same theme: `--pachi-bg`, `--pachi-ink-2`,
`--pachi-accent-soft`, `--pachi-accent-mid`, `--pachi-accent-deep`, `--pachi-blue`, `--pachi-blue-soft`,
`--pachi-amber-soft`, `--pachi-red-soft`, `--pachi-green`, `--pachi-title-font`, `--pachi-row-h`, `--pachi-pad` and
`--pachi-card-r`. The glow and the icon box of the card use a fixed teal (`rgba(45, 212, 191, ...)`) that does not follow
`--pachi-accent`.

## Troubleshooting

**The activity card always shows "failed to load".** Check, in this order: the user is a **superuser** (`403`
otherwise); the backend runs with the activity log enabled (`PACHIFAST_ACTIVITY_LOG_ENABLED=true`, otherwise the route
does not exist and answers `404`); the `url` is reachable from the browser (development proxy for `/api`); the token is
valid. The card does not distinguish these cases: open the browser network tab to see the status.

**The activity card shows "no recent activity" although the backend has data.** The response was not an array: the HTTP
client did not unwrap the `{success, message, data}` envelope (this happens with a custom client that does not unwrap), or the endpoint
returns a paginated object (`{ items, total, ... }`) instead of the plain list; use `/activity`, not `/logs`.

**The system card shows "data not available".** The response is not a JSON object (same causes as above).

**A Quasar error dialog pops up when the request fails.** The cards send `meta: { autoError: false }`. A custom client
must honour that option (or ignore `meta`) if it has an automatic error dialog of its own.

**Widgets do not appear in the dashboard.** The route must be displayed as a dashboard (see
[Mounting it in a pachifastquasar app](#mounting-it-in-a-pachifastquasar-app)), and `meta.widgets` must hold
`{ component, props }` objects with the component wrapped in `markRaw`.

**Module state is duplicated in development.** `setPachiWidgetsHttp` stores the factory in module scope, so the package
must be loaded once. In development Vite pre-bundles dependencies while some modules are loaded as raw files, which can
produce two copies. Exclude the `@ilpachi/*` packages from the pre-bundling:

```ts
// quasar.config.ts
build: {
  extendViteConf(viteConf) {
    viteConf.optimizeDeps = {
      ...viteConf.optimizeDeps,
      exclude: [...(viteConf.optimizeDeps?.exclude ?? []), '@ilpachi/fastquasar-dashboard-widgets'],
    }
  },
}
```

`definePachiQuasarConfig` of `@ilpachi/pachifastquasar` already does this for every `@ilpachi/*` dependency of the app
(and de-duplicates `vue`, `quasar`, `vue-i18n` and the other singletons through `resolve.dedupe`); you only need the
snippet above outside the shell. The related symptom of two copies of `quasar` in development does not affect these
cards: they only render Quasar components, which use the `$q` of the app.

## Changelog

See [CHANGELOG.md](./CHANGELOG.md).

## License

[MIT](./LICENSE) © ilPachi
