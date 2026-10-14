# Getting started

## Installation

```bash
pnpm add @ilpachi/pachi-i18n
# peers, if the app does not have them yet
pnpm add vue quasar @quasar/extras vue-i18n
```

Messages are plain (non-precompiled) TypeScript objects, so with `@intlify/unplugin-vue-i18n` set
`runtimeOnly: false`.

## Collect the messages

```ts
// src/i18n/index.ts
import { collectLocales } from '@ilpachi/pachi-i18n'

export default collectLocales(import.meta.glob('./locales/*.ts', { eager: true, import: 'default' }))
```

`it.ts` is the reference language; the others are typed against it, so a missing key is a compile error:

```ts
// src/i18n/locales/it.ts
export default { common: { save: 'Salva' } }
```

```ts
// src/i18n/locales/en.ts
import type { PachiMessages } from '@ilpachi/pachi-i18n'
import type it from './it'

const en: PachiMessages<typeof it> = { common: { save: 'Save' } }
export default en
```

## Create the instance

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

## Use it

In components, with vue-i18n:

```vue
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
const { t } = useI18n()
</script>
<template><q-btn :label="t('common.save')" /></template>
```

Outside `setup()` (stores, helpers, Notify calls) use `pachiT`:

```ts
import { pachiT } from '@ilpachi/pachi-i18n'

pachiT('common.goHome')               // plain key
pachiT('errors.limit', { max: 10 })   // named parameters: "{max}"
```

## Language switcher

```vue
<pachi-locale-switcher />
```

It lists `availableLocales` with the native name of each language (`Intl.DisplayNames`), marks the active one and
forwards any attribute to the underlying `q-btn`. Its own texts (`pachiI18n.language`, `pachiI18n.changeLanguage`)
exist in `it` and `en` and can be overridden by the app.

## Initial language

Order of detection (first match wins):

1. the value stored under `storageKey` in `localStorage`;
2. `navigator.languages`: exact match, then base language (`it-IT` becomes `it`), then a variant (`pt` becomes `pt-BR`);
3. `defaultLocale`.

`initialLocale` forces the language (it ignores storage and browser, useful in tests). The offered languages are the
keys of `messages`.
