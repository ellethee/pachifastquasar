<template>
  <component :is="logo" v-if="isComponent" class="pachi-logo" />
  <q-icon v-else :name="logo as string" :size="size" class="pachi-logo" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { getPachiConfig } from '../config'
import type { PachiLogo } from '../config'
import { pachiLogo } from '../../extras/pachi-icons'

/**
 * Logo dell'app: usa `config.logo` (path SVG, `img:<url>` o componente Vue) con il logo Pachi come default.
 * Il `logo` può essere passato anche come prop (precedenza sulla config).
 */
const props = withDefaults(
  defineProps<{
    /** logo da mostrare al posto di `config.logo` */
    value?: PachiLogo | undefined
    /** dimensione dell'icona (CSS) */
    size?: string
  }>(),
  { value: undefined, size: '20px' }
)

const logo = computed<PachiLogo>(() => props.value ?? getPachiConfig().logo ?? pachiLogo)
const isComponent = computed(() => typeof logo.value !== 'string')
</script>
