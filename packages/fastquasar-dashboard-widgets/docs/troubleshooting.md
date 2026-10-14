# Troubleshooting

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
[Mounting it in a pachifastquasar app](usage.md#mounting-it-in-a-pachifastquasar-app)), and `meta.widgets` must hold
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
