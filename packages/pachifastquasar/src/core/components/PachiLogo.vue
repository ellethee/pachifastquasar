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
 * App logo: uses `config.logo` (SVG path, `img:<url>` or Vue component) with the Pachi logo as default.
 * The `logo` can also be passed as a prop (takes precedence over the config).
 */
const props = withDefaults(
  defineProps<{
    /** logo to show instead of `config.logo` */
    value?: PachiLogo | undefined
    /** icon size (CSS) */
    size?: string
  }>(),
  { value: undefined, size: '20px' }
)

const logo = computed<PachiLogo>(() => props.value ?? getPachiConfig().logo ?? pachiLogo)
const isComponent = computed(() => typeof logo.value !== 'string')
</script>
