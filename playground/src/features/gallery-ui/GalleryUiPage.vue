<template>
  <q-page padding class="column q-gutter-lg">
    <section>
      <h5 class="q-my-sm">PachiDatePicker</h5>
      <p class="text-grey">Date and time input: the calendar and the clock edit the same string.</p>
      <div class="row q-col-gutter-md">
        <pachi-date-picker v-model="when" label="Default (YYYY-MM-DD HH:mm)" class="col-12 col-sm-6 col-md-4" />
        <pachi-date-picker v-model="day" mask="YYYY-MM-DD" label="Date only" class="col-12 col-sm-6 col-md-4" />
        <pachi-date-picker v-model="it" mask="DD/MM/YYYY HH:mm" label="DD/MM/YYYY HH:mm" class="col-12 col-sm-6 col-md-4" />
        <pachi-date-picker v-model="when" :auto-close="false" label="auto-close off" class="col-12 col-sm-6 col-md-4" />
        <pachi-date-picker
          v-model="when" :rounded="false" :outlined="false" dense clearable hint="Square, standard, dense"
          label="Standard" class="col-12 col-sm-6 col-md-4"
        />
        <pachi-date-picker v-model="when" :format24h="false" label="AM/PM clock" class="col-12 col-sm-6 col-md-4" />
        <pachi-date-picker v-model="when" readonly label="readonly" class="col-12 col-sm-6 col-md-4" />
        <pachi-date-picker v-model="when" disable label="disable" class="col-12 col-sm-6 col-md-4" />
        <pachi-date-picker
          v-model="required" :rules="[(x: string) => !!x || 'Required']" lazy-rules clearable
          label="With rules (required)" class="col-12 col-sm-6 col-md-4"
        />
      </div>
    </section>

    <section>
      <h5 class="q-my-sm">PachiConfirmDialog</h5>
      <p class="text-grey">
        "Type the word to confirm" dialog, opened with <code>$q.dialog</code>. Result:
        <b>{{ confirmResult || '-' }}</b>
      </p>
      <div class="row q-gutter-sm">
        <q-btn color="negative" no-caps label="Danger (default)" @click="confirm({ title: 'Delete project', description: 'All files will be removed.', warning: 'This operation cannot be undone.' })" />
        <q-btn color="warning" no-caps label="Warning tone" @click="confirm({ title: 'Reset settings', description: 'Settings return to defaults.', tone: 'warning', confirmWord: 'RESET', submitLabel: 'Reset' })" />
        <q-btn color="info" no-caps label="Info tone" @click="confirm({ title: 'Deploy to production', description: 'The current build will go live.', tone: 'info', confirmWord: 'OK', submitLabel: 'Deploy', metaLabel: 'confirm · release' })" />
      </div>
      <div class="q-mt-md" style="max-width: 360px">
        <q-input v-model="typed" dense outlined label="Try the helper: type ELIMINA" />
        <code>matchesConfirmWord('{{ typed }}', 'ELIMINA') = {{ matchesConfirmWord(typed, 'ELIMINA') }}</code>
      </div>
    </section>

    <section>
      <h5 class="q-my-sm">PachiPopupEdit</h5>
      <p class="text-grey">Inline editing: click a value. Rules block the confirm button until valid.</p>
      <q-list bordered separator style="max-width: 520px">
        <q-item v-for="row in editRows" :key="row.label" clickable>
          <q-item-section side class="text-grey">{{ row.label }}</q-item-section>
          <q-item-section>
            {{ row.model.value }}
            <pachi-popup-edit
              v-model="row.model.value" :type="row.type" :title="row.title" :rules="row.rules"
            />
          </q-item-section>
        </q-item>
      </q-list>
      <p class="q-mt-sm">
        <code>passesRules(rules, '{{ email }}') = {{ passesRules(emailRules, email) }}</code>
      </p>
    </section>

    <section>
      <h5 class="q-my-sm">PachiDuotoneIcon</h5>
      <p class="text-grey">Two stacked paths: the secondary one has reduced opacity.</p>
      <div class="row items-end q-gutter-lg">
        <pachi-duotone-icon :icon="heart" />
        <pachi-duotone-icon :icon="heart" :size="56" color="var(--q-negative)" />
        <pachi-duotone-icon :icon="heart" :size="56" color="var(--q-primary)" :secondary-opacity="0.15" />
        <pachi-duotone-icon :icon="heart" :size="56" color="var(--q-positive)" :secondary-opacity="0.8" />
        <pachi-duotone-icon :icon="star" :size="56" color="orange" title="Star with accessible name" />
      </div>
    </section>

    <section>
      <h5 class="q-my-sm">PachiDialog</h5>
      <p class="text-grey">
        Component opened with <code>show()</code>. Last event: <b>{{ lastEvent || '-' }}</b>
      </p>
      <div class="row q-gutter-sm">
        <q-btn color="primary" no-caps label="Basic (ok awaitable)" @click="basic?.show()" />
        <q-btn color="primary" no-caps label="Failing ok (error + shake)" @click="failing?.show()" />
        <q-btn color="primary" no-caps label="Rounded + labels" @click="rounded?.show()" />
        <q-btn color="primary" no-caps label="Shaped" @click="shaped?.show()" />
        <q-btn color="primary" no-caps label="Edit actions" @click="edit?.show()" />
        <q-btn color="primary" no-caps label="Custom actions + slots" @click="custom?.show()" />
        <q-btn color="primary" no-caps label="Disabled buttons" @click="disabled?.show()" />
        <q-btn color="primary" no-caps label="Long body (max-height)" @click="long?.show()" />
        <q-btn color="primary" no-caps label="Long body (full-scroll)" @click="longFull?.show()" />
        <q-btn color="primary" no-caps label="Rich text (editor helpers)" @click="editorDlg?.show()" />
      </div>

      <pachi-dialog ref="basic" title="Confirm operation" :icon="mdiHelpCircle" width="420px" @ok="okAfter" @hide="lastEvent = 'hide'" @edit:cancel="lastEvent = 'edit:cancel'">
        <p>Do you want to proceed? Confirming waits 600 ms, then closes.</p>
      </pachi-dialog>

      <pachi-dialog ref="failing" title="Always fails" :icon="mdiAlertCircleOutline" width="380px" @ok="okFail">
        <p>The confirm button raises an error: a notification appears and the card shakes.</p>
      </pachi-dialog>

      <pachi-dialog ref="rounded" title="Rounded" :icon="mdiStarOutline" rounded show-action-labels width="380px" title-class="bg-teal text-white">
        <p>Rounded card, action labels and a custom title class.</p>
      </pachi-dialog>

      <pachi-dialog ref="shaped" title="Shaped" :icon="mdiLeaf" shaped width="380px" title-class="bg-deep-purple text-white">
        <p>Leaf shape: rounded top-left and bottom-right corners.</p>
      </pachi-dialog>

      <pachi-dialog
        ref="edit" title="Edit customer" :icon="mdiPencil" use-edit-actions show-action-labels
        :has-changes="hasChanges" width="420px"
        @edit:save="onSave" @edit:restore="onRestore" @edit:cancel="lastEvent = 'edit:cancel'"
      >
        <q-input v-model="customer" outlined dense label="Name (edit to enable save)" @update:model-value="hasChanges = customer !== initialCustomer" />
        <p class="text-caption q-mt-sm">With unsaved changes, ESC asks to discard them.</p>
      </pachi-dialog>

      <pachi-dialog ref="custom" title="Custom actions" :icon="mdiCog" width="420px" @ok="okAfter">
        <template #title>Custom title slot</template>
        <template #toolbar-actions><q-badge color="orange" label="beta" class="q-mr-sm" /></template>
        <p>Body</p>
        <template #actionsBefore><span class="text-caption q-mr-auto">actionsBefore</span></template>
        <template #actions>
          <q-btn flat no-caps label="Cancel" @click="custom?.hide()" />
          <q-btn unelevated no-caps color="primary" label="OK" @click="custom?.onLocalOkClicked?.()" />
        </template>
        <template #actionsAfter><span class="text-caption">actionsAfter</span></template>
      </pachi-dialog>

      <pachi-dialog ref="disabled" title="Disabled buttons" confirm-disabled cancel-disabled width="380px">
        <p>Confirm and close are disabled, not hidden. Close with the toolbar icon or ESC.</p>
      </pachi-dialog>

      <pachi-dialog ref="long" title="Long body" max-height="60vh" width="420px">
        <p v-for="n in 30" :key="n">Row {{ n }}: scrollable content.</p>
      </pachi-dialog>

      <pachi-dialog ref="longFull" title="Long body (full-scroll)" max-height="60vh" width="420px" full-scroll>
        <p v-for="n in 30" :key="n">Row {{ n }}: the whole card scrolls.</p>
      </pachi-dialog>

      <pachi-dialog ref="editorDlg" title="Rich text" :icon="mdiFormatText" width="640px" max-width="95vw">
        <q-editor
          v-model="html" :toolbar="editor.toolbar.value" :fonts="editor.fonts.value"
          :definitions="editor.definitions.value" v-bind="editor.editorProps"
        />
      </pachi-dialog>
    </section>

    <section>
      <h5 class="q-my-sm">usePachiDialog / createPachiDialog</h5>
      <p class="text-grey">Programmatic opening with <code>content</code> as render function or component.</p>
      <div class="row q-gutter-sm">
        <q-btn color="secondary" no-caps label="usePachiDialog + render function" @click="openRender" />
        <q-btn color="secondary" no-caps label="Component content + contentProps" @click="openComponent" />
        <q-btn color="secondary" no-caps label="createPachiDialog($q)" @click="openCreate" />
      </div>
    </section>
  </q-page>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, ref, useTemplateRef } from 'vue'
import type { Ref } from 'vue'
import { useQuasar } from 'quasar'
import {
  mdiAlertCircleOutline, mdiCog, mdiFormatText, mdiHeart, mdiHeartOutline, mdiHelpCircle, mdiLeaf,
  mdiPencil, mdiStar, mdiStarOutline
} from '@quasar/extras/mdi-v7'
import {
  PachiConfirmDialog, PachiDatePicker, PachiDuotoneIcon, PachiPopupEdit, matchesConfirmWord, passesRules
} from '@ilpachi/pachi-kit/ui'
import type { DuotoneIcon, PachiRule } from '@ilpachi/pachi-kit/ui'
import {
  PachiDialog, createPachiDialog, defaultEditorOptions, usePachiDialog, useEditorOptions
} from '@ilpachi/pachi-kit/dialog'
import type { IEditorOptions } from '@ilpachi/pachi-kit/dialog'

/** Payload of the awaitable `ok` / `edit:save` events of `PachiDialog`. */
interface OkPayload {
  data: unknown
  onSuccess: () => void
  onError: (e: unknown) => void
}

const $q = useQuasar()
const openDialog = usePachiDialog()

// --- PachiDatePicker
const when = ref('2026-10-05 09:30')
const day = ref('2026-10-05')
const it = ref('05/10/2026 09:30')
const required = ref('')

// --- PachiConfirmDialog
const confirmResult = ref('')
const typed = ref('')

/**
 * Opens a `PachiConfirmDialog` with the given props and records the outcome.
 * @param props - props of the dialog
 */
function confirm(props: Record<string, unknown>): void {
  confirmResult.value = 'pending'
  $q.dialog({ component: PachiConfirmDialog, componentProps: props })
    .onOk(() => { confirmResult.value = 'confirmed' })
    .onCancel(() => { confirmResult.value = 'cancelled' })
}

// --- PachiPopupEdit
/** Rule: non-empty value. */
const notEmpty: PachiRule = (v) => (v !== null && v !== undefined && String(v).trim() !== '') || 'Required'
const emailRules: PachiRule[] = [notEmpty, (v) => String(v).includes('@') || 'Invalid e-mail']
const name = ref('Alpha')
const email = ref('alpha@example.com')
const age = ref(42)
const notes = ref('Multi-line note.\nCtrl+Enter confirms.')
const editRows = [
  { label: 'Text', model: name, type: 'text' as const, title: 'Edit name', rules: [notEmpty] },
  { label: 'E-mail', model: email, type: 'email' as const, title: 'Edit e-mail', rules: emailRules },
  { label: 'Number', model: age, type: 'number' as const, title: 'Edit age', rules: [(v: unknown) => Number(v) >= 0 || 'Must be >= 0'] },
  { label: 'Textarea', model: notes, type: 'textarea' as const, title: 'Edit notes', rules: [] }
] as { label: string, model: Ref<string | number>, type: 'text' | 'email' | 'number' | 'textarea', title: string, rules: PachiRule[] }[]

// --- PachiDuotoneIcon
const heart: DuotoneIcon = { primary: mdiHeartOutline, secondary: mdiHeart }
const star: DuotoneIcon = { primary: mdiStarOutline, secondary: mdiStar }

// --- PachiDialog
type Dlg = InstanceType<typeof PachiDialog>
const basic = useTemplateRef<Dlg>('basic')
const failing = useTemplateRef<Dlg>('failing')
const rounded = useTemplateRef<Dlg>('rounded')
const shaped = useTemplateRef<Dlg>('shaped')
const edit = useTemplateRef<Dlg>('edit')
const custom = useTemplateRef<Dlg>('custom')
const disabled = useTemplateRef<Dlg>('disabled')
const long = useTemplateRef<Dlg>('long')
const longFull = useTemplateRef<Dlg>('longFull')
const editorDlg = useTemplateRef<Dlg>('editorDlg')
const lastEvent = ref('')
const initialCustomer = 'Acme Inc.'
const customer = ref(initialCustomer)
const hasChanges = ref(false)
const html = ref('<p>Hello <b>editor</b></p>')

/**
 * Fake async save that succeeds after a short delay.
 * @param payload - awaitable event payload
 */
function okAfter(payload: OkPayload): void {
  lastEvent.value = 'ok'
  setTimeout(payload.onSuccess, 600)
}

/**
 * Fake async save that always fails.
 * @param payload - awaitable event payload
 */
function okFail(payload: OkPayload): void {
  setTimeout(() => payload.onError(new Error('Fake server error')), 300)
}

/**
 * Fake save of the edit dialog: marks it as saved (dialog stays open).
 * @param payload - awaitable event payload
 */
function onSave(payload: OkPayload): void {
  if (!customer.value.trim()) return payload.onError(new Error('Name is required'))
  setTimeout(() => {
    payload.onSuccess()
    hasChanges.value = false
    lastEvent.value = 'edit:save'
  }, 400)
}

/** Restores the initial value of the edit dialog. */
function onRestore(): void {
  customer.value = initialCustomer
  hasChanges.value = false
  lastEvent.value = 'edit:restore'
}

const editorOptions: IEditorOptions = {
  ...defaultEditorOptions,
  editorButtons: {
    insert_date: {
      icon: mdiFormatText,
      tip: 'Insert date',
      handler: (text) => {
        if (typeof text !== 'string') text.value += `<p>${new Date().toLocaleDateString()}</p>`
      }
    }
  }
}
const editor = useEditorOptions($q, html, editorOptions)

// --- programmatic dialogs
/** Small component used as `content` with `contentProps`. */
const Greeting = defineComponent({
  props: { who: { type: String, default: '' } },
  setup: (props) => () => h('p', `Hello ${props.who}, from a component.`)
})
const greeting = computed(() => 'world')

/** Opens a dialog whose content is a render function. */
function openRender(): void {
  openDialog({ title: 'Render function', icon: mdiHelpCircle, content: () => h('p', 'Rendered by a function.') })
    .onOk(({ onSuccess }: OkPayload) => onSuccess())
}

/** Opens a dialog whose content is a component with props. */
function openComponent(): void {
  openDialog({ title: 'Component', rounded: true, width: '360px', content: Greeting, contentProps: { who: greeting.value } })
}

/** Opens a dialog with `createPachiDialog` and the app's `$q`. */
function openCreate(): void {
  createPachiDialog({ title: 'createPachiDialog', shaped: true, content: () => h('p', 'Opened with $q.') }, $q)
}
</script>
