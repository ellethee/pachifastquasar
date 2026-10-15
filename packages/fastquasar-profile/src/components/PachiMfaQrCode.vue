<template>
  <div class="pachi-profile-qr" role="img" :aria-label="label">
    <svg
      v-if="path"
      class="pachi-profile-qr__svg"
      :viewBox="viewBox"
      shape-rendering="crispEdges"
      aria-hidden="true"
    >
      <rect :width="size" :height="size" fill="#ffffff" />
      <path :d="path" fill="#000000" :transform="`translate(${QUIET},${QUIET})`" />
    </svg>
    <q-spinner v-else-if="!failed" size="sm" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import '../styles/security.scss'
import { buildQrMatrix, qrMatrixToPath } from '../helpers/mfa'

/**
 * SVG QR code for a text (e.g. an `otpauth://` URI). White background and a 4-module quiet zone so it is
 * readable in the dark theme too. The library is loaded lazily.
 */
const props = defineProps<{
  /** Content to encode. */
  value: string
  /** Alternative text of the code. */
  label: string
}>()

const QUIET = 4
const path = ref('')
const modules = ref(0)
const failed = ref(false)

const size = computed(() => modules.value + QUIET * 2)
const viewBox = computed(() => `0 0 ${size.value} ${size.value}`)

watch(
  () => props.value,
  async (value) => {
    path.value = ''
    failed.value = false
    if (!value) return
    try {
      const matrix = await buildQrMatrix(value)
      modules.value = matrix.length
      path.value = qrMatrixToPath(matrix)
    } catch {
      failed.value = true
    }
  },
  { immediate: true }
)
</script>
