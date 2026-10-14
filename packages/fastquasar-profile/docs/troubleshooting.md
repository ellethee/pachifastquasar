# Troubleshooting

**The page stays a skeleton.** `user` is `null` or `undefined`. On the route this means `setPachiProfileUser` was never
called, or the getter returns `null` (no session, authentication disabled, user info not loaded yet). Register the
getter once at startup.

**`setPachiProfileUser` seems to have no effect (development only).** The getter lives in module scope, so the module
must be loaded once. In development Vite pre-bundles dependencies, while the routes and menu of the packages are loaded
with `import.meta.glob` as raw files: the package could end up in two copies, and the route reads a getter that was
never set. Exclude the `@ilpachi/*` packages from the pre-bundling:

```ts
// quasar.config.ts
build: {
  extendViteConf(viteConf) {
    viteConf.optimizeDeps = {
      ...viteConf.optimizeDeps,
      exclude: [...(viteConf.optimizeDeps?.exclude ?? []), '@ilpachi/fastquasar-profile'],
    }
  },
}
```

`definePachiQuasarConfig` of `@ilpachi/pachifastquasar` already does this for every `@ilpachi/*` dependency of the app
(and de-duplicates `vue`, `quasar`, `vue-i18n` and the other singletons through `resolve.dedupe`); you only need the
snippet above outside the shell. The related symptom with Quasar itself (two copies of `quasar` in development) does not
affect this package: it only renders Quasar components, which use the `$q` of the app.

**Initials instead of the picture.** The user has no email, the app did not provide `pachiAvatarUrl` (Gravatar is off unless
`app.gravatar: true`), or Gravatar has no image for that address (it is requested with `d=404`, so the initials
are the intended result).

**Dates show "—".** The value is `null`, missing, or not parseable by `new Date()`. Send ISO 8601 strings, or pass
`last-login` / `member-since` as text.

**Wrong month or time format.** Dates follow the active i18n language (`Intl.DateTimeFormat`); an invalid locale code
falls back to Italian (`it`).
