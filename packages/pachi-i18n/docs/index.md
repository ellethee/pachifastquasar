# @ilpachi/pachi-i18n

i18n for Vue 3 / Quasar apps built on [vue-i18n](https://vue-i18n.intlify.dev) 11 (Composition API): instance
creation, language detection and persistence, per-package messages (no wiring in the app) and a language switcher.
Adding a language means adding a file.

## Features

- One call (`createPachiI18n`) creates the vue-i18n instance (`legacy: false`), picks the initial language, persists
  every change in `localStorage`, updates `<html lang>` and notifies an optional (possibly async) `onLocaleChange`
  callback, for example to load the Quasar language pack.
- Reusable packages ship their own messages and register them with `usePachiI18n(messages)`; the app can still
  override any text.
- `PachiLocaleSwitcher`: a Quasar button with a menu of the languages the app actually offers.
- Fixed-language mode for single-language deployments.
- ESM only, fully typed.

## Requirements

| Peer dependency | Range |
| --- | --- |
| `vue` | `^3.5` |
| `quasar` | `^2.20` |
| `vue-i18n` | `^11` |
| `@quasar/extras` | `^2` |

## Where to go next

- [Getting started](getting-started.md): install, create the instance, use it.
- [API reference](reference.md): options, exports and types.
- [Messages and locales](messages-and-locales.md): file convention, escaping, precedence, package messages.
- [Troubleshooting](troubleshooting.md).
