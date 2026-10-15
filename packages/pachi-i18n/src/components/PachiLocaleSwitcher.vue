<template>
  <q-btn
    flat
    round
    dense
    :icon="mdiTranslate"
    :aria-label="t('pachiI18n.changeLanguage')"
    v-bind="$attrs"
  >
    <q-tooltip>{{ t('pachiI18n.changeLanguage') }}</q-tooltip>
    <q-menu auto-close>
      <q-list dense style="min-width: 160px">
        <q-item-label header>{{ t('pachiI18n.language') }}</q-item-label>
        <q-item
          v-for="code in availableLocales"
          :key="code"
          clickable
          :active="code === locale"
          :lang="code"
          :aria-current="code === locale ? 'true' : undefined"
          @click="setLocale(code)"
        >
          <q-item-section>{{ labelOf(code) }}</q-item-section>
          <q-item-section v-if="code === locale" side>
            <q-icon :name="mdiCheck" size="18px" />
          </q-item-section>
        </q-item>
      </q-list>
    </q-menu>
  </q-btn>
</template>

<script setup lang="ts">
import { mdiCheck, mdiTranslate } from '@quasar/extras/mdi-v7'
import { useLocale } from '../composables/use-locale'
import { usePachiI18n } from '../composables/use-pachi-i18n'
import { messages } from '../locales'

defineOptions({ inheritAttrs: false })

/**
 * Language selector: no locale is hardcoded, the list derives from the registered messages
 * (`availableLocales`); each locale is shown with its own native name.
 */
const { t } = usePachiI18n(messages)
const { locale, availableLocales, setLocale, labelOf } = useLocale()
</script>
