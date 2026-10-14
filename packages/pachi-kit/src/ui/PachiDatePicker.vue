<template>
  <q-input
    v-model="model"
    :rounded="rounded"
    :outlined="outlined"
    :readonly="readonly"
    :disable="disable"
    class="pachi-date-picker"
  >
    <template #append>
      <q-btn
        flat
        round
        dense
        :icon="mdiCalendar"
        :disable="locked"
        :aria-label="t('pachiUi.datePicker.openDate')"
      >
        <q-popup-proxy
          ref="dataProxy"
          content-class="pachi-date-picker-menu"
          cover
          transition-show="scale"
          transition-hide="scale"
        >
          <q-date
            v-model="model"
            :mask="mask"
            today-btn
            @update:model-value="autoClose && dataProxy!.hide()"
          >
            <div class="row items-center justify-end">
              <q-btn
                v-close-popup
                color="primary"
                round
                :icon="mdiClose"
                :aria-label="t('pachiUi.datePicker.close')"
                flat
              />
            </div>
          </q-date>
        </q-popup-proxy>
      </q-btn>
      <q-btn
        flat
        round
        dense
        :icon="mdiClockOutline"
        :disable="locked"
        :aria-label="t('pachiUi.datePicker.openTime')"
      >
        <q-popup-proxy cover transition-show="scale" transition-hide="scale">
          <q-time v-model="model" :mask="mask" :format24h="format24h">
            <div class="row items-center justify-end">
              <q-btn
                v-close-popup
                :label="t('pachiUi.datePicker.close')"
                color="primary"
                flat
              />
            </div>
          </q-time>
        </q-popup-proxy>
      </q-btn>
    </template>
  </q-input>
</template>
<script lang="ts" setup>
import { mdiCalendar, mdiClockOutline, mdiClose } from '@quasar/extras/mdi-v7'
import type { QPopupProxy } from 'quasar'
import { computed, useTemplateRef } from 'vue'
import { usePachiI18n } from '@ilpachi/pachi-i18n'
import { messages } from './locales'
const { t } = usePachiI18n(messages)
const dataProxy = useTemplateRef<QPopupProxy>('dataProxy')
/** Con `clearable` il modello può diventare `null` a runtime (il tipo resta `string` per compatibilità). */
const model = defineModel<string>()
const props = defineProps({
  /** Angoli arrotondati del `q-input` (default `true`). */
  rounded: { type: Boolean, default: true },
  /** Stile outlined del `q-input` (default `true`). */
  outlined: { type: Boolean, default: true },
  autoClose: {type: Boolean, default: true},
  mask: { type: String, default: 'YYYY-MM-DD HH:mm' },
  /** Sola lettura: i pulsanti calendario/orologio sono disabilitati e il modello non cambia. */
  readonly: { type: Boolean, default: false },
  /** Disabilita il campo e i pulsanti calendario/orologio. */
  disable: { type: Boolean, default: false },
  /** Orologio in formato 24 ore (default `true`); `false` per AM/PM. */
  format24h: { type: Boolean, default: true },
})
/** `true` se i trigger dei popup devono essere inerti. */
const locked = computed(() => props.readonly || props.disable)
</script>

<style lang="scss">
.q-menu.pachi-date-picker-menu {
  border-radius: var(--pachi-card-r);
}
</style>
