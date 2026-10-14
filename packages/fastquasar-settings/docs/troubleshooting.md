# Troubleshooting

**`create is not a function`, notifications or dark mode that do nothing (development only).** In development Vite may
serve two copies of `quasar` (one for the app and one for the package, pre-bundled separately). The plugins imported by
the package would then not be installed in its copy. The package avoids the problem: it uses the `$q` instance of the
app (resolved in `setup()` and remembered) for `Notify` and `Dark`, and only falls back to the imported plugins when no
`$q` has ever been available (tests, use outside a component). Do not replace this with `useQuasar()` or with the
plugins imported from `quasar` in your own action handlers: use `ctx.Dark` and `ctx.Notify`.

**Package state seems empty or duplicated** (`setPachiSettingsOptions` has no effect, registered actions are not found,
two manager instances). The state of the package (options, the manager singleton, registered actions) lives in module
scope, so the module must be loaded once. In development, exclude the `@ilpachi/*` packages from the Vite dependency
pre-bundling, so the routes/menu modules loaded with `import.meta.glob` and your own imports share one copy:

```ts
// quasar.config.ts
build: {
  extendViteConf(viteConf) {
    viteConf.optimizeDeps = {
      ...viteConf.optimizeDeps,
      exclude: [...(viteConf.optimizeDeps?.exclude ?? []), '@ilpachi/fastquasar-settings'],
    }
  },
}
```

`definePachiQuasarConfig` of `@ilpachi/pachifastquasar` already does this for every `@ilpachi/*` dependency of the app
(and de-duplicates `vue`, `quasar`, `pinia`, `vue-i18n` and the other singletons through `resolve.dedupe`); you only need
the snippet above outside the shell.

**The page shows "Loading error".** The schema or the values request failed. Check that the user is authenticated, that
`baseUrl` points to the auth router (`/api/auth`), that the dev proxy forwards `/api`, and that the HTTP client unwraps
the `{success, message, data}` envelope (a custom `getHttp` client must do it itself).

**Schema `events` do nothing.** Check the format: the package reads `{ action, args }` objects and `"name"` / `"name:arg"` strings (see
[Schema actions](backend-contract.md#schema-actions-events-and-watch)), and the action must exist (`listSettingsActions()`). Unknown
actions print `Settings: azione "<spec>" sconosciuta` in the console.

**Settings of the previous user appear after a login.** The store is persisted; call
`SettingsManager.getInstance().clearSettings()` on logout.
