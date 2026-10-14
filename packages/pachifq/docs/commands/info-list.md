# pachifq info and pachifq list

## info

```text
pachifq info [--json]
pachifq i [--json]
```

Prints Node version, package manager, Quasar version, auth state, backend proxy, the shell
(range and installed version), all `QCLI_*` options with their effective value (precedence
`process.env` > `src/.env.local` > `src/.env` > `.env.local` > `.env`), the `@ilpachi/*`
dependencies (installed version, `workspace`, or `NOT installed`), the app and generated
languages and the features. `--json` returns the same data (`shell`, `options`, `packages`,
`locales`, `generatedLocales`, `features`, ...).

## list

```text
pachifq list [--json]
```

```text
Features in src/features/ (1)
  - invoices         ✓  title: "Invoices"
```

`--json` prints `[{ "name": "invoices", "hasRoutes": true, "title": "Invoices" }]`.

Both commands must run from an app root; otherwise they report that no `package.json` was found.
