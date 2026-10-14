# {{productName}}

{{description}}

Quasar app built on [`@ilpachi/pachifastquasar`](https://github.com/ellethee/pachifastquasar/tree/main/packages/pachifastquasar) (generated with `pachifq create`).

```bash
pnpm install
pnpm dev                              # dev server (auth enabled by default)
QCLI_AUTH_ENABLED=false pnpm dev      # without auth
pnpm build                            # production build (dist/spa)
pnpm typecheck
```

- Configuration: `QCLI_*` variables in `src/.env` (see `src/.env.example`) and `src/pachi-config.ts`.
- Backend with `PACHIFAST_ENVELOPE_ENABLED=false` (responses without the envelope): set `QCLI_HTTP_ENVELOPE=false` in `src/.env`. The HTTP client is `@ilpachi/use-alova`.
- New features: `pachifq new feature <name>` (creates `src/features/<name>/`, picked up automatically by the router).
- New languages: `pachifq new locale <code>`.
- Optional, if you use a pachifast backend: export its error messages into the app with
  `pachifast locale export --base-dir <backend> --dest-path src/i18n/generated --namespace errors.codes`.
