# Usage

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
  envelope is unwrapped: see [HTTP client resolution](reference.md#http-client-resolution).

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
