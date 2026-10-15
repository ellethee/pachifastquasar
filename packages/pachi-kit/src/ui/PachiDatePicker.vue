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
/** With `clearable` the model can become `null` at runtime (the type stays `string` for compatibility). */
const model = defineModel<string>()
const props = defineProps({
  /** Rounded corners of the `q-input` (default `true`). */
  rounded: { type: Boolean, default: true },
  /** Outlined style of the `q-input` (default `true`). */
  outlined: { type: Boolean, default: true },
  autoClose: {type: Boolean, default: true},
  mask: { type: String, default: 'YYYY-MM-DD HH:mm' },
  /** Read-only: the calendar/clock buttons are disabled and the model does not change. */
  readonly: { type: Boolean, default: false },
  /** Disables the field and the calendar/clock buttons. */
  disable: { type: Boolean, default: false },
  /** 24-hour clock (default `true`); `false` for AM/PM. */
  format24h: { type: Boolean, default: true },
})
/** `true` if the popup triggers must be inert. */
const locked = computed(() => props.readonly || props.disable)
</script>

<style lang="scss">
.q-menu.pachi-date-picker-menu {
  border-radius: var(--pachi-card-r);
}
</style>
