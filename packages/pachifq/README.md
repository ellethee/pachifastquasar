# @ilpachi/pachifq

Scaffolding CLI for apps and features built on [`@ilpachi/pachifastquasar`](https://github.com/ellethee/pachifastquasar/tree/main/packages/pachifastquasar), the Vue 3 / Quasar application shell distributed as an npm package. It works in the style of the Quasar CLI: `pachifq create` generates a small app that *depends on* the shell (it does not copy its sources), and `pachifq new feature` / `pachifq new locale` extend it.

> **Status: beta.** Scaffold CLI for frontends of pachifast (Python backend by the same author). API and generated layout may change between releases (0.x). Provided "as is", without warranty of any kind (see [LICENSE](./LICENSE)). Not recommended for production use without pinning versions and testing against your pachifast backend.

## Installation

```bash
pnpm dlx @ilpachi/pachifq create        # one-off, no install
pnpm add -D @ilpachi/pachifq            # or as a dev dependency of an existing app
pachifq --version
```

Requires Node >= 20.

## Quick start

```bash
pachifq create my-app                      # interactive
cd my-app && pnpm install && pnpm dev

pachifq new feature invoices --title "Invoices" --icon mdiFileDocumentOutline --yes
pachifq new locale fr
pachifq list
pachifq info
```

## Commands

| Command | Alias | Description |
| --- | --- | --- |
| `pachifq create [name] [options]` | `c` | Generate a new app. |
| `pachifq new feature <name> [options]` | `new f` | Generate `src/features/<name>/` in an existing app. |
| `pachifq new locale <code>` | `new l` | Add a language to the app and its features. |
| `pachifq info [--json]` | `i` | Diagnostic information about the current project. |
| `pachifq list [--json]` | | List the features in `src/features/`. |
| `pachifq help` / `-h`, `--help` | `h` | Show help (also `pachifq <command> -h`). |
| `-v`, `--version` | | Print the version. |
| `--no-color` | | Disable colors. |

Options also accept the `--option=value` form. Unknown options, missing values and extra arguments are errors.

### `pachifq create`

Generates `package.json` (depending on `@ilpachi/pachifastquasar`, `@ilpachi/use-alova`, `@ilpachi/pachi-i18n` and the shell peers), `pnpm-workspace.yaml`, `quasar.config.ts` (`definePachiQuasarConfig`), `index.html`, `postcss.config.js`, `tsconfig.json`, `public/` (favicons), `src/{App.vue, pachi-config.ts, boot/pachi.ts, router/index.ts, stores/index.ts, css/, i18n/{generated,overrides}, assets/, features/}`, `src/.env` (only the options you chose), `src/.env.example` (all options, commented), `.gitignore` and `README.md`. Without `--yes` it asks for name, description, author, authentication, language, optional packages and backend proxy.

| Option | Description |
| --- | --- |
| `--yes` | No prompts: use the defaults (the project name is the slug of the name; it cannot be a path). |
| `--registry <url\|npm>` | Registry of the `@ilpachi/*` packages. Default `npm` (the public npm registry, or the `PACHI_NPM_REGISTRY` variable): no `.npmrc` is written. With a URL (private registry or mirror) the project gets an `.npmrc` with `@ilpachi:registry=<url>` (never a token). |
| `--dry-run` | Print the files that would be generated and the resolved `package.json`; write nothing and install nothing. |
| `--link <path>` | Link `@ilpachi/pachifastquasar` to a local folder with `link:` (path relative to the project); sibling folders of `<path>` named like `@ilpachi/*` packages are linked too. For local development of the shell. |
| `--locale <code>` | Fixed language (`QCLI_APP_LOCALE`, e.g. `it`): no detection, no language switcher; also writes `<html lang>`. |
| `--no-auto-dashboard` | `QCLI_APP_AUTO_DASHBOARD=false` (no automatic card dashboard on routes with children). |
| `--no-envelope` | Backend running with `PACHIFAST_ENVELOPE_ENABLED=false`: writes `QCLI_HTTP_ENVELOPE=false`. |
| `--with <list>` | Comma-separated optional packages: `settings` (`@ilpachi/fastquasar-settings`), `profile` (`@ilpachi/fastquasar-profile`), `widgets` (`@ilpachi/fastquasar-dashboard-widgets`). |
| `--no-install` | Do not run `pnpm install`. |
| `--no-git` | Do not run `git init`. |
| `-h`, `--help` | Help. |

```bash
pachifq create my-app --yes --no-install --no-git
pachifq create my-app --yes --dry-run                                            # preview only
pachifq create my-app --yes --registry https://registry.example.com/npm/         # private registry / mirror
pachifq create my-app --yes --locale it --with settings,profile
pachifq create my-app --yes --link ../pachifastquasar/packages/pachifastquasar     # local shell
```

If generation fails after files were created, the folder is removed (not when only `pnpm install` fails). For every dependency taken from the registry, `create` runs a read-only `npm view <name>@<range> version` (5 s timeout); if something is not available it warns and skips `pnpm install`. `link:` dependencies are not checked. See [Generated project](docs/generated-project.md).

### `pachifq new feature`

Run it from the root of an app (recognized by the `@ilpachi/pachifastquasar` dependency or by `src/features/`). It creates `src/features/<name>/` with `routes.ts`, `pages/`, `stores/`, `services/`, `types/`, `components/` and `locales/{it,en}.ts` (namespace = feature name in camelCase). The name must be kebab-case and not reserved (`auth`, `login`).

| Option | Description |
| --- | --- |
| `--title <string>` | Title shown in the dashboard and menu. |
| `--description <string>` | Feature description. |
| `--icon <string>` | Export name from `@quasar/extras/mdi-v7` (e.g. `mdiFileDocumentOutline`). It is validated against the real export list; an unknown name is rejected with 3-5 similar suggestions and nothing is generated. If the package cannot be resolved, only the syntax (`mdi...` identifier) is checked and a warning is shown. |
| `--order <number>` | Order in the dashboard (default `99`). |
| `--children <list>` | Comma-separated kebab-case child routes: the feature becomes a section with a card per child, each with an empty placeholder page. |
| `--yes` | No prompts; requires `--title` besides the positional name. |

```bash
pachifq new feature invoices
pachifq new f invoices --title "Invoices" --description "Invoice management" --icon mdiFileDocumentOutline --order 10 --yes
pachifq new f reports --title "Reports" --children billing,archive --yes
```

Features live in the app: the app router and boot file glob `src/features/**/routes.ts` and `locales`, so creating the folder is enough.

### `pachifq new locale`

```bash
pachifq new locale fr
pachifq new locale pt-BR
```

Creates `src/i18n/locales/<code>.ts` (copied from `en.ts`/`it.ts` with `TODO: translate` markers; if the app has neither, an empty draft where you redefine only the shell keys you want to translate, the rest falls back to `en`), `src/features/*/locales/<code>.ts` for every feature and, only if the app has its own `packages/` folder, `packages/*/src/locales/<code>.ts`. Packages in `node_modules` (the shell included) are never modified: the command prints how to extend them (add the keys with the same namespace in `src/i18n/locales/<code>.ts`). Existing files are never overwritten.

### `pachifq info` and `pachifq list`

`info` prints Node version, detected package manager, Quasar version, auth state, the effective `QCLI_*` options (precedence `process.env` > `src/.env.local` > `src/.env` > `.env.local` > `.env`), the backend proxy, the shell version, the `@ilpachi/*` dependencies with their installed version (or `workspace` / `NOT installed`), the app and generated languages and the features. `list` prints the features of `src/features/`. Both accept `--json` for machine-readable output (`list --json` is an array of `{ name, hasRoutes, title? }`).

## Configuration of generated apps

App options are `QCLI_*` variables read by `definePachiConfig(baseConfig, import.meta.env)` in `src/pachi-config.ts` (`src/` is the Vite `envDir`). Only variables that are set and non-empty override the base, so `src/.env` contains just the choices made at creation; `src/.env.example` lists all variables with the shell default commented out. Backend proxy: the `QCLI_PROXY_TARGET` variable (default `http://localhost:8000`).

## Backend contract

Generated apps talk to a backend that follows the Pachi/Fast conventions, handled by `@ilpachi/use-alova` and the shell:

- Responses use the envelope `{ "success": true, "message": "", "data": ... }`, unwrapped by the HTTP client. For a backend with `PACHIFAST_ENVELOPE_ENABLED=false` create the app with `--no-envelope` (`QCLI_HTTP_ENVELOPE=false`).
- `DELETE` answers `204` without a body.
- Errors are `{ "detail": [{ "loc": [], "msg": "", "type": "", "code": "", "params": {} }] }`; `code` is translated through the keys `errors.codes.<code>`. If you use a pachifast backend, you can optionally export those messages into the app after `create`:

  ```bash
  pachifast locale export --base-dir <backend> --dest-path src/i18n/generated --namespace errors.codes
  # add --check to verify the files are not stale
  ```

- Authentication uses a bearer token with refresh on `401`; WebSocket connections use a single-use ticket. Pagination follows the page/page-size shape used by the generated service (`listXxx({ page, pageSize, search })`).

## Troubleshooting

- **`@` and braces in i18n messages**: in vue-i18n messages `{ } @ |` are special; write them as `{'@'}` in the generated `locales/*.ts` files.
- **Dev server with duplicated copies of `quasar`** (typical with `--link`, where the linked folders have their own `node_modules`): the packages use the `$q` of the app. `create --link` writes a block in `quasar.config.ts` that points the singletons (`vue`, `vue-router`, ...) to the app `node_modules`; with packages from the registry it is not needed.
- **`pnpm install` was skipped**: a dependency was not found on the registry. Check `--registry` / `PACHI_NPM_REGISTRY`, or recreate the app with `--link`.
- **pnpm 11 picks old versions of `@ilpachi/*`**: it ignores versions published less than 24 hours ago; the generated `pnpm-workspace.yaml` sets `minimumReleaseAgeExclude: ['@ilpachi/*']`.
- **Icon rejected by `--icon`**: pick a name from the suggestions or from `@quasar/extras/mdi-v7`.
- **`new feature`, `new locale` or `list` complain that no `package.json` is found or the folder is not an app**: run them from the app root (where `package.json` and `src/features/` are).
- **`create` cannot reach the registry**: set `--registry` or `PACHI_NPM_REGISTRY` (default: public npm); for a private registry log in in your user `~/.npmrc` (the CLI never writes tokens).

## Development

```bash
pnpm install
pnpm typecheck
pnpm test      # Vitest; generation uses a temporary folder and mocks `npm view`
pnpm build     # tsup -> dist/index.js; templates live in templates/
```

Templates (`templates/app/`) are text files with `{{placeholder}}` markers (`productName`, `description`, `htmlLang`, `presetOptions`, `configPreamble`, `configOverrides`); `_gitignore` becomes `.gitignore`. They mirror the `playground/` of `pachifastquasar`. Publish with `npm publish` (not pnpm).

More detail in the [documentation](docs/index.md).

## Changelog

See [CHANGELOG.md](CHANGELOG.md).

## License

MIT, see [LICENSE](LICENSE).
