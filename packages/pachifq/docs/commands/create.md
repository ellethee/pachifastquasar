# pachifq create

```text
pachifq create [project-name] [options]
pachifq c [project-name] [options]
```

Generates a new app from the templates embedded in the CLI. Without `--yes` it prompts for name,
description, author, authentication, language, optional packages and backend proxy.

## Options

| Option | Description |
| --- | --- |
| `--yes` | No prompts, defaults for everything. |
| `--registry <url\|npm>` | Registry of `@ilpachi/*`. Default `npm` (public registry, or `PACHI_NPM_REGISTRY`): no `.npmrc` written. With a URL (private registry or mirror) writes `.npmrc` with `@ilpachi:registry=<url>`. |
| `--dry-run` | List the files that would be generated and print the resolved `package.json`; nothing is written or installed. |
| `--link <path>` | Link `@ilpachi/pachifastquasar` (and sibling `@ilpachi/*` folders) with `link:`. |
| `--locale <code>` | Fixed language, `QCLI_APP_LOCALE`. |
| `--no-auto-dashboard` | `QCLI_APP_AUTO_DASHBOARD=false`. |
| `--no-envelope` | `QCLI_HTTP_ENVELOPE=false` (backend without the `{success,message,data}` envelope). |
| `--with <list>` | `settings`, `profile`, `widgets` (comma-separated). |
| `--no-install` | Skip `pnpm install`. |
| `--no-git` | Skip `git init`. |

## Examples

```bash
pachifq create my-app
pachifq create my-app --yes --no-install --no-git
pachifq create my-app --yes --dry-run
pachifq create my-app --yes --registry https://registry.example.com/npm/
pachifq create my-app --yes --locale it --with settings,profile
pachifq create my-app --yes --link ../pachifastquasar/packages/pachifastquasar
```

## Behavior

- The project name must be a plain name (no `..`, `/` or `\`); the folder is created in the current directory.
- By default no `.npmrc` is generated (packages come from public npm). With `--registry <url>` it contains only `@ilpachi:registry=<url>`; the token stays in the user `~/.npmrc`.
- Each registry dependency is checked with a read-only `npm view` (5 s timeout). If one is missing, `pnpm install` is skipped.
- With `profile`, the boot file calls `setPachiProfileUser(...)` with the authenticated user.
- At the end the command prints, as an optional step for pachifast backends, the `pachifast locale export` command for the backend error messages.
- With `--dry-run` the target folder is validated but nothing is written, no registry check is made, and no `git init` / `pnpm install` is run.
- A failure after the files were written removes the created folder (except when only `pnpm install` fails).
