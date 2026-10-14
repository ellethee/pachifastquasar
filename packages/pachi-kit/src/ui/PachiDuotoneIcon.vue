<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    :style="{ color }"
    :role="title ? 'img' : undefined"
    :aria-label="title || undefined"
    :aria-hidden="title ? undefined : 'true'"
  >
    <title v-if="title">{{ title }}</title>
    <path :d="icon.secondary" fill="currentColor" :opacity="secondaryOpacity" />
    <path :d="icon.primary" fill="currentColor" />
  </svg>
</template>

<script setup lang="ts">
import type { DuotoneIcon } from './types/duotone-icon'

withDefaults(defineProps<{
  icon: DuotoneIcon
  size?: string | number
  color?: string
  secondaryOpacity?: number
  /** Titolo accessibile: se presente l'icona e' esposta (`role="img"`), altrimenti e' decorativa (`aria-hidden`). */
  title?: string
}>(), {
  size: 24,
  color: 'currentColor',
  secondaryOpacity: 0.4,
})
</script>
