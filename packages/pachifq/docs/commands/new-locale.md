# pachifq new locale

```text
pachifq new locale <code>
pachifq new l <code>
```

```bash
pachifq new locale fr
pachifq new locale pt-BR
```

Creates, starting from `en.ts` (same keys, values to translate, `TODO: translate` comment):

- `src/i18n/locales/<code>.ts` of the app. If the app has neither `en.ts` nor `it.ts` (the shell
  messages live in the package), an empty draft is created where you redefine only the shell keys to
  translate; the others fall back to `en`.
- `src/features/*/locales/<code>.ts` for every feature.
- `packages/*/src/locales/<code>.ts` only if the app has its own `packages/` folder.

Packages in `node_modules` (the shell included) are never modified: add the keys with the same
namespace in `src/i18n/locales/<code>.ts` (app messages win). Existing files are never overwritten.
After translating, restart the dev server: the language appears in the switcher.

Add a language in three steps: run the command, translate the values, restart the dev server.
