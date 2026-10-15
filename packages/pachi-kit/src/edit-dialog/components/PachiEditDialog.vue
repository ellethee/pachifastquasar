<template>
  <q-dialog
    ref="dialogRef"
    backdrop-filter="blur(4px) saturate(150%)"
    :maximized="maximized"
    :persistent="blockHide"
    :aria-labelledby="titleId"
    @hide="onDialogHide"
    @shake="onUserDismissAttempt"
  >
    <q-card
      :class="{
        'q-dialog-plugin': true,
        'pachi-edit-dialog': true,
        'pachi-rounded': rounded,
        'pachi-shaped': shaped,
        [cardClass]: !!cardClass
      }"
      :style="{
        top,
        left,
        bottom,
        right,
        width,
        height,
        minWidth,
        minHeight,
        maxWidth,
        maxHeight
      }"
    >
      <q-toolbar :class="titleClass" dense>
        <slot name="title-icon">
          <q-avatar
            v-if="icon"
            size="48px"
            :icon="icon"
            aria-hidden="true"
          />
        </slot>

        <q-toolbar-title :id="titleId">
          <slot name="title">
            <span class="text-weight-bold">{{ title }}</span>
          </slot>
        </q-toolbar-title>

        <slot name="toolbar-actions"></slot>

        <q-btn
          flat
          round
          dense
          :icon="mdiCloseCircle"
          :aria-label="t('pachiEditDialog.close')"
          @click="onDialogCancel"
        />
      </q-toolbar>

      <q-separator />

      <div class="pachi-dialog-body-split">
        <div class="pachi-dialog-editor-area">
          <sections-container
            ref="sectionsContainer"
            :sections="mainSections"
            :common-props="commonProps"
          />
        </div>
        <div
          v-if="hasSidePanel"
          class="pachi-dialog-side-panel"
        >
          <sections-container
            ref="sideSectionsContainer"
            :sections="sideSections"
            :common-props="commonProps"
          />
        </div>
      </div>

      <div class="pachi-dialog-footer">
        <span
          v-if="savedLabel"
          class="pachi-dialog-footer__saved"
        >{{ savedLabel }}</span>

        <slot name="actionsBefore"></slot>

        <pachi-dialog-edit-actions
          :hasChanges="hasUnsavedChanges"
          :show-labels="showActionLabels"
          @restore="reset"
          @save="save"
          @cancel="onDialogCancel"
        />

        <slot name="actionsAfter"></slot>
        <slot name="actionsafter"></slot>
      </div>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { mdiCloseCircle } from '@quasar/extras/mdi-v7'
import { computed, ref, onUnmounted, useId } from 'vue'
import { useQuasar, useDialogPluginComponent } from 'quasar'
import { usePachiI18n } from '@ilpachi/pachi-i18n'
import { messages } from '../locales'
import { useSectionsManager } from '../composables/useSectionsManager'
import PachiDialogEditActions from './PachiDialogEditActions.vue'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import SectionsContainer from './SectionsContainer.vue'
import type {
  ISectionDefinition,
  SectionsContainerExpose
} from '../types/sections'
import type { AwaitableData } from '../types/dialog'
import { createSubmitGuard } from '../utils/submit-guard'
import '../css/PachiEditDialog.scss'

const $q = useQuasar()
const { t } = usePachiI18n(messages)
const titleId = `pachi-edit-dialog-title-${useId()}`
const emit = defineEmits([...useDialogPluginComponent.emits])

const {
  title,
  sections,
  icon = undefined,
  titleClass = 'bg-primary text-white',
  rounded = false,
  shaped = false,
  top = null,
  left = null,
  bottom = null,
  right = null,
  width = null,
  height = null,
  minWidth = null,
  minHeight = null,
  maxWidth = null,
  maxHeight = null,
  avoidHideWithChanges = false,
  cardClass = '',
  shared = {},
  commonProps = {},
  maximized = false,
  closeOnSave = true,
  showActionLabels = false
} = defineProps<{
  sections: ISectionDefinition[]
  title: string
  icon?: string | undefined
  titleClass?: string
  rounded?: boolean
  shaped?: boolean
  maximized?: boolean
  top?: string | null
  left?: string | null
  bottom?: string | null
  right?: string | null
  width?: string | null
  height?: string | null
  minWidth?: string | null
  minHeight?: string | null
  maxWidth?: string | null
  maxHeight?: string | null
  avoidHideWithChanges?: boolean
  cardClass?: string
  shared?: Record<string, unknown>,
  commonProps?: Record<string, unknown>
  /**
   * Closes the dialog after `onSuccess` (default `true`). With `false` it stays open, the saved state becomes the
   * new baseline and the "saved just now" label appears.
   */
  closeOnSave?: boolean
  /** Shows the text label next to the icon of the action buttons (default `false`: icon only with tooltip). */
  showActionLabels?: boolean
}>()

const { sharedState } = useSectionsManager(shared)

const mainSections = computed(() => sections.filter(s => !s.side))
const sideSections = computed(() => sections.filter(s => s.side === true))
const hasSidePanel = computed(() => sideSections.value.length > 0)

const {
  dialogRef,
  onDialogHide,
  onDialogOK
} = useDialogPluginComponent()

const sectionsContainer = ref<SectionsContainerExpose | null>(null)
const sideSectionsContainer = ref<SectionsContainerExpose | null>(null)

// ── Saved indicator ──────────────────────────────────────────────────────────
const now = ref(Date.now())
const lastSavedAt = ref<number | null>(null)
let clockHandle: ReturnType<typeof setInterval> | null = null

/** Stops the clock of the "saved" indicator. */
function stopClock() {
  if (clockHandle) clearInterval(clockHandle)
  clockHandle = null
}
/** Starts the clock only after a save; it stops by itself after 60s (static label). */
function startClock() {
  stopClock()
  now.value = Date.now()
  clockHandle = setInterval(() => {
    now.value = Date.now()
    if (lastSavedAt.value && now.value - lastSavedAt.value >= 60_000) stopClock()
  }, 1000)
}
onUnmounted(stopClock)

const savedLabel = computed(() => {
  if (!lastSavedAt.value) return null
  const secs = Math.round((now.value - lastSavedAt.value) / 1000)
  if (secs < 2) return t('pachiEditDialog.savedNow')
  if (secs < 60) return t('pachiEditDialog.savedAgo', { seconds: secs })
  return t('pachiEditDialog.saved')
})

// ── Changes ──────────────────────────────────────────────────────────────────
const hasUnsavedChanges = computed(() => {
  return (sectionsContainer.value?.hasChanges() ?? false) ||
         (sideSectionsContainer.value?.hasChanges() ?? false)
})

// ── Save ─────────────────────────────────────────────────────────────────────
// re-entry guard: a second save while the first has not called onSuccess/onError is ignored
const saveGuard = createSubmitGuard()

/** Notifies a save error (even unexpected: validation, results collection) and shakes the dialog. */
function notifySaveError(error: unknown) {
  shakeDialog()
  $q.notify({
    type: 'negative',
    position: 'top',
    message: t('pachiEditDialog.saveError', { error: error instanceof Error ? error.message : String(error) }),
  })
}

async function save() {
  if (!saveGuard.enter()) return
  try {
    const validMain = await sectionsContainer.value?.validateAll() ?? true
    const validSide = hasSidePanel.value
      ? (await sideSectionsContainer.value?.validateAll() ?? true)
      : true

    if (!validMain || !validSide) {
      $q.notify({
        type: 'negative',
        position: 'top',
        message: t('pachiEditDialog.validationErrors')
      })
      shakeDialog()
      saveGuard.leave()
      return
    }

    const mainResults = await sectionsContainer.value?.getResults() ?? {}
    const sideResults = hasSidePanel.value
      ? (await sideSectionsContainer.value?.getResults() ?? {})
      : {}
    const results = { ...mainResults, ...sideResults }

    const emittable: AwaitableData = {
      data: { sections: results, sharedState: sharedState.value },
      onSuccess: () => {
        saveGuard.leave()
        // the saved state becomes the new baseline: closing no longer asks to discard changes
        sectionsContainer.value?.commitAll()
        sideSectionsContainer.value?.commitAll()
        lastSavedAt.value = Date.now()
        startClock()
        if (closeOnSave) dialogRef.value?.hide()
      },
      onError: (error) => {
        saveGuard.leave()
        notifySaveError(error)
      },
    }
    emit('ok', emittable)
  }
  catch (error) {
    saveGuard.leave()
    notifySaveError(error)
  }
}

async function reset() {
  await sectionsContainer.value?.resetAll()
  if (hasSidePanel.value) {
    await sideSectionsContainer.value?.resetAll()
  }
}

// 'shake' is emitted by QDialog both for ESC/outside click with `persistent` (user's attempt to
// close) and for programmatic shake() calls: the latter must be ignored
let internalShake = false
function shakeDialog() {
  const dialog = dialogRef.value as { shake?: () => void } | undefined
  if (typeof dialog?.shake === 'function') {
    internalShake = true
    try { dialog.shake() } finally { internalShake = false }
  }
}
/** ESC/outside click with unsaved changes: offers the close confirmation. */
function onUserDismissAttempt() {
  if (!internalShake) onDialogCancel()
}

/** With unsaved changes (and `avoidHideWithChanges`) the dialog is `persistent`. */
const blockHide = computed(() => avoidHideWithChanges && hasUnsavedChanges.value)

/** Closes the dialog; with unsaved changes it first asks for confirmation. */
let discardOpen = false
function onDialogCancel() {
  if (blockHide.value) {
    // the confirmation is unique: while it is open ESC/backdrop/close do not stack others
    if (discardOpen) return
    discardOpen = true
    $q.dialog({
      title: t('pachiEditDialog.discardTitle'),
      message: t('pachiEditDialog.discardMessage'),
      cancel: true,
      persistent: true
    }).onOk(() => {
      dialogRef.value?.hide()
    }).onDismiss(() => { discardOpen = false })
    return
  }
  dialogRef.value?.hide()
}

defineExpose({
  dialogRef,
  onDialogHide,
  onDialogOK,
  reset,
  shakeDialog
})
</script>
