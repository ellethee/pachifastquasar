# fastquasar-dashboard-widgets

Two dashboard widgets for Vue 3 / Quasar apps, fed by plain HTTP endpoints:

- `PachiDashboardActivityCard`: the most recent activity entries (one line each, with the time).
- `PachiDashboardSystemCard`: version, environment, uptime and a status indicator of the backend.

Both cards load their data from a `url` you give them, optionally refresh it on a timer, show a skeleton while loading,
a distinct error state with a "Retry" button, and an empty state. The HTTP client is injectable. They are designed to be
listed in the `meta.widgets` of a route of an `@ilpachi/pachifastquasar` app, and can be used in any other Vue 3 page.

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
