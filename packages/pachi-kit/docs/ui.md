# UI building blocks

A small kit of reusable UI building blocks for [Quasar](https://quasar.dev) (Vue 3): a date and time input
(`PachiDatePicker`), a "type the word to confirm" dialog (`PachiConfirmDialog`), an inline popup editor with
validation (`PachiPopupEdit`), a two-tone SVG icon (`PachiDuotoneIcon`) and two small pure helpers
(`matchesConfirmWord`, `passesRules`).



## Requirements

Install the package and its peers as described in [Installation](installation.md). `PachiConfirmDialog` is opened through Quasar's `Dialog` plugin, so enable it in `quasar.config.ts` (`framework.plugins`).

## Quick start

```ts
import { PachiDatePicker, PachiConfirmDialog, PachiPopupEdit, PachiDuotoneIcon } from '@ilpachi/pachi-kit/ui'
import type { DuotoneIcon, PachiRule } from '@ilpachi/pachi-kit/ui'
import { matchesConfirmWord, passesRules } from '@ilpachi/pachi-kit/ui'
```

```vue
<template>
  <!-- date and time input -->
  <pachi-date-picker v-model="when" label="Date and time" />

  <!-- inline editing of a value -->
  <span>{{ name }}</span>
  <pachi-popup-edit v-model="name" title="Edit name" :rules="[v => !!v || 'Required']" />

  <!-- two-tone icon -->
  <pachi-duotone-icon :icon="{ primary: mdiHomeOutline, secondary: mdiHome }" :size="40" color="var(--q-primary)" />

  <q-btn color="negative" label="Delete" @click="askDelete" />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useQuasar } from 'quasar'
import { mdiHome, mdiHomeOutline } from '@quasar/extras/mdi-v7'
import { PachiConfirmDialog, PachiDatePicker, PachiDuotoneIcon, PachiPopupEdit } from '@ilpachi/pachi-kit/ui'

const $q = useQuasar()
const when = ref('2026-10-05 09:30')
const name = ref('Alpha')

function askDelete() {
  $q.dialog({
    component: PachiConfirmDialog,
    componentProps: { title: 'Delete project', description: 'This cannot be undone.' },
  })
    .onOk(() => console.log('confirmed'))
    .onCancel(() => console.log('cancelled'))
}
</script>
```

## PachiDatePicker

A `q-input` with two icon buttons in its `append` slot: a calendar (`q-date` in a `q-popup-proxy`) and a clock
(`q-time`, 24 h format). Both pickers edit the **same string**, formatted with `mask`. Any attribute or prop that is not
listed below (`label`, `dense`, `clearable`, `hint`, `rules`, `lazy-rules`, `error`,
`error-message`, ...) falls through to the `q-input`.

```vue
<pachi-date-picker v-model="when" label="Date and time" />
<pachi-date-picker v-model="day" mask="YYYY-MM-DD" label="Date" />
<pachi-date-picker v-model="it" mask="DD/MM/YYYY HH:mm" label="DD/MM/YYYY HH:mm" />
<pachi-date-picker v-model="v" :auto-close="false" />
<pachi-date-picker v-model="v" :rounded="false" :outlined="false" dense clearable hint="hint" />
<pachi-date-picker v-model="v" :rules="[(x: string) => !!x || 'Required']" lazy-rules />
```

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `modelValue` (`v-model`) | `string \| undefined` | | The formatted date/time string. |
| `mask` | `string` | `'YYYY-MM-DD HH:mm'` | Quasar date mask used by both `q-date` and `q-time`. |
| `autoClose` | `boolean` | `true` | Closes the **date** popup as soon as a date is chosen. The time popup always has its own close button. |
| `rounded` | `boolean` | `true` | Rounded `q-input`; pass `:rounded="false"` for square corners. |
| `outlined` | `boolean` | `true` | Outlined `q-input`; pass `:outlined="false"` for the standard style. |
| `readonly` | `boolean` | `false` | Read-only input; the calendar and clock buttons are disabled. |
| `disable` | `boolean` | `false` | Disabled input and buttons. |
| `format24h` | `boolean` | `true` | 24-hour clock in the time popup; `false` for AM/PM. |

There are no events other than the standard `update:modelValue`, and no slots or exposed members.
The calendar and clock buttons have translated `aria-label`s, and the date popup carries the class
`pachi-date-picker-menu` (its radius follows `--pachi-card-r`).

## PachiConfirmDialog

A destructive-action confirmation: the user must type a *confirmation word* before the submit button is enabled.
It is meant to be opened with `Dialog.create({ component, componentProps })` (or `$q.dialog(...)`).

```ts
$q.dialog({
  component: PachiConfirmDialog,
  componentProps: {
    title: 'Delete project',
    description: 'All files will be removed.',
    warning: 'This operation cannot be undone.',   // optional amber box
    confirmWord: 'PRODUZIONE',                      // default DELETE / ELIMINA by language
  },
})
  .onOk(() => remove())
  .onCancel(() => {})
  .onDismiss(() => {})
```

A non-destructive confirmation (custom button and header texts):

```ts
componentProps: {
  title: 'Deploy to production',
  description: 'The current build will go live.',
  submitLabel: 'Deploy',
  metaLabel: 'confirm · release',
  confirmWord: 'OK',
}
```

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `title` | `string` | **required** | Heading of the dialog. |
| `description` | `string` | **required** | Explanation under the heading. |
| `warning` | `string` | `''` | Text of the amber warning box; the box is hidden when empty. |
| `confirmWord` | `string` | `DELETE` (`en`) / `ELIMINA` (`it`) | The word to type. |
| `submitLabel` | `string` | `Delete` / `Elimina` | Text of the submit button. |
| `metaLabel` | `string` | `confirm · destructive action` / `azione distruttiva` | Small line above the title. |
| `tone` | `'danger' \| 'warning' \| 'info'` | `danger` | Colour of the accent, icon and submit button (red, amber, blue). |

Behaviour: the input is focused on open; typing the word (surrounding spaces are ignored, comparison is exact and
case-sensitive) enables the submit button; **Enter** confirms when the word is correct; **Esc**, a backdrop click and
**Cancel** close the dialog without confirming: Quasar then calls `onCancel` (and always `onDismiss`). Confirming calls
`onOk` (no payload). The dialog uses the
Quasar dialog-plugin contract (`ok`, `hide` events handled by `useDialogPluginComponent`); there are no slots.

## PachiPopupEdit

Inline editing with `q-popup-edit`: place it **inside** the element to edit (a click on the parent opens the popup).
It has a `v-model`, and unlisted attributes fall through to the `q-popup-edit`.

```vue
<div class="cursor-pointer">
  <span>{{ email }}</span>
  <pachi-popup-edit
    v-model="email"
    type="email"
    title="Edit e-mail"
    :rules="[required, v => String(v).includes('@') || 'Invalid e-mail']"
  />
</div>
```

```ts
function required(v: unknown): true | string {
  return (v !== null && v !== undefined && String(v).trim() !== '') || 'Required'
}
```

In a table cell (also available as a separate sub-path import of the same component):

```vue
<q-td :props="props">
  {{ props.row.name }}
  <pachi-popup-edit v-model="props.row.name" />
</q-td>
```

```ts
import PachiPopupEdit from '@ilpachi/pachi-kit/ui/PachiPopupEdit.vue'
```

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `modelValue` (`v-model`) | `unknown` | | The edited value (`string` or `number`). |
| `type` | `'text' \| 'number' \| 'password' \| 'email' \| 'tel' \| 'url' \| 'search' \| 'textarea'` | `'text'` | Input type. |
| `title` | `string` | | Title shown at the top of the popup (`title` of `q-popup-edit`). |
| `rules` | `PachiRule[]` | | `q-input`-style rules. The message is shown in the field and the confirm button (and **Enter**) is blocked until every rule passes. Only **synchronous** rules are supported. |

The popup contains a `q-input` (dense, autofocus, with a character counter) and two buttons with translated
`aria-label`s: *cancel* (discard) and *confirm* (disabled while the value is invalid or unchanged). **Enter**
confirms; with `type="textarea"` Enter inserts a new line and **Ctrl+Enter** (or **Cmd+Enter**) confirms. The
component has no custom events beyond `update:modelValue`.

## PachiDuotoneIcon

A 24 x 24 inline SVG made of two stacked paths: the `secondary` path with reduced opacity underneath and the `primary`
path at full opacity above. The SVG is `aria-hidden` unless you pass `title`, which exposes it as `role="img"` with that accessible name.

```vue
<pachi-duotone-icon :icon="{ primary: mdiStarOutline, secondary: mdiStar }" />
<pachi-duotone-icon :icon="heart" color="var(--q-negative)" :size="56" :secondary-opacity="0.25" />
```

```ts
import { mdiHeart, mdiHeartOutline } from '@quasar/extras/mdi-v7'
import type { DuotoneIcon } from '@ilpachi/pachi-kit/ui'
const heart = { primary: mdiHeartOutline, secondary: mdiHeart } satisfies DuotoneIcon
```

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `icon` | `DuotoneIcon` | **required** | `{ primary: string, secondary: string }`: SVG path data (24 x 24 viewBox), for example `@quasar/extras/mdi-v7` constants. |
| `size` | `string \| number` | `24` | Width and height of the `<svg>`. |
| `color` | `string` | `'currentColor'` | CSS colour applied to both paths. |
| `secondaryOpacity` | `number` | `0.4` | Opacity of the secondary path (`0` hides it, `1` makes it solid). |

The `DuotoneIcon` type is structurally identical to the one in `@ilpachi/pachifastquasar` (`src/extras/pachi-icons`),
so values are interchangeable. In apps that use this package, import both the component and the type from
`@ilpachi/pachi-kit/ui`: the *component* exists only here.

## Helper functions

```ts
import { matchesConfirmWord, passesRules } from '@ilpachi/pachi-kit/ui'
import type { PachiRule } from '@ilpachi/pachi-kit/ui'
```

| Export | Signature | Description |
| --- | --- | --- |
| `matchesConfirmWord` | `(typed: string, word: string) => boolean` | `true` when `typed.trim() === word`. Exact and case-sensitive; leading and trailing spaces of `typed` are ignored; an empty `word` never matches. |
| `passesRules` | `(rules: readonly PachiRule[] \| undefined, value) => boolean` | Same semantics as `q-input`: `false` or a message string makes it `false`; `true`, `undefined`, `null` and a Promise (ignored) are valid. |
| `PachiRule` | `(val: string \| number \| null \| undefined) => boolean \| string` | A rule as in `q-input`: `true` = valid, `false` or a string message = invalid. |
| `DuotoneIcon` | `{ primary: string, secondary: string }` | Type of the `icon` prop of `PachiDuotoneIcon`. |

With `rules` undefined or empty `passesRules` returns `true`. Live example of `matchesConfirmWord` (from the demo app):

```vue
<q-input v-model="typed" dense outlined label="Type the word" />
<code>matchesConfirmWord(typed, 'ELIMINA') = {{ matches }}</code>
```

```ts
const matches = computed(() => matchesConfirmWord(typed.value, 'ELIMINA'))
```

## Exports

| Export | Kind |
| --- | --- |
| `PachiDatePicker`, `PachiConfirmDialog`, `PachiPopupEdit`, `PachiDuotoneIcon` | components |
| `matchesConfirmWord`, `passesRules` | functions |
| `DuotoneIcon`, `PachiRule` | types |
| `@ilpachi/pachi-kit/ui/PachiPopupEdit.vue` | sub-path: the same `PachiPopupEdit`, separately importable (used by `@ilpachi/pachi-kit/uploader`) |

## Styling

All CSS variables are named `--pachi-*` and every class defined by the package starts with `pachi-`. Styles are not
`scoped`. The defaults (`src/styles/theme-defaults.scss`, loaded by the barrel) are declared with `:where(...)`, i.e.
zero specificity, so any definition in your project wins:

```css
:root { --pachi-red: #e11d48; }
body.body--dark { --pachi-surface: #111; }
```

The package works standalone: dark theme by default, light theme under Quasar's `body.body--light`, compact density
under `:root[data-density='compact']`.

Variables read by the components:

| Variable | Default (dark) | Used by |
| --- | --- | --- |
| `--pachi-surface` | `#10141b` | Confirm dialog background, key-cap background |
| `--pachi-surface-2` | `#161b23` | Confirm dialog footer |
| `--pachi-border` | `#1f2530` | Footer border, key-cap border |
| `--pachi-border-hi` | `#2a3140` | Confirm dialog outline |
| `--pachi-ink`, `--pachi-ink-2` | `#e6eaf2`, `#b7becc` | Title, warning text |
| `--pachi-muted`, `--pachi-faint` | `#7b8494`, `#525b6b` | Description, meta line, shortcut hint |
| `--pachi-red`, `--pachi-red-soft` | `#f87171`, `rgba(248, 113, 113, 0.14)` | Accent line, icon, confirmation word, submit button |
| `--pachi-amber`, `--pachi-amber-soft` | `#fbbf24`, `rgba(251, 191, 36, 0.14)` | Warning box |
| `--pachi-font`, `--pachi-mono` | Geist stacks | Texts / confirmation word and input |
| `--pachi-card-r` | `12px` | Date picker popup radius |

Optional variables with a built-in fallback (not defined by default):

| Variable | Fallback | Used for |
| --- | --- | --- |
| `--pachi-shadow` | `rgba(0, 0, 0, 0.6)` | Confirm dialog drop shadow |
| `--pachi-shadow-edge` | `rgba(0, 0, 0, 0.4)` | Confirm dialog outer ring |
| `--pachi-red-border` | `rgba(248, 113, 113, 0.2)` | Border of the icon tile |
| `--pachi-amber-border` | `rgba(251, 191, 36, 0.33)` | Border of the warning box |
| `--pachi-on-red` | `#fff` | Submit button text colour |

The other shared defaults (`--pachi-bg`, `--pachi-surface-3`, `--pachi-accent*`, `--pachi-blue*`, `--pachi-green`,
`--pachi-title-font`, `--pachi-row-h`, `--pachi-pad`) are declared for consistency with the other `@ilpachi` packages.

Classes: `pachi-date-picker`, `pachi-date-picker-menu`, and the BEM block `pachi-confirm-dialog` with its elements
`__accent`, `__body`, `__header`, `__icon`, `__text`, `__meta`, `__title`, `__desc`, `__warning`, `__warning-icon`,
`__warning-text`, `__confirm`, `__confirm-label`, `__confirm-word`, `__input`, `__footer`, `__shortcut`,
`__footer-actions`, `__btn`, `__submit`. Override them with a selector of equal or higher specificity loaded later.

## Internationalisation

Texts come from `@ilpachi/pachi-i18n` under the `pachiUi` namespace (`it`, `en`). Define the same keys in the app to
change a text or add a language:

| Key | English |
| --- | --- |
| `pachiUi.confirmDialog.meta` | confirm · destructive action |
| `pachiUi.confirmDialog.typePrefix` / `typeSuffix` | Type / to confirm: |
| `pachiUi.confirmDialog.confirmWord` | DELETE |
| `pachiUi.confirmDialog.submit` | Delete |
| `pachiUi.confirmDialog.cancel` | Cancel |
| `pachiUi.confirmDialog.escKey` / `escCancel` | Esc / cancel |
| `pachiUi.confirmDialog.placeholder` | — |
| `pachiUi.confirmDialog.inputLabel` | Type {word} to confirm |
| `pachiUi.datePicker.openDate` / `openTime` / `close` | Pick a date / Pick a time / Close |
| `pachiUi.popupEdit.cancel` / `confirm` | Cancel edit / Confirm edit |

Keys already defined by the app are never overwritten. Only languages already present in the app are registered.
In vue-i18n messages the characters `{ } @ |` are special: write a literal `@` as `{'@'}`.

## Troubleshooting

**`Dialog.create is not a function` / `$q.dialog` does nothing when opening `PachiConfirmDialog`.**
Enable the `Dialog` plugin in `framework.plugins`. In Vite development, an app and a package can load *two copies* of
`quasar`; always open the dialog with the app's own `$q` (`const $q = useQuasar(); $q.dialog({ component: PachiConfirmDialog, ... })`),
never with a `Dialog` imported inside a package. Deduplicating `quasar`, `vue` and `vue-i18n` with `resolve.dedupe`
helps too. For `@ilpachi/pachi-kit/dialog` use `usePachiDialog()` in `setup()` instead of `createPachiDialog`.

**Texts show as keys (`pachiUi.confirmDialog.submit`).**
The `@ilpachi/pachi-i18n` instance was not created. Call `createPachiI18n` in a boot file.

**A message containing `@` fails to compile.**
Escape vue-i18n special characters: `{'@'}`, `{'{'}`, `{'}'}`, `{'|'}`. Messages are plain TS objects, so
`@intlify/unplugin-vue-i18n` must run with `runtimeOnly: false`.

**`PachiPopupEdit` does not open.**
It attaches to its **parent element**: put it inside the element the user clicks (a `span`, a `q-td`, ...), not next to it.

**The confirm button of `PachiPopupEdit` stays disabled.**
It is disabled while the value is unchanged or while any `rule` does not return `true`. Rules returning a Promise are
ignored.

**The submit button of `PachiConfirmDialog` looks red for a non-destructive action.**
Set `tone` to `warning` or `info` (the default `danger` is red) and `submitLabel` / `metaLabel` for the texts. To change
the colours, override `--pachi-red` (and optionally `--pachi-red-soft`), `--pachi-amber` or `--pachi-blue` in the project.

**The date shows in an unexpected format.**
The value is a plain string in the format of `mask` (default `YYYY-MM-DD HH:mm`); `PachiDatePicker` does not convert it
to `Date`.
