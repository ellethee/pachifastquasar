<template>
  <q-page padding class="column q-gutter-md">
    <div>
      Nome:
      <span class="text-primary cursor-pointer" data-test="kit-name">{{ name }}</span>
      <pachi-popup-edit v-model="name" title="Nome" :rules="[(v) => !!v || 'Obbligatorio']" />
    </div>
    <div>
      <pachi-duotone-icon :icon="duotone" title="Icona duotone" />
    </div>
    <div>
      <q-btn label="Conferma" data-test="kit-confirm" @click="confirm" />
      <span class="q-ml-md" data-test="kit-result">{{ result }}</span>
    </div>
    <div>
      <q-btn label="Dialogo" data-test="kit-dialog" @click="showDialog" />
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { h, ref } from 'vue'
import { useQuasar } from 'quasar'
import { mdiPuzzleOutline } from '@quasar/extras/mdi-v7'
import { PachiConfirmDialog, PachiDuotoneIcon, PachiPopupEdit } from '@ilpachi/pachi-kit/ui'
import { usePachiDialog } from '@ilpachi/pachi-kit/dialog'

/** Icona a due toni (path primario a piena opacità, secondario ridotto). */
const duotone = { primary: mdiPuzzleOutline, secondary: mdiPuzzleOutline }
const $q = useQuasar()
const createDialog = usePachiDialog()
const name = ref('Esempio')
const result = ref('')

/** Apre il dialogo di conferma di `pachi-kit/ui`. */
function confirm(): void {
  $q.dialog({
    component: PachiConfirmDialog,
    componentProps: {
      title: 'Conferma esempio',
      description: 'Dialogo di conferma di pachi-kit/ui.',
      tone: 'info',
      submitLabel: 'Procedi'
    }
  }).onOk(() => {
    result.value = 'confermato'
  })
}

/** Apre un `PachiDialog` di `pachi-kit/dialog` con contenuto a render function. */
function showDialog(): void {
  createDialog({ title: 'Dialogo', content: () => h('p', 'Dialogo di pachi-kit/dialog.') })
}
</script>
