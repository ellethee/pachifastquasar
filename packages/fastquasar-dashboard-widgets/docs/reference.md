# Reference

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
[Backend contract](backend-contract.md#backend-contract) about `user_id`.

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
