# HTTP client

`createPachiApp` creates an [`@ilpachi/use-alova`](https://www.npmjs.com/package/@ilpachi/use-alova) client (alova with
the fetch adapter) and wires it to the shell. The same factory is exported as `createPachiHttp({ envelope? })`
(types `CreatePachiHttpOptions`, `PachiUseAlova`). It is stored globally, so application code and packages
share it, and is also provided to Vue with `app.provide('useAlova', ...)` and `app.config.globalProperties.$useAlova`.

## Making requests

```ts
import { getUseAlovaInstance } from '@ilpachi/use-alova'

interface Invoice { id: string; total: number }

const { alova } = getUseAlovaInstance()({ url: '/api/invoices' })

const invoice = await alova.Get<Invoice>('/42')
await alova.Post('/', { total: 10 })
await alova.Delete('/42')
```

The first call receives the base URL; the methods (`Get`, `Post`, `Put`, `Patch`, `Delete`) append paths to it.
File helpers (`withFiles`, `$form`, `$download`) come from `@ilpachi/use-alova/files`; the shell registers the
`fileSuccessHandlers` so blob and DOM responses work next to JSON.

Per-request options travel in the method config. Both the direct fields and the `meta` aliases are accepted:

```ts
await alova.Get('/health', { autoError: false, showOverlay: false })
await alova.Get('/health', { meta: { autoError: false, spinner: false } })
```

| Option                          | Effect                                                                  |
| ------------------------------- | ----------------------------------------------------------------------- |
| `autoError` / `meta.autoError`  | `false`: do not show the error dialog, just reject with `ResponseError` |
| `showOverlay` / `meta.spinner`  | `false`: never show the spinner; `true`: always show it                 |
| `cacheFor`                      | explicit cache duration (GET is never cached by default)                |

## What the shell wires

| Aspect        | Behavior                                                                                                                         |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Token         | `Authorization` header with the current access token and the `token_type` returned by the backend (normally `bearer`). It is sent **only to relative or same-origin URLs**. |
| 401 refresh   | `AuthManager.handleErrors()`: on a 401 of an authenticated request the token is refreshed (single-flight) and the request is repeated **once** with `retry()`. A second 401 or a failed refresh logs the user out. 401 responses without an `Authorization` header (for example wrong credentials at login) are shown as normal errors. Requests to `/refresh-token` and `/logout` are never retried. |
| 429           | `429 Too Many Requests` is not handled by `AuthManager.handleErrors()`: no refresh, no logout. The dialog shows the backend `detail`, or `errors.http.tooManyRequests` when there is none. |
| Spinner       | Quasar `Loading`, `overlay.mode: 'auto'` with a **300 ms delay**: fast responses never flash, concurrent requests share one overlay, cache hits never show it. |
| Errors        | `errorMessageFunction` shows a Quasar `Dialog`; validation errors become a list, text is HTML-escaped. See below.                  |
| Cache         | GET responses are never cached (`cacheFor: { GET: null }`).                                                                       |
| Envelope      | `unwrapEnvelope` from `http.envelope`.                                                                                            |

## Envelope

With `http.envelope: true` (default) a response shaped like `{ success, message, data }` resolves to `data`
only. A `DELETE` answered with `204 No Content` has no body and resolves `null`. Set
`http.envelope: false` (`QCLI_HTTP_ENVELOPE=false`) when the backend runs with
`PACHIFAST_ENVELOPE_ENABLED=false`: bodies are then returned untouched, so a payload that happens to contain
`success` and `data` is not discarded. Errors always stay non-2xx responses with a `detail` body.

## Errors

A failed request rejects with a `ResponseError` (from `@ilpachi/use-alova`). Unless `autoError: false`, the
shell shows a dialog built from the `detail` field of the body:

- an array of `{ loc, msg, type, code?, params? }` becomes a list. Each item is translated with the key
  `errors.codes.<code>` in the current language (placeholders filled from `params`); without a `code` or without
  a translation the server `msg` is shown. See [Internationalization](i18n.md#backend-error-codes);
- a string `detail` is shown as text;
- anything else (for example a 5xx without a structured body) shows the generic translated message
  `errors.http.generic`.

All server text is HTML-escaped before display.

## Using the client in components

```vue
<script setup lang="ts">
import { getUseAlovaInstance } from '@ilpachi/use-alova'
import { onMounted, ref } from 'vue'

const rows = ref<unknown[]>([])
onMounted(async () => {
  const { alova } = getUseAlovaInstance()({ url: '/api/items' })
  rows.value = (await alova.Get<{ items: unknown[] }>('')).items
})
</script>
```

See the `@ilpachi/use-alova` README for hooks (`useRequest` and friends), downloads, CSRF and custom
processors. Packages such as `pachi-kit` (`table`), `fastquasar-settings` and `fastquasar-dashboard-widgets` use the
client created by the shell automatically.
