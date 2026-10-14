# Dialog

A generic dialog component for [Quasar](https://quasar.dev) (Vue 3) with a title toolbar, ready-made confirm/close
or restore/save/close actions, awaitable `ok` handling (success closes, failure notifies and shakes the card),
discard-changes protection, programmatic opening with custom content, and helpers to configure a rich-text `QEditor`.



## Requirements

Install the package and its peers as described in [Installation](installation.md). The Quasar plugins `Dialog` and `Notify` must be enabled (`quasar.config.ts` -> `framework.plugins`): `Dialog` is used for the "discard changes?" confirmation and by `createPachiDialog`; `Notify` shows the error raised by `onError`.

## Quick start

`PachiDialog` is a self-contained dialog: it renders a `q-dialog` and is opened with the exposed `show()` method, so
no `v-model` is required.

```vue
<template>
  <q-btn color="primary" label="Open" @click="dlg?.show()" />

  <pachi-dialog
    ref="dlg"
    title="Confirm operation"
    :icon="mdiHelpCircle"
    rounded
    width="420px"
    @ok="onOk"
    @edit:cancel="onCancel"
  >
    <p>Do you want to proceed?</p>
  </pachi-dialog>
</template>

<script setup lang="ts">
import { useTemplateRef } from 'vue'
import { mdiHelpCircle } from '@quasar/extras/mdi-v7'
import { PachiDialog } from '@ilpachi/pachi-kit/dialog'

const dlg = useTemplateRef<InstanceType<typeof PachiDialog>>('dlg')

/** `ok` is awaitable: the dialog closes only when `onSuccess()` is called. */
async function onOk(payload: { data: unknown, onSuccess: () => void, onError: (e: unknown) => void }) {
  try {
    await save()
    payload.onSuccess() // marks as saved and closes
  } catch (error) {
    payload.onError(error) // negative notification + shake, the dialog stays open
  }
}

function onCancel() {
  console.log('closed without saving')
}
</script>
```

Icons are always passed as SVG values imported from `@quasar/extras/mdi-v7` (never as strings).

## PachiDialog reference

```ts
import { PachiDialog } from '@ilpachi/pachi-kit/dialog'
import type { IPachiDialogProps } from '@ilpachi/pachi-kit/dialog'
```

### Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `title` | `string` | **required** | Title shown in the toolbar (replaceable with the `title` slot). |
| `icon` | `string \| null` | `null` | SVG icon shown in a 48px avatar before the title. |
| `titleClass` | `string` | `'bg-primary text-white'` | Classes of the title toolbar. |
| `rounded` | `boolean` | `false` | Rounded card corners (`pachi-rounded`, 14px). |
| `shaped` | `boolean` | `false` | "Leaf" shape: rounded top-left and bottom-right corners (`pachi-shaped`). |
| `top`, `left`, `bottom`, `right` | `string \| null` | `null` | Inline position of the card (any CSS length). |
| `width`, `height` | `string \| null` | `null` | Inline size of the card. |
| `minWidth`, `minHeight` | `string \| null` | `null` | Inline minimum size. |
| `maxWidth`, `maxHeight` | `string \| null` | `null` | Inline maximum size (for example `max-height="70vh"` makes a long body scroll). |
| `cardClass` | `string \| null` | `null` | Extra class added to the `q-card`. |
| `actionClasses` | `string[]` | `[]` | Classes of the `q-card-actions` bar. |
| `confirmDisabled` | `boolean` | `false` | Disables (does not hide) the confirm button. |
| `showActionLabels` | `boolean` | `false` | Shows the text label next to the icon of the action buttons (confirm/close, or restore/save/close with `useEditActions`). Default: icon only with a tooltip. The actions are right-aligned either way. |
| `cancelDisabled` | `boolean` | `false` | Disables (does not hide) the close button of the default actions. |
| `useEditActions` | `boolean` | `false` | Uses restore / save / close instead of confirm / close. See [Edit mode](#edit-mode-and-unsaved-changes). |
| `hasChanges` | `boolean` | `false` | There are unsaved changes (meaningful with `useEditActions`). After `onSuccess()` of `edit:save` the dialog counts as saved until `hasChanges` changes again: set it back to `false` after saving. Save clicks are ignored while a previous one is pending (until `onSuccess`/`onError`, 10 s safety timeout). |
| `avoidHideWithChanges` | `boolean` | `true` | With `useEditActions` and `hasChanges` the dialog becomes `persistent` and closing asks for confirmation. Note: `PachiEditDialog` (`@ilpachi/pachi-kit/edit-dialog`) defaults to `false`. While the confirmation is open no other one is stacked. |
| `content` | `object \| (() => VNodeChild)` | `undefined` | Body as a component or a render function; alternative to the default slot (the slot wins). Mainly for programmatic usage. |
| `contentProps` | `Record<string, unknown>` | `undefined` | Props passed to `content` when it is a component. |

### Events

| Event | Payload | Emitted when |
| --- | --- | --- |
| `ok` | `{ data, onSuccess, onError }` | The confirm button is pressed (default actions) or `onLocalOkClicked()` is called. The dialog does **not** close by itself: call `onSuccess()` to mark the dialog as saved and close it, or `onError(error)` to show a negative `Notify` (`error.message`, centred, 3 s) and shake the card. `data` is `undefined` on this path. Calling the exposed `onDialogOK(payload)` emits `ok` with your own payload and closes at once. |
| `hide` | none | The dialog has been hidden (Quasar `useDialogPluginComponent`). |
| `edit:save` | `{ data, onSuccess, onError }` | The save button of the edit actions is pressed. `onSuccess()` clears the "modified" state **without closing** (a later close does not ask for confirmation); `onError(error)` notifies and shakes. |
| `edit:restore` | none | The restore button is pressed. Restore your own state and set `hasChanges` back to `false`. |
| `edit:cancel` | none | The dialog is closed **without saving** through the toolbar close icon or the close button; also on ESC / backdrop click **when there are unsaved changes** (see below). With unsaved changes it is emitted only after the user confirms discarding them. It is **not** emitted after `onSuccess()` of `ok`. |

ESC and backdrop click on a dialog *without* unsaved changes are handled natively by `q-dialog`: it just hides, so only
`hide` is emitted (no `edit:cancel`).

### Slots

| Slot | Replaces / adds |
| --- | --- |
| `default` | Dialog body (takes precedence over `content`). |
| `title` | The title text. |
| `title-icon` | The avatar with the `icon`. |
| `toolbar-actions` | Extra toolbar content before the close icon. |
| `actionsBefore` | Content before the actions inside the actions bar. |
| `actions` | **Replaces** the default or edit actions. |
| `actionsAfter` | Content after the actions. |
| `actionsafter` | Same position as `actionsAfter` (lower-case alias; both are rendered if both are given). |

The toolbar also contains a *portal* element (`.pachi-dialog-toolbar-portal`) that child components such as
`@ilpachi/pachi-kit/uploader` use to teleport their header actions into the toolbar (see `usePachiDialogToolbar`).

### Exposed members

Access them with a template ref (`InstanceType<typeof PachiDialog>`).

| Member | Type | Description |
| --- | --- | --- |
| `show()` | `() => void` | Opens the dialog. |
| `hide()` | `() => void` | Closes the dialog (only `hide` is emitted). |
| `markSaved()` | `() => void` | Declares the current changes as saved: closing no longer asks for confirmation. |
| `onLocalOkClicked()` | `() => void` | Emits the awaitable `ok`. Use it from a custom `actions` slot to behave like the default confirm button. |
| `onDialogOK(payload?)` | Quasar | Helper of Quasar's `useDialogPluginComponent`: emits `ok` with `payload` and closes immediately. Internal flows do not use it. |
| `onDialogHide` | Quasar | Quasar's hide handler. |
| `dialogRef` | `Ref<QDialog \| null>` | The inner `q-dialog`. |
| `toolbarPortal` | `Ref<HTMLElement \| null>` | The portal element in the toolbar. |

Custom actions, reproducing the default confirm behaviour:

```vue
<pachi-dialog ref="dlg" title="Custom actions" @ok="onOk">
  <p>Body</p>
  <template #actions>
    <q-btn flat no-caps label="Cancel" @click="dlg?.hide()" />
    <q-btn unelevated no-caps color="primary" label="OK" @click="dlg?.onLocalOkClicked?.()" />
  </template>
</pachi-dialog>
```

## Edit mode and unsaved changes

With `use-edit-actions` the action bar shows **restore** and **save** (only while `has-changes` is true) and **close**.
If `avoid-hide-with-changes` is true (default) and there are unsaved changes, the dialog is `persistent`: ESC or a
backdrop click do not close it, they open a "Confirm Discard" `Dialog`; confirming emits `edit:cancel` and closes.

```vue
<pachi-dialog
  ref="dlg"
  title="Edit customer"
  :icon="mdiPencil"
  use-edit-actions
  :has-changes="hasChanges"
  @edit:save="onSave"
  @edit:restore="onRestore"
  @edit:cancel="log('edit:cancel')"
>
  <customer-form ref="section" @change="hasChanges = section?.hasChanges() ?? false" />
</pachi-dialog>
```

```ts
async function onSave(payload: { onSuccess: () => void, onError: (e: unknown) => void }) {
  if (!section.value?.validate()) return payload.onError(new Error('Name is required'))
  try {
    await api.save(section.value.getResults())
    payload.onSuccess()      // clears the modified state, the dialog stays open
    hasChanges.value = false
  } catch (e) { payload.onError(e) }
}

function onRestore() {
  section.value?.reset()
  hasChanges.value = false
}
```

`IExtraSectionExpose<T>` is a convention for the form component placed in the dialog:

```ts
import type { IExtraSectionExpose } from '@ilpachi/pachi-kit/dialog'

defineExpose<IExtraSectionExpose<{ name: string }>>({
  reset() { /* restore initial values */ },
  getResults() { return { name: form.name } },
  hasChanges() { return form.name !== initial.name },
  validate() { return form.name.trim().length > 0 }, // optional
})
```

`hasChanges()` is method based (not reactive): re-read it on the form's own change event and feed the result to
the `has-changes` prop.

## Programmatic usage

`Dialog.create({ component: PachiDialog })` cannot pass slots, so `content` / `contentProps` take their place.

```ts
import { h } from 'vue'
import { mdiConsole } from '@quasar/extras/mdi-v7'
import { usePachiDialog } from '@ilpachi/pachi-kit/dialog'
import MyForm from './MyForm.vue'

// in setup(): bound to the app's $q
const openDialog = usePachiDialog()

function openProgrammatic() {
  openDialog({
    title: 'New item',
    icon: mdiConsole,
    rounded: true,
    width: '360px',
    content: MyForm,                  // a component...
    contentProps: { id: 42 },
    // content: () => h('p', 'text')  // ...or a render function
  })
    .onOk(({ onSuccess, onError }) => save().then(onSuccess, onError))
    .onCancel(() => console.log('cancelled'))
    .onDismiss(() => console.log('dismissed'))
}
```

| Function | Signature | Description |
| --- | --- | --- |
| `createPachiDialog` | `(options: ICreatePachiDialogOptions, $q?: PachiDialogQuasar \| null) => PachiDialogHandle` | Equivalent to `Dialog.create({ component: PachiDialog, componentProps: options })`. With `$q` it uses `$q.dialog(...)` instead of the imported `Dialog` plugin. |
| `usePachiDialog` | `() => (options: ICreatePachiDialogOptions) => PachiDialogHandle` | Call it in `setup()`: it picks the `$q` of the running app (`getCurrentInstance()`) and returns a `create(options)` function to call later from event handlers. Outside a component it falls back to the imported `Dialog` plugin. |

The returned `PachiDialogHandle` is Quasar's chainable object (`onOk`, `onCancel`, `onDismiss`, `hide`, `update`).
Quasar calls `onCancel` whenever the dialog is hidden without an `ok` (close button, ESC, backdrop click) and `onDismiss`
always; use the `edit:cancel` event of the component if you need the stricter "closed without saving" meaning.
The content cannot receive a reference to the dialog: to close from the inside use `onSuccess()` of the `ok` payload or
call `.hide()` on the returned handle.

Prefer `usePachiDialog()` to `createPachiDialog(options)`: see [Troubleshooting](#troubleshooting) for the reason.

## Editor helpers

`useEditorOptions` builds the toolbar, fonts and custom command definitions for a Quasar `QEditor`
(align, bold/italic/..., `hr`, link, print/fullscreen, headings, font size and family, lists, undo/redo, view source).

```vue
<q-editor
  v-model="html"
  :toolbar="editor.toolbar.value"
  :fonts="editor.fonts.value"
  :definitions="editor.definitions.value"
  v-bind="editor.editorProps"
/>

<script setup lang="ts">
import { ref } from 'vue'
import { useQuasar } from 'quasar'
import { mdiCalendarToday } from '@quasar/extras/mdi-v7'
import { defaultEditorOptions, useEditorOptions } from '@ilpachi/pachi-kit/dialog'
import type { IEditorOptions } from '@ilpachi/pachi-kit/dialog'

const $q = useQuasar()
const html = ref('<p>Hello <b>editor</b></p>')
const options: IEditorOptions = {
  ...defaultEditorOptions,
  editorButtons: {
    insert_date: {
      icon: mdiCalendarToday,
      tip: 'insert date',
      handler: (text) => {
        if (typeof text !== 'string') text.value += `<p>${new Date().toLocaleDateString()}</p>`
      },
    },
  },
}
const editor = useEditorOptions($q, html, options)
</script>
```

| Member | Description |
| --- | --- |
| `useEditorOptions($q, text, options)` | Returns `{ toolbar, fonts, definitions, editorProps }`. `toolbar`, `fonts` and `definitions` are `computed` refs; `editorProps` is `options.qEditorProps ?? {}`. The `editorButtons` object is **not mutated**: buttons are cloned with `handler` / `toggled` bound to `text` and appended in a final toolbar row. |
| `defaultEditorOptions` | `{ editorHeight: '6em', displayClass: 'pachi-nme-display', disableTypes: false, editorButtons: {} }`: a starting point to spread and customise. |
| `IEditorOptions` | `editorHeight`, `displayClass`, `disableTypes` (values stored for the app to read: `useEditorOptions` does not use them), `editorButtons`, `qEditorProps`. |
| `IEditorButtons` | A `QEditorCommand` whose `handler(text, ...args)` and `toggled(text, ...args)` receive the model `Ref<string>`. |

`token` and `custom_btn` are slot commands of `QEditor`: in the default toolbar they appear **only** if you define them
in `editorButtons` (otherwise they would be empty placeholders). When defined, `token` is placed before `hr` and
`custom_btn` after `link`, and neither is repeated in the final row.

## Exports and types

Barrel (`@ilpachi/pachi-kit/dialog`):

| Export | Kind | Notes |
| --- | --- | --- |
| `PachiDialog` | component | The dialog. |
| `createPachiDialog`, `usePachiDialog` | functions | Programmatic opening. |
| `useEditorOptions`, `defaultEditorOptions` | function / constant | `QEditor` helpers. |
| `IPachiDialogProps` | type | Props of `PachiDialog`. |
| `ICreatePachiDialogOptions` | type | Alias of `IPachiDialogProps`. |
| `PachiDialogHandle` | type | `ReturnType<typeof Dialog.create>`. |
| `PachiDialogQuasar` | type | `Pick<QVueGlobals, 'dialog'>`: the part of `$q` that is used (handy for tests). |
| `PachiDialogContent` | type | `Component \| (() => VNodeChild)`. |
| `IExtraSectionExpose<T>` | type | `reset`, `getResults`, `hasChanges`, optional `validate`. |
| `IEditorOptions`, `IEditorButtons` | types | Editor helper types. |
| `IPachiDialogButton`, `IPachiDialogMessage` | types | Declared for host applications (a `QBtnProps`-based button descriptor and a structured `dialog-message` result); the component itself does not consume them. |

`usePachiDialogToolbar` and the `PACHI_DIALOG_TOOLBAR_KEY` injection key are also exported from the barrel. Sub-path exports:

| Import | Provides |
| --- | --- |
| `@ilpachi/pachi-kit/dialog/composables/usePachiDialogToolbar` | `usePachiDialogToolbar()` → `{ target }`, an injected `Ref<HTMLElement \| null>` pointing at the toolbar portal of the enclosing `PachiDialog` (`null` outside a dialog). Used by `@ilpachi/pachi-kit/uploader`. |
| `@ilpachi/pachi-kit/dialog/composables/editor-defaults` | The editor helpers module, which also exports `useToolbar($q, editorButtons?)` returning the default toolbar rows. |

## Styling

All CSS variables are named `--pachi-*` and every class defined by the package starts with `pachi-`. Styles are not
`scoped`. The defaults (`src/styles/theme-defaults.scss`, loaded by the barrel) are declared with `:where(...)`, i.e.
zero specificity, so any definition in your project wins:

```css
:root { --pachi-accent: #ff6600; }
body.body--dark { --pachi-surface: #111; }
```

The package works standalone: dark theme by default, light theme under Quasar's `body.body--light`, compact density
under `:root[data-density='compact']`. `PachiDialog` itself relies on Quasar's own theming (`titleClass` defaults to
`bg-primary text-white`) and does not read any `--pachi-*` variable directly; the defaults below are shared with the
other `@ilpachi` packages and are defined here so that the family looks consistent.

| Variable | Default (dark) | Purpose |
| --- | --- | --- |
| `--pachi-bg`, `--pachi-surface`, `--pachi-surface-2`, `--pachi-surface-3` | `#0a0d12`, `#10141b`, `#161b23`, `#1c2230` | Backgrounds. |
| `--pachi-border`, `--pachi-border-hi` | `#1f2530`, `#2a3140` | Borders. |
| `--pachi-ink`, `--pachi-ink-2`, `--pachi-muted`, `--pachi-faint` | `#e6eaf2`, `#b7becc`, `#7b8494`, `#525b6b` | Text. |
| `--pachi-accent`, `--pachi-accent-soft`, `--pachi-accent-mid`, `--pachi-accent-ink`, `--pachi-accent-deep` | `#2dd4bf` family | Accent. |
| `--pachi-blue`, `--pachi-amber`, `--pachi-red`, `--pachi-green` (+ `*-soft`) | semantic colours | Status colours. |
| `--pachi-font`, `--pachi-mono`, `--pachi-title-font` | Geist stacks | Fonts. |
| `--pachi-row-h`, `--pachi-pad`, `--pachi-card-r` | `40px`, `22px`, `12px` | Density. |

CSS classes defined by the component: `pachi-dialog` (card; also `pachi-rounded`, `pachi-shaped`),
`pachi-dialog-content` (body section), `pachi-dialog-toolbar-portal`, and the transition name `pachi-actions`.
The card is `position: absolute` and always carries Quasar's `q-dialog-plugin`; use the `top` / `left` / ... props or
`cardClass` to move it.

## Internationalisation

Button labels and the discard confirmation come from `@ilpachi/pachi-i18n` (`it`, `en`) under the `pachiDialog`
namespace. To change a text or add a language, define the same keys in the app:

| Key | English |
| --- | --- |
| `pachiDialog.confirm` | Confirm |
| `pachiDialog.close` | Close |
| `pachiDialog.restore` | Restore original values |
| `pachiDialog.save` | Save changes |
| `pachiDialog.discardTitle` | Confirm Discard |
| `pachiDialog.discardMessage` | There are unsaved changes. Are you sure you want to discard them? |

Keys already defined by the app are never overwritten by the package. Only languages already present in the app are
registered. In vue-i18n messages the characters `{ } @ |` are special: write a literal `@` as `{'@'}`.

## Troubleshooting

**`Dialog.create is not a function` when calling `createPachiDialog(options)` in development.**
With Vite, the app and a linked or installed package can end up with *two copies* of `quasar`; the `Dialog` plugin that
the package imports is then not the one installed by the app. The packages therefore use the `$q` of the app:
call `usePachiDialog()` in `setup()` and use the function it returns, or pass the app's `$q` as the second argument
of `createPachiDialog(options, $q)`. Without `$q` (unit tests, code outside `setup()`) it falls back to the imported
plugin. Deduplicating `quasar`, `vue` and `vue-i18n` with `resolve.dedupe` in the Vite config also helps.

**The "discard changes" dialog or the error notification does not appear.**
Add the Quasar plugins `Dialog` and `Notify` to `framework.plugins`.

**Texts show as keys (`pachiDialog.confirm`).**
The i18n instance of `@ilpachi/pachi-i18n` was not created (or `vue-i18n` is missing). Call `createPachiI18n` in a boot file.

**A message containing `@`, `{`, `}` or `|` fails to compile.**
These are vue-i18n syntax characters. Escape them as literals: `{'@'}`, `{'{'}`, `{'}'}`, `{'|'}`. Messages are plain
TS objects, so `@intlify/unplugin-vue-i18n` must run with `runtimeOnly: false`.

**The body of a long dialog does not scroll.**
Give the card a bounded height (`max-height="70vh"`): the content section scrolls inside the card.

**Pressing OK does nothing visible.**
By design the dialog stays open until `onSuccess()` is called. Always answer the awaitable payload.

**A dialog opened with `createPachiDialog` is empty.**
Slots cannot be passed through `Dialog.create`: provide `content` (and `contentProps`).

**ESC closes the dialog but `edit:cancel` is not emitted.**
Only a dialog with unsaved changes (edit mode) is `persistent` and routes ESC / backdrop clicks through the cancel flow.
Listen to `hide` if you need to react to every closing.
