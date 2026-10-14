# Installation

```bash
pnpm add @ilpachi/pachi-kit
# peers, if the app does not have them yet
pnpm add vue quasar @quasar/extras vue-i18n @ilpachi/pachi-i18n
# only for the `fields` and `table` areas
pnpm add @ilpachi/use-alova alova
```

The package is ESM only and ships TypeScript declarations for every sub-path.

## Peer dependencies

| Peer dependency | Range | Needed by |
| --- | --- | --- |
| `vue` | `^3.5.0` | all areas |
| `quasar` | `^2.20.0` | all areas |
| `@quasar/extras` | `^2.0.0` | all areas (SVG icons) |
| `vue-i18n` | `^11.0.0` | all areas (used by `@ilpachi/pachi-i18n`, not imported directly) |
| `@ilpachi/pachi-i18n` | `>=0.1.0 <1.0.0` | all areas (translated labels `it`, `en`) |
| `@ilpachi/use-alova` | `^2.1.1` | `fields` and `table` (optional peer: install it only if you use them) |
| `alova` | `^3.3.0` | `table` (optional peer) |

## Sub-path imports

There is no root entry: importing `@ilpachi/pachi-kit` is an error by design. The CSS of the components is injected by
the JavaScript bundle (nothing to import), so a single entry importing every area would load every stylesheet. Import
what you use:

```ts
import { PachiDatePicker, PachiConfirmDialog } from '@ilpachi/pachi-kit/ui'
import { PachiDialog, usePachiDialog } from '@ilpachi/pachi-kit/dialog'
import { PachiEditDialog, useSection } from '@ilpachi/pachi-kit/edit-dialog'
import { FieldsSection } from '@ilpachi/pachi-kit/fields'
import { PachiTable2 } from '@ilpachi/pachi-kit/table'
import { usePachiUploader } from '@ilpachi/pachi-kit/uploader'
```

| Sub-path | Content |
| --- | --- |
| `@ilpachi/pachi-kit/ui` | UI building blocks |
| `@ilpachi/pachi-kit/ui/PachiPopupEdit.vue` | `PachiPopupEdit` alone (small entry) |
| `@ilpachi/pachi-kit/dialog` | dialog component, `createPachiDialog` / `usePachiDialog`, editor defaults, toolbar key |
| `@ilpachi/pachi-kit/dialog/composables/usePachiDialogToolbar` | `usePachiDialogToolbar` and `PACHI_DIALOG_TOOLBAR_KEY` alone |
| `@ilpachi/pachi-kit/dialog/composables/editor-defaults` | `defaultEditorOptions`, `useEditorOptions` alone |
| `@ilpachi/pachi-kit/edit-dialog` | edit dialog, sections, `useSection`, `useSectionsManager`, registry |
| `@ilpachi/pachi-kit/fields` | `FieldsSection`, `DynamicField`, `useRemoteSelect`, HTTP injection |
| `@ilpachi/pachi-kit/table` | `PachiTable2`, `usePachiTable2`, alova factory, types |
| `@ilpachi/pachi-kit/uploader` | `PachiUploader`, `usePachiUploader`, defaults and helpers |

Some areas build on others (they are in the same package, so there is nothing more to install): `fields` uses
`edit-dialog` (`useSection`) and `ui` (`PachiDatePicker`); `uploader` uses `dialog` (toolbar portal) and `ui`
(`PachiPopupEdit`).

## Internationalisation

Every area registers its own messages through `@ilpachi/pachi-i18n` under its own namespace. Create the i18n
instance once in the app (see the `@ilpachi/pachi-i18n` documentation) with `createPachiI18n`.

| Area | Namespace |
| --- | --- |
| `ui` | `pachiUi` |
| `dialog` | `pachiDialog` |
| `edit-dialog` | `pachiEditDialog` |
| `fields` | `pachiEditDialogFields` |
| `table` | `pachiTable2` |
| `uploader` | `pachiUploader` |

## Quasar plugins

`Dialog` and `Notify` must be enabled in `quasar.config.ts` (`framework.plugins`) for the areas that open dialogs or
report errors (`ui` confirm dialog, `dialog`, `edit-dialog`, `table`, `fields`); each area page says what it needs.

## Styling

All CSS variables are named `--pachi-*` and every class starts with `pachi-`; styles are not `scoped` and the defaults
have zero specificity (`:where`), so any definition in your project wins.
