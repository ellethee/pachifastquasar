# pachifq new feature

```text
pachifq new feature <name> [options]
pachifq new f <name> [options]
```

Run it from the root of an app. Creates `src/features/<name>/`:

```text
routes.ts
pages/<Name>IndexPage.vue
stores/use-<name>-store.ts
services/<name>-api.ts
types/<name>.d.ts
components/
locales/it.ts, locales/en.ts
```

The service uses `getUseAlovaInstance()({ url: '/api/<name>' }).alova`, so authentication,
token refresh, overlay and errors are handled by the app HTTP client. Routes use
`titleKey` / `descriptionKey` with literal `title` / `description` fallbacks.

## Options

| Option | Description |
| --- | --- |
| `--title <string>` | Title in dashboard and menu. |
| `--description <string>` | Description. |
| `--icon <string>` | Export of `@quasar/extras/mdi-v7`, validated against the real list. |
| `--order <number>` | Dashboard order, default `99`. |
| `--children <list>` | Kebab-case child routes, one placeholder page each. |
| `--yes` | No prompts (needs `--title`). |

## Examples

```bash
pachifq new feature invoices
pachifq new f invoices --title "Invoices" --description "Invoice management" --icon mdiFileDocumentOutline --order 10 --yes
pachifq new f reports --title "Reports" --children billing,archive --yes
```

## Validation

- Name: kebab-case; `auth` and `login` are reserved.
- Duplicate child routes, or children colliding with the feature i18n keys (such as `title`), are rejected.
- Icon: an unknown export (for example `mdiLanApi`) is rejected with similar suggestions
  (`Did you mean: mdiApi, mdiLan, ...`) and nothing is written. If `@quasar/extras` cannot be
  resolved from the app (dependencies not installed yet) only the `mdi...` syntax is checked and a warning is printed.
