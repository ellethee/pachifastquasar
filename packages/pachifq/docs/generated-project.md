# Generated project

```text
my-app/
  package.json            depends on @ilpachi/pachifastquasar, use-alova, pachi-i18n
  pnpm-workspace.yaml     allowBuilds, minimumReleaseAgeExclude ['@ilpachi/*']
  .npmrc                  only with --registry <url>: @ilpachi:registry=...  (never a token)
  quasar.config.ts        definePachiQuasarConfig(...)
  public/                 favicons
  src/
    App.vue
    pachi-config.ts      definePachiConfig(base, import.meta.env)
    .env  .env.example   QCLI_* options (only the chosen ones / all, commented)
    boot/pachi.ts        createPachiApp
    router/index.ts      createPachiRouter
    stores/index.ts
    css/  assets/
    i18n/generated/      backend messages (errors.codes)
    i18n/overrides/
    features/            your features
```

Scripts: `pnpm dev`, `pnpm build`, `pnpm typecheck`.

## Options (`QCLI_*`)

`pachifq info` lists all of them with their value. Examples: `QCLI_AUTH_ENABLED`,
`QCLI_APP_TITLE`, `QCLI_APP_LOCALE`, `QCLI_APP_SHOW_LOCALE_SWITCHER`, `QCLI_APP_AUTO_DASHBOARD`,
`QCLI_HTTP_ENVELOPE`, `QCLI_PROXY_TARGET` (default `http://localhost:8000`).

## Backend error messages

```bash
pachifast locale export --base-dir <backend> --dest-path src/i18n/generated --namespace errors.codes
```

Add `--check` to verify the files are not stale. Overrides go in `src/i18n/overrides/<lang>.ts|json`.
