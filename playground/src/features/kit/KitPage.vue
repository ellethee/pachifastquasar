<template>
  <q-page padding class="column q-gutter-md">
    <div>
      Name:
      <span class="text-primary cursor-pointer" data-test="kit-name">{{ name }}</span>
      <pachi-popup-edit v-model="name" title="Name" :rules="[(v) => !!v || 'Required']" />
    </div>
    <div>
      <pachi-duotone-icon :icon="duotone" title="Duotone icon" />
    </div>
    <div>
      <q-btn label="Confirm" data-test="kit-confirm" @click="confirm" />
      <span class="q-ml-md" data-test="kit-result">{{ result }}</span>
    </div>
    <div>
      <q-btn label="Dialog" data-test="kit-dialog" @click="showDialog" />
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { h, ref } from 'vue'
import { useQuasar } from 'quasar'
import { mdiPuzzleOutline } from '@quasar/extras/mdi-v7'
import { PachiConfirmDialog, PachiDuotoneIcon, PachiPopupEdit } from '@ilpachi/pachi-kit/ui'
import { usePachiDialog } from '@ilpachi/pachi-kit/dialog'

/** Two-tone icon (primary path at full opacity, secondary reduced). */
const duotone = { primary: mdiPuzzleOutline, secondary: mdiPuzzleOutline }
const $q = useQuasar()
const createDialog = usePachiDialog()
const name = ref('Example')
const result = ref('')

/** Opens the confirm dialog of `pachi-kit/ui`. */
function confirm(): void {
  $q.dialog({
    component: PachiConfirmDialog,
    componentProps: {
      title: 'Example confirmation',
      description: 'Confirm dialog from pachi-kit/ui.',
      tone: 'info',
      submitLabel: 'Proceed'
    }
  }).onOk(() => {
    result.value = 'confirmed'
  })
}

/** Opens a `PachiDialog` of `pachi-kit/dialog` with render-function content. */
function showDialog(): void {
  createDialog({ title: 'Dialog', content: () => h('p', 'Dialog from pachi-kit/dialog.') })
}
</script>
