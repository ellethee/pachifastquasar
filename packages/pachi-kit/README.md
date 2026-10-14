# @ilpachi/pachi-kit

> **Status: beta.** Companion frontend of pachifast (Python backend by the same author). The API is evolving and may change between minor releases (0.x) — see CHANGELOG. ESM only. Provided "as is", without warranty of any kind (see [LICENSE](./LICENSE)). Not recommended for production use without pinning versions and testing against your pachifast backend.

A kit of generic [Quasar](https://quasar.dev) (Vue 3 / TypeScript) components, published as **one package** and imported
through **sub-paths**, one per area:

| Sub-path | Area | Main exports |
| --- | --- | --- |
| `@ilpachi/pachi-kit/ui` | UI building blocks | `PachiDatePicker`, `PachiConfirmDialog`, `PachiPopupEdit`, `PachiDuotoneIcon`, `matchesConfirmWord`, `passesRules` |
| `@ilpachi/pachi-kit/dialog` | Dialog | `PachiDialog`, `createPachiDialog`, `usePachiDialog`, `usePachiDialogToolbar`, `useEditorOptions` |
| `@ilpachi/pachi-kit/edit-dialog` | Edit dialog made of sections | `PachiEditDialog`, `useSection`, `useSectionsManager`, `sectionsRegistry` |
| `@ilpachi/pachi-kit/fields` | Declarative field-driven section | `FieldsSection`, `DynamicField`, `useRemoteSelect`, `setPachiFieldsHttp` |
| `@ilpachi/pachi-kit/table` | Server-side table with CRUD | `PachiTable2`, `usePachiTable2`, `setPachiAlovaFactory` |
| `@ilpachi/pachi-kit/uploader` | File uploader | `PachiUploader`, `usePachiUploader`, `defaultUploaderProps` |

Other small sub-paths: `@ilpachi/pachi-kit/ui/PachiPopupEdit.vue`, `@ilpachi/pachi-kit/dialog/composables/usePachiDialogToolbar`,
`@ilpachi/pachi-kit/dialog/composables/editor-defaults`.

> Part of the `@ilpachi` family of Vue 3 / Quasar packages. The MkDocs sources of the full documentation live in [`docs/`](./docs/index.md).

## Requirements

| Peer dependency | Range | Needed by |
| --- | --- | --- |
| `vue` | `^3.5.0` | all areas |
| `quasar` | `^2.20.0` | all areas |
| `@quasar/extras` | `^2.0.0` | all areas |
| `vue-i18n` | `^11.0.0` | all areas (used by `@ilpachi/pachi-i18n`) |
| `@ilpachi/pachi-i18n` | `>=0.1.0 <1.0.0` | all areas |
| `@ilpachi/use-alova` | `^2.1.1` | `fields` and `table` (optional peer) |
| `alova` | `^3.3.0` | `table` (optional peer) |

The app must create the i18n instance once with `createPachiI18n` (see the `@ilpachi/pachi-i18n` documentation).
`Dialog` and `Notify` Quasar plugins must be enabled (`quasar.config.ts` → `framework.plugins`) for the areas that open
dialogs or report errors.

## Installation

```bash
pnpm add @ilpachi/pachi-kit
# peers, if the app does not have them yet
pnpm add vue quasar @quasar/extras vue-i18n @ilpachi/pachi-i18n
# only for the `fields` and `table` areas
pnpm add @ilpachi/use-alova alova
```

The package is ESM only and ships TypeScript declarations for every sub-path. There is **no root entry**: component CSS
is injected by each sub-path bundle, so importing a single entry for everything would load every stylesheet. Import what
you use:

```ts
import { PachiDatePicker, PachiConfirmDialog } from '@ilpachi/pachi-kit/ui'
import { PachiDialog } from '@ilpachi/pachi-kit/dialog'
```

## Quick start

```vue
<template>
  <pachi-date-picker v-model="when" label="Date and time" />

  <q-btn color="primary" label="Open" @click="dlg?.show()" />
  <pachi-dialog ref="dlg" title="Confirm operation" :icon="mdiHelpCircle" rounded width="420px" @ok="onOk">
    <p>Do you want to proceed?</p>
  </pachi-dialog>
</template>

<script setup lang="ts">
import { ref, useTemplateRef } from 'vue'
import { mdiHelpCircle } from '@quasar/extras/mdi-v7'
import { PachiDatePicker } from '@ilpachi/pachi-kit/ui'
import { PachiDialog } from '@ilpachi/pachi-kit/dialog'

const when = ref('2026-10-05 09:30')
const dlg = useTemplateRef<InstanceType<typeof PachiDialog>>('dlg')

/** `ok` is awaitable: the dialog closes only when `onSuccess()` is called. */
async function onOk(payload: { onSuccess: () => void, onError: (e: unknown) => void }) {
  try {
    await save()
    payload.onSuccess()
  } catch (error) {
    payload.onError(error)
  }
}
</script>
```

A server-side table (needs `@ilpachi/use-alova`):

```vue
<template>
  <pachi-table2 url="/api/items" :columns="columns" use-col-actions @pt2:edit-item="onEdit" />
</template>

<script setup lang="ts">
import { PachiTable2 } from '@ilpachi/pachi-kit/table'
</script>
```

Each area is documented in its own page: [UI](./docs/ui.md), [Dialog](./docs/dialog.md),
[Edit dialog](./docs/edit-dialog.md), [Fields](./docs/fields.md), [Table](./docs/table.md),
[Uploader](./docs/uploader.md); setup details in [Installation](./docs/installation.md).

## Styling

All CSS variables are named `--pachi-*` and every class defined by the package starts with `pachi-`. Styles are not
`scoped`; the defaults are declared with `:where(...)` (zero specificity), so any definition in your project wins:

```css
:root { --pachi-red: #e11d48; }
body.body--dark { --pachi-surface: #111; }
```

## Internationalisation

Texts come from `@ilpachi/pachi-i18n` (`it`, `en`), one namespace per area: `pachiUi`, `pachiDialog`, `pachiEditDialog`,
`pachiEditDialogFields`, `pachiTable2`, `pachiUploader`. Define the same keys in the app to change a text or add a
language. Keys already defined by the app are never overwritten.

## Changelog

See [`CHANGELOG.md`](./CHANGELOG.md). The history of the packages merged into this one is kept in the repository
under `docs/history/`.

## Development

```bash
pnpm install
pnpm typecheck   # vue-tsc
pnpm test        # Vitest
pnpm build       # Vite library mode → dist/ (one entry per area)
```

## License

[MIT](./LICENSE) © ilPachi
