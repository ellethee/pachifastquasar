<template>
  <div class="full-width">
    <div class="row q-gutter-sm items-center q-mb-md">
      <q-select
        v-model="themeId"
        :options="themeIds"
        label="Theme id"
        dense
        outlined
        style="min-width: 160px"
        @update:model-value="manager.setTheme($event)"
      />
      <q-btn-toggle
        v-model="mode"
        :options="modes"
        no-caps
        unelevated
        toggle-color="primary"
        @update:model-value="manager.setMode($event)"
      />
      <span class="text-caption text-grey-7">
        Needs <code>themes.css</code> (loaded by the playground). Changes persist in localStorage.
      </span>
    </div>
    <div class="row q-col-gutter-sm">
      <div v-for="token in tokens" :key="token.name" class="col-6 col-sm-4 col-md-3 col-lg-2">
        <div class="tokens__swatch" :style="{ background: `var(${token.name})` }" />
        <div class="text-caption ellipsis" :title="token.name">{{ token.name }}</div>
        <div class="text-caption text-grey-7 ellipsis" :title="token.value">
          {{ token.value || '(unset)' }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { ThemeManager, getPachiThemes } from '@ilpachi/pachifastquasar'
import type { ColorMode } from '@ilpachi/pachifastquasar'

/** Color tokens shown as swatches (non-color tokens like radii are omitted). */
const TOKEN_NAMES = [
  '--pachi-bg', '--pachi-surface', '--pachi-surface-2', '--pachi-surface-3',
  '--pachi-border', '--pachi-border-hi', '--pachi-ink', '--pachi-ink-2', '--pachi-muted',
  '--pachi-faint', '--pachi-accent', '--pachi-accent-deep', '--pachi-accent-mid',
  '--pachi-accent-soft', '--pachi-accent-ink', '--pachi-green', '--pachi-red', '--pachi-red-soft',
  '--pachi-blue', '--pachi-blue-soft', '--pachi-amber', '--pachi-amber-soft',
  '--pachi-card-bg', '--pachi-card-border', '--pachi-icon-bg', '--pachi-card-footer-bg'
]

const manager = ThemeManager.getInstance()
// Idempotent: normally already done by `createPachiApp` when `app.themes` is on.
manager.init()
const themeId = ref(manager.activeThemeId.value)
const mode = ref<ColorMode>(manager.activeMode.value)
const themeIds = getPachiThemes().map(t => t.id)
const modes: { label: string; value: ColorMode }[] = [
  { label: 'Dark', value: 'dark' },
  { label: 'Light', value: 'light' },
  { label: 'Auto', value: 'auto' }
]
const tokens = ref<{ name: string; value: string }[]>([])
let timer: ReturnType<typeof setInterval> | undefined

/** Reads the current token values from `<body>` (where themes set `data-theme`). */
function refresh(): void {
  const style = getComputedStyle(document.body)
  tokens.value = TOKEN_NAMES.map(name => ({ name, value: style.getPropertyValue(name).trim() }))
}

// Polling also catches SCSS hot reloads and mode changes made elsewhere (e.g. the app bar).
onMounted(() => {
  refresh()
  timer = setInterval(() => {
    themeId.value = manager.activeThemeId.value
    mode.value = manager.activeMode.value
    refresh()
  }, 500)
})
onBeforeUnmount(() => clearInterval(timer))
</script>

<style>
.tokens__swatch {
  height: 40px;
  border-radius: 6px;
  border: 1px solid var(--pachi-border, rgba(128, 128, 128, 0.4));
}
</style>
