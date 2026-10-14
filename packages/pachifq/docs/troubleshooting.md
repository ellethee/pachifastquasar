# Troubleshooting

- **`@`, `{`, `}`, `|` in messages**: special in vue-i18n; write `{'@'}`.
- **Duplicated `quasar` copies in Vite dev** (typical with `--link`): packages use the `$q` of the app; `create --link` writes a block in `quasar.config.ts` that points the singletons to the app `node_modules`.
- **`pnpm install` skipped**: a dependency was not found on the registry; check `--registry` / `PACHI_NPM_REGISTRY` or recreate the app with `--link`.
- **Old `@ilpachi/*` versions with pnpm 11**: recent versions are ignored for 24 hours; the generated workspace file excludes `@ilpachi/*`.
- **Icon rejected**: choose one of the suggestions.
- **"Nessun package.json trovato"**: run the command from the app root.
- **Private registry login**: put credentials in your user `~/.npmrc`; the CLI never writes or publishes tokens.
