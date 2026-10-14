# API reference

## `createPachiI18n(options)`

Creates the vue-i18n instance, stores it as a singleton and returns it; install it with `app.use()`.

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `messages` | `PachiMessageMap` | required | Messages per language, `{ it: {...}, en: {...} }`. The keys are the languages offered to the user. |
| `defaultLocale` | `string` | `'it'` | Language used when nothing better is found. |
| `fallbackLocale` | `string` | `'en'` | vue-i18n fallback for missing keys. |
| `storageKey` | `string` | `'pachi-prefs-locale'` | `localStorage` key of the saved choice. |
| `fixedLocale` | `string` | `undefined` | Locks the app to one language (see below). |
| `initialLocale` | `string` | `undefined` | Forces the initial language. |
| `onLocaleChange` | `(code: string) => void \| Promise<void>` | `undefined` | Called with the initial language and on every change. |

### Fixed language

`fixedLocale: 'it'` (for example read from an environment variable) locks the app to one language: no detection, no
persistence, a single message set registered and `availableLocales` with one element, so the switcher is pointless.
The code is resolved like `matchLocale` does (`pt` becomes `pt-BR`); if nothing matches, `defaultLocale` is used and a
warning is logged.

### `onLocaleChange`

Called with the initial language and on every change; it may be async (for example to load a Quasar language pack).
Calls are serialized and, when the language changes quickly, intermediate languages are skipped: the last one always
wins. Errors are logged with `console.error` and never propagate.

## Exports

| Export | Kind | Description |
| --- | --- | --- |
| `createPachiI18n(options)` | function | Creates the vue-i18n instance and stores it as a singleton. |
| `getPachiI18n()` | function | The instance, or `undefined` if not created. |
| `disposePachiI18n()` | function | Stops the language watcher and clears the global instance (tests, HMR). `createPachiI18n` calls it first, so only one instance exists at a time. |
| `requirePachiI18n()` | function | The instance; throws if not created. |
| `usePachiI18n(messages)` | composable | Registers package messages, returns `{ t, locale }`. Call it inside `setup()`. |
| `useLocale()` | composable | Returns `{ locale, availableLocales, setLocale, labelOf }`, usable outside `setup()` once the instance exists. |
| `pachiT(key, params?)` | function | Translation outside `setup()`; returns the key when i18n is not created. |
| `matchLocale(requested, available)` | function | Exact (case-insensitive), then base language, then variant; `undefined` if nothing matches. |
| `deepMerge(base, override)` | function | Deep merge of message trees; arguments are not mutated, `override` wins. |
| `collectLocales(globResult)` | function | Builds `{ code: messages }` from an `import.meta.glob` result. |
| `PachiLocaleSwitcher` | component | Language menu button (`mdiTranslate`). |

Types: `PachiMessages<T>`, `PachiLocaleMessages`, `PachiMessageMap`, `CreatePachiI18nOptions`, `PachiI18n`,
`UseLocale`.

## `useLocale()`

| Member | Description |
| --- | --- |
| `locale` | Current language. |
| `availableLocales` | Languages offered by the app. |
| `setLocale(code)` | Changes the language; unavailable codes are ignored. |
| `labelOf(code)` | Native name of the language (`Intl.DisplayNames`), falling back to the code. |

## `usePachiI18n(messages)`

Registers the messages of a reusable package once per instance, language and namespace and never overwrites keys the
app already defines. Only languages already present in the instance are registered. See
[Messages and locales](messages-and-locales.md#messages-of-a-reusable-package).

## `collectLocales(globResult)`

The language code is the file name (`pt-BR.ts` gives `pt-BR`); `.ts`, `.js` and `.json` files are accepted; files with
the same code are deep-merged.

## `PachiLocaleSwitcher`

A Quasar button with a menu of `availableLocales`. Any attribute is forwarded to the underlying `q-btn`.
