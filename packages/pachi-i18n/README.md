# @ilpachi/pachi-i18n

> **Status: beta.** Companion frontend of pachifast (Python backend by the same author). The API is evolving and may change between minor releases (0.x) — see CHANGELOG. ESM only. Provided "as is", without warranty of any kind (see [LICENSE](./LICENSE)). Not recommended for production use without pinning versions and testing against your pachifast backend.

i18n for Vue 3 / Quasar apps built on [vue-i18n](https://vue-i18n.intlify.dev) 11 (Composition API): instance creation, language detection and persistence, per-package messages (no wiring in the app) and a language switcher. Adding a language means adding a file.

## Features

- One call (`createPachiI18n`) creates the vue-i18n instance (`legacy: false`), picks the initial language, persists every change in `localStorage`, updates `<html lang>` and notifies an optional (possibly async) `onLocaleChange` callback (e.g. to load the Quasar language pack).
- Reusable packages ship their own messages and register them with `usePachiI18n(messages)`; the app can still override any text.
- `PachiLocaleSwitcher`: a Quasar button with a menu of the languages the app actually offers.
- Fixed-language mode for single-language deployments.
- ESM only, fully typed.

## Installation

Peer dependencies: `vue` ^3.5, `quasar` ^2.20, `vue-i18n` ^11, `@quasar/extras` ^2.

Messages are plain (non-precompiled) TypeScript objects, so with `@intlify/unplugin-vue-i18n` set `runtimeOnly: false`.

## Setup

```ts
// src/i18n/index.ts
import { collectLocales } from '@ilpachi/pachi-i18n'

export default collectLocales(import.meta.glob('./locales/*.ts', { eager: true, import: 'default' }))
```

```ts
// src/boot/i18n.ts (Quasar boot file)
import { defineBoot } from '#q-app/wrappers'
import { createPachiI18n } from '@ilpachi/pachi-i18n'
import messages from 'src/i18n'

export default defineBoot(({ app }) => {
  app.use(createPachiI18n({
    messages,
    onLocaleChange: (code) => { /* e.g. load the Quasar language pack */ },
  }))
})
```

Language files: `it.ts` is the reference language, the others are typed against it, so a missing key is a compile error.

```ts
// src/i18n/locales/it.ts
export default { common: { save: 'Salva' } }

// src/i18n/locales/en.ts
import type { PachiMessages } from '@ilpachi/pachi-i18n'
import type it from './it'

const en: PachiMessages<typeof it> = { common: { save: 'Save' } }
export default en
```

Use it in components and, outside `setup()`, with `pachiT`:

```vue
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
const { t } = useI18n()
</script>
<template><q-btn :label="t('common.save')" /></template>
```

```ts
import { pachiT } from '@ilpachi/pachi-i18n'
pachiT('common.goHome')                 // e.g. in a store or a Notify call
pachiT('errors.limit', { max: 10 })     // named parameters: "{max}"
```

### Language switcher

```vue
<pachi-locale-switcher />
```

It lists `availableLocales` with the native name of each language (`Intl.DisplayNames`), marks the active one, and forwards any attribute to the underlying `q-btn`. Its own texts (`pachiI18n.language`, `pachiI18n.changeLanguage`) exist in `it` and `en` and can be overridden by the app.

## Initial language

Order of detection (first match wins): value stored under `storageKey` in `localStorage`, then `navigator.languages` (exact match, then base language `it-IT` -> `it`, then a variant `pt` -> `pt-BR`), then `defaultLocale`. `initialLocale` forces the language (ignores storage and browser, useful in tests). The offered languages are the keys of `messages`.

The i18n is a global singleton (on `globalThis`) designed for SPAs: SSR is not supported. Package messages are matched to the app languages with `matchLocale` (app `en-US` receives the package `en`), and languages added at runtime are filled the next time `usePachiI18n` runs. Always install the last instance created with `app.use(i18n)`.


## Options (`createPachiI18n`)

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

`fixedLocale: 'it'` (for example from an environment variable) locks the app to one language: no detection, no persistence, a single message set registered and `availableLocales` with one element (so the switcher is pointless). The code is resolved like `matchLocale` does (`pt` -> `pt-BR`); if nothing matches, `defaultLocale` is used and a warning is logged.

### `onLocaleChange`

Called with the initial language and on every change; it may be async (e.g. to load a Quasar language pack). Calls are serialized and, when the language changes quickly, intermediate languages are skipped: the last one always wins. Errors are logged with `console.error` and never propagate.

## Messages of a reusable package

A package ships `src/locales/<code>.ts` files, each exporting an object with its own top-level namespace, plus an index that collects them:

```ts
// src/locales/it.ts
export default { miaLib: { title: 'Titolo' } }

// src/locales/index.ts
import { collectLocales } from '@ilpachi/pachi-i18n'
export const messages = collectLocales(import.meta.glob(['./*.ts', '!./index.ts'], { eager: true, import: 'default' }))
```

```vue
<script setup lang="ts">
import { usePachiI18n } from '@ilpachi/pachi-i18n'
import { messages } from '../locales'

const { t } = usePachiI18n(messages)   // t('miaLib.title')
</script>
```

`usePachiI18n(messages)` registers the messages once per instance, language and namespace and never overwrites keys the app already defines (so the app can redefine the package texts). Only languages already present in the instance are registered: the others, the fallback included, are ignored and do not appear in the switcher. To add a language to a package, add a `locales/<code>.ts` file. It must be called inside `setup()` (it uses `useI18n`).

## Exports

| Export | Kind | Description |
| --- | --- | --- |
| `createPachiI18n(options)` | function | Creates the vue-i18n instance and stores it as a singleton; install it with `app.use()`. |
| `getPachiI18n()` | function | The instance, or `undefined` if not created. |
| `disposePachiI18n()` | function | Stops the language watcher and clears the global instance (tests, HMR). `createPachiI18n` calls it first, so only one instance exists at a time. |
| `requirePachiI18n()` | function | The instance; throws if not created. |
| `usePachiI18n(messages)` | composable | Registers package messages, returns `{ t, locale }`. |
| `useLocale()` | composable | Returns `{ locale, availableLocales, setLocale, labelOf }` (usable outside `setup()` once the instance exists). `setLocale` ignores unavailable codes; `labelOf(code)` is the native language name, falling back to the code. |
| `pachiT(key, params?)` | function | Translation outside `setup()`; returns the key when i18n is not created. |
| `matchLocale(requested, available)` | function | Exact (case-insensitive), then base language, then variant; `undefined` if nothing matches. |
| `deepMerge(base, override)` | function | Deep merge of message trees (arguments are not mutated, `override` wins). |
| `collectLocales(globResult)` | function | `{ code: messages }` from an `import.meta.glob` result; the code is the file name (`pt-BR.ts` -> `pt-BR`; `.ts`, `.js` and `.json`); files with the same code are deep-merged. |
| `PachiLocaleSwitcher` | component | Language menu button (`mdiTranslate`). |
| `PachiMessages<T>`, `PachiLocaleMessages`, `PachiMessageMap`, `CreatePachiI18nOptions`, `PachiI18n`, `UseLocale` | types | |

## Backend contract

The package does not talk to a backend. In apps built on `@ilpachi/pachifastquasar`, backend error responses `{ "detail": [{ "loc": [], "msg": "", "type": "", "code": "", "params": {} }] }` are translated by looking up the `code` under the key `errors.codes.<code>` (with `params` as named parameters). Those messages are generated by the backend into JSON files per language and combined with the app messages; `deepMerge` is the helper for that kind of composition (generated messages first, app overrides last).

```ts
import { deepMerge, pachiT } from '@ilpachi/pachi-i18n'

const merged = deepMerge(generated.it, overrides.it)
const text = pachiT(`errors.codes.${detail.code}`, detail.params)
```

## Troubleshooting

- **`@`, `{`, `}` or `|` in a message break compilation or print oddly**: they are special characters in vue-i18n messages. Escape them as literals: `{'@'}`, `{'{'}`, `{'}'}`, `{'|'}` (for example `'info{\'@\'}example.com'`).
- **Messages are not compiled at runtime / warnings about the message compiler**: set `runtimeOnly: false` in `@intlify/unplugin-vue-i18n`, because messages are TypeScript objects, not precompiled resources.
- **In Vite dev, duplicated copies of `quasar` or `vue`** (the package pre-bundled with its own copy, "Quasar not installed" or components that do not render): the package components use the `$q` and the Quasar instance of the app. Make Vite resolve a single copy, for example with `resolve.dedupe: ['vue', 'vue-i18n', 'quasar']` in the Vite config, and exclude the package from pre-bundling when linking it locally.
- **`@ilpachi/pachi-i18n: call createPachiI18n() ... before using it`**: `useLocale`, `usePachiI18n` or `PachiLocaleSwitcher` ran before the boot file created the instance; install `createPachiI18n` first (`pachiT` just returns the key in that case).
- **A package language does not appear in the switcher**: only languages in the app `messages` are offered; add at least a (possibly partial) file for that language in the app.
- **The language does not persist**: `localStorage` may be unavailable (private mode); the choice then lasts only for the session. With `fixedLocale` nothing is persisted by design.

## Development

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm build
```

Publishing is done with `npm publish`, not `pnpm publish`.

## Changelog

See [CHANGELOG.md](CHANGELOG.md). Latest: 0.1.2 (documentation); 0.1.1 fixed the language fallback registration, serialized `onLocaleChange` and switcher accessibility.

## License

MIT, see [LICENSE](LICENSE).
