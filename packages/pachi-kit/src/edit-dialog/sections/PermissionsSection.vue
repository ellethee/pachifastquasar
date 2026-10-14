<template>
  <div class="q-pa-md column q-gutter-md">
    <q-input
      v-model="rolesText"
      @blur="commitText"
      outlined
      :label="t('pachiEditDialog.permissions.roles')"
    />

    <q-input
      v-model="usersText"
      @blur="commitText"
      outlined
      :label="t('pachiEditDialog.permissions.users')"
    />
    <q-banner
      v-if="sharedState?.publishMode"
      rounded
      class="bg-info text-white"
    >
      {{ t('pachiEditDialog.permissions.publishMode', { mode: String(sharedState.publishMode) }) }}
    </q-banner>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { usePachiI18n } from '@ilpachi/pachi-i18n'
import { useSection } from '../composables/useSection'
import { formatList, parseList } from '../utils/permissions'
import type { PermissionsState } from '../types/sections'
import { messages } from '../locales'

const { t } = usePachiI18n(messages)

const props = defineProps<{
  initialValue?: PermissionsState
}>()

const {
  state,
  originalState,
  reset,
  commit: commitState,
  getResults: getState,
  sharedState
} = useSection<PermissionsState>({
  roles: [],
  users: []
}, { initialValue: () => props.initialValue })

// testo grezzo: il parse avviene su blur o in `getResults` (non a ogni tasto)
const rolesText = ref(formatList(state.value.roles))
const usersText = ref(formatList(state.value.users))

/** Stato ricavato dal testo grezzo (puro, non muta nulla). */
function parsedState(): PermissionsState {
  return { roles: parseList(rolesText.value), users: parseList(usersText.value) }
}

/** Applica il testo grezzo allo stato (senza riscrivere il testo). */
function commitText() {
  const parsed = parsedState()
  state.value.roles = parsed.roles
  state.value.users = parsed.users
}

// quando lo stato cambia dall'esterno (reset, initialValue) riallinea il testo,
// ma solo se differisce dal parse corrente (così non si cancellano virgole/spazi in digitazione)
watch(() => JSON.stringify(state.value), () => {
  const parsed = parsedState()
  if (JSON.stringify(parsed.roles) !== JSON.stringify(state.value.roles)) {
    rolesText.value = formatList(state.value.roles)
  }
  if (JSON.stringify(parsed.users) !== JSON.stringify(state.value.users)) {
    usersText.value = formatList(state.value.users)
  }
})

const hasChanges = computed(() => JSON.stringify(parsedState()) !== JSON.stringify(originalState.value))

function getResults(): PermissionsState {
  commitText()
  return getState()
}

/** Dopo il salvataggio: il baseline è lo stato parsato. */
function commit() {
  commitText()
  commitState()
}

function validate() {
  return true
}

defineExpose({
  reset,
  commit,
  getResults,
  hasChanges: () => hasChanges.value,
  validate,
  name: 'PermissionsSection'
})
</script>
