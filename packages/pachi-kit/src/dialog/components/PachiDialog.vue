<template>
  <q-dialog
    ref="dialogRef"
    backdrop-filter="blur(4px) saturate(150%)"
    :persistent="blockHide"
    :aria-labelledby="titleId"
    @hide="onDialogHide"
    @shake="onUserDismissAttempt"
  >
    <q-card
      :class="{ 'q-dialog-plugin': true , 'pachi-dialog': true, 'pachi-rounded': rounded, 'pachi-shaped': shaped, ...(cardClass ? { [cardClass]: true } : {}) }"
      :style="{ top, left, bottom, right, width, height, minWidth, minHeight, maxWidth, maxHeight }"
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
        <div ref="toolbarPortal" class="pachi-dialog-toolbar-portal"></div>
        <q-btn
          flat
          round
          dense
          :icon="mdiCloseCircle"
          :aria-label="t('pachiDialog.close')"
          @click="onDialogCancel"
        />
      </q-toolbar>
      <q-separator />
      <q-card-section class="pachi-dialog-content">
        <slot>
          <component
            :is="content"
            v-if="content"
            v-bind="contentProps"
          />
        </slot>
      </q-card-section>
      <q-card-actions
        align="right"
        :class="actionClasses"
      >
        <slot name="actionsBefore"></slot>
        <slot name="actions">
          <pachi-dialog-edit-actions
            v-if="useEditActions"
            :hasChanges="hasChanges"
            :show-labels="showActionLabels"
            @restore="$emit('edit:restore')"
            @save="onEditSave"
            @cancel="onDialogCancel"
          />
          <div v-else>
            <pachi-dialog-actions
              :confirmDisabled="confirmDisabled"
              :cancelDisabled="cancelDisabled"
              :show-labels="showActionLabels"
              @action:ok="onLocalOkClicked"
              @action:cancel="onDialogCancel"
            />
          </div>
        </slot>
        <slot name="actionsafter"></slot>
        <slot name="actionsAfter"></slot>
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>
<script setup lang="ts">
import { mdiCloseCircle } from '@quasar/extras/mdi-v7'
import '../css/PachiDialog.scss'

import { useDialogPluginComponent, useQuasar } from 'quasar'
import { computed, provide, ref, useId, useTemplateRef, watch } from 'vue'
import { usePachiI18n } from '@ilpachi/pachi-i18n'
import { messages } from '../locales'
import type { IPachiDialogProps } from '../types/PachiDialog'
import { PACHI_DIALOG_TOOLBAR_KEY } from '../composables/usePachiDialogToolbar'
import { createSubmitGuard } from '../utils/submit-guard'

interface AwaitableEmit<T> {
  data: T
  onSuccess: () => void
  onError: (error: unknown) => void
}
import PachiDialogEditActions from './PachiDialogEditActions.vue'
import PachiDialogActions from './PachiDialogActions.vue'
const $q = useQuasar()
const { t } = usePachiI18n(messages)
const toolbarPortal = useTemplateRef<HTMLElement>('toolbarPortal')
provide(PACHI_DIALOG_TOOLBAR_KEY, toolbarPortal)
const titleId = `pachi-dialog-title-${useId()}`
const {
  dialogRef, onDialogHide, onDialogOK,
} = useDialogPluginComponent()
const emit = defineEmits([...useDialogPluginComponent.emits, 'edit:restore', 'edit:save', 'edit:cancel'])

const {
  title,
  icon = null,
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
  actionClasses = [],
  confirmDisabled = false,
  cancelDisabled = false,
  showActionLabels = false,
  cardClass = null,
  useEditActions = false,
  hasChanges = false,
  avoidHideWithChanges = true,
  content = undefined,
  contentProps = undefined,
} = defineProps<IPachiDialogProps>()
function show() {
  dialogRef.value?.show()
}
function hide() {
  dialogRef.value?.hide()
}
// 'shake' viene emesso da QDialog sia per ESC/click esterno con `persistent` (tentativo di chiusura
// dell'utente) sia per shake() programmatici: questi ultimi vanno ignorati
let internalShake = false
function shakeDialog() {
  const dialog = dialogRef.value as { shake?: () => void } | undefined
  if (typeof dialog?.shake === 'function') {
    internalShake = true
    try { dialog.shake() } finally { internalShake = false }
  }
}
/** ESC/click esterno con modifiche non salvate: propone la conferma di chiusura. */
function onUserDismissAttempt() {
  if (!internalShake) onDialogCancel()
}
// true dopo un salvataggio riuscito: le modifiche non sono più "da scartare"
const saved = ref(false)
watch(() => hasChanges, () => { saved.value = false })
/** Con modifiche non salvate il dialog è `persistent` (ESC/click esterno non lo chiudono). */
const blockHide = computed(() => avoidHideWithChanges && useEditActions && hasChanges && !saved.value)

/** Segnala che le modifiche sono state salvate: la chiusura non chiede più conferma. */
function markSaved() {
  saved.value = true
}
// anti-rientro: un secondo click mentre il salvataggio e' in corso viene ignorato
const saveGuard = createSubmitGuard()
// la conferma di scarto e' unica: finche' e' aperta ESC/backdrop/chiudi non ne aprono altre
let discardOpen = false
function onLocalOkClicked() {
  if (!saveGuard.enter()) return
  const awaitable: AwaitableEmit<void> = {
    data: undefined,
    onSuccess: () => { saveGuard.leave(); markSaved(); hide() },
    onError: (error) => { saveGuard.leave(); onSaveError(error) },
  }
  emit('ok', awaitable)  // emette 'ok' senza chiudere — la chiusura spetta all'awaitable.onSuccess()
}
function onSaveError(error: unknown) {
  $q.notify({
    type: 'negative',
    message: error instanceof Error ? error.message : String(error),
    position: 'center',
    timeout: 3000,
  })
  shakeDialog()
}
/** Salvataggio con le azioni di modifica: l'`onSuccess` azzera lo stato "modificato" senza chiudere. */
function onEditSave() {
  if (!saveGuard.enter()) return
  const awaitable: AwaitableEmit<void> = {
    data: undefined,
    onSuccess: () => { saveGuard.leave(); markSaved() },
    onError: (error) => { saveGuard.leave(); onSaveError(error) },
  }
  emit('edit:save', awaitable)
}
/**
 * Chiude il dialog senza salvare (pulsante chiudi/annulla della toolbar o delle azioni, ESC/click esterno
 * con modifiche): emette `edit:cancel` e chiude. Con modifiche non salvate chiede prima conferma
 * e `edit:cancel` e' emesso solo se l'utente conferma di scartarle.
 */
function onDialogCancel() {
  if (blockHide.value) {
    if (discardOpen) return
    discardOpen = true
    $q.dialog({
      title: t('pachiDialog.discardTitle'),
      message: t('pachiDialog.discardMessage'),
      cancel: true,
      persistent: true,
    }).onOk(() => {
      saved.value = true
      emit('edit:cancel')
      hide()
    }).onDismiss(() => { discardOpen = false })
  }
  else {
    emit('edit:cancel')
    hide()
  }
}
defineExpose({
  dialogRef,
  onDialogHide,
  onDialogOK,
  onLocalOkClicked,
  show,
  hide,
  markSaved,
  toolbarPortal,
})
</script>
