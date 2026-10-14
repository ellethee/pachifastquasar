<template>
  <q-btn
    flat
    round
    dense
    :icon="isDark ? mdiWeatherSunny : mdiWeatherNight"
    :label="label"
    :aria-label="t('common.toggleTheme')"
    class="q-mr-xs"
    v-bind="$attrs"
    @click="isDark = !isDark"
  >
    <q-tooltip>
      {{ isDark ? t('common.switchToLight') : t('common.switchToDark') }}
    </q-tooltip>
  </q-btn>
</template>
<script setup lang="ts">
import { mdiWeatherNight, mdiWeatherSunny } from '@quasar/extras/mdi-v7'
import { computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { useI18n } from 'vue-i18n'
import { notifyPachiThemeChanged } from '../../helpers/auth-events'
defineProps<{
  label?: string
}>()

/**
 * Persistenza minima del tema nel core: chiave localStorage condivisa con
 * `@ilpachi/fastquasar-settings` (valori 'dark' | 'light' | 'auto'), così la sezione
 * "Aspetto" del package e questo bottone restano allineati senza dipendenza.
 */
const THEME_KEY = 'pachi-prefs-theme'

const $q = useQuasar()
const { t } = useI18n()

onMounted(() => {
  const stored = localStorage.getItem(THEME_KEY)
  if (stored === 'dark') $q.dark.set(true)
  else if (stored === 'light') $q.dark.set(false)
  else if (stored === 'auto') $q.dark.set('auto')
})

const isDark = computed({
  get: () => $q.dark.isActive,
  set: (val: boolean) => {
    $q.dark.set(val)
    localStorage.setItem(THEME_KEY, val ? 'dark' : 'light')
    // evento `pachi:theme-changed`: `@ilpachi/fastquasar-settings` lo salva come impostazione se autenticato
    notifyPachiThemeChanged(val ? 'dark' : 'light')
  }
})
</script>
