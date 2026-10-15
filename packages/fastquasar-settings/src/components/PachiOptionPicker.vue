<template>
  <div class="pachi-st-picker">
    <div v-if="label" class="pachi-st-setting-label">{{ label }}</div>

    <!-- Theme: previews -->
    <div v-if="variant === 'theme'" class="pachi-st-theme-grid">
      <button
        v-for="o in items"
        :key="o.value"
        type="button"
        class="pachi-st-theme-swatch"
        :class="{ 'pachi-st-theme-swatch--active': modelValue === o.value }"
        :aria-pressed="modelValue === o.value"
        @click="emit('update:modelValue', o.value)"
      >
        <div class="pachi-st-theme-swatch__preview" :style="{ background: THEME_PREVIEWS[o.value]?.bg ?? 'var(--pachi-surface-3)' }">
          <div
            v-if="THEME_PREVIEWS[o.value]?.card"
            class="pachi-st-theme-swatch__card"
            :style="{ background: THEME_PREVIEWS[o.value]?.card }"
          ></div>
        </div>
        <div class="pachi-st-theme-swatch__footer">
          <span
            class="pachi-st-theme-swatch__label"
            :class="{ 'pachi-st-theme-swatch__label--active': modelValue === o.value }"
          >{{ o.label }}</span>
          <span v-if="modelValue === o.value" class="pachi-st-theme-swatch__check"><q-icon :name="mdiCheck" size="14px" /></span>
        </div>
      </button>
    </div>

    <!-- Accent: coloured pills -->
    <div v-else-if="variant === 'accent'" class="pachi-st-accent-row">
      <button
        v-for="o in items"
        :key="o.value"
        type="button"
        class="pachi-st-accent-pill"
        :class="{ 'pachi-st-accent-pill--active': modelValue === o.value }"
        :aria-pressed="modelValue === o.value"
        :style="modelValue === o.value && accentHex(o.value) ? { borderColor: accentHex(o.value) } : {}"
        @click="emit('update:modelValue', o.value)"
      >
        <span
          class="pachi-st-accent-dot"
          :style="{ background: accentHex(o.value) ?? 'var(--pachi-muted)', boxShadow: `0 0 8px ${accentHex(o.value) ?? '#888888'}66` }"
        ></span>
        <span class="pachi-st-accent-label" :class="{ 'pachi-st-accent-label--active': modelValue === o.value }">{{ o.label }}</span>
      </button>
    </div>

    <!-- Other short choices (density, ...): segmented toggle -->
    <div v-else class="pachi-st-density-toggle">
      <button
        v-for="o in items"
        :key="o.value"
        type="button"
        class="pachi-st-density-option"
        :class="{ 'pachi-st-density-option--active': modelValue === o.value }"
        :aria-pressed="modelValue === o.value"
        @click="emit('update:modelValue', o.value)"
      >
        {{ o.label }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { mdiCheck } from '@quasar/extras/mdi-v7'
import { computed } from 'vue'
import { usePachiI18n } from '@ilpachi/pachi-i18n'
import { messages } from '../locales'
import { ACCENT_PRESETS } from '../services/appliers'

/**
 * Single choice with a dedicated look: `theme` (light/dark/system previews), `accent` (coloured pills) or
 * `segmented` (toggle). Used by the "Appearance" section (`appearance` schema or local fallback).
 */
defineOptions({ inheritAttrs: false })

/** Option as in the `properties.options` of a `select` field. */
interface IOption {
  label?: string
  value: string
}

const props = defineProps<{
  modelValue?: string | null
  /** Options `{ label, value }` (as for `QSelect`). */
  options?: IOption[]
  /** Group title. */
  label?: string
  /** Look: `theme` | `accent` | `segmented`. */
  variant: 'theme' | 'accent' | 'segmented'
}>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const { t, locale } = usePachiI18n(messages)

/** Theme picker previews. */
const THEME_PREVIEWS: Record<string, { bg: string; card: string }> = {
  dark: { bg: '#0A0D12', card: '#10141B' },
  light: { bg: '#F4F5F7', card: '#FFFFFF' },
  auto: { bg: 'linear-gradient(90deg, #F4F5F7 50%, #0A0D12 50%)', card: '' },
}

/** Colour of a known accent. */
function accentHex(value: string): string | undefined {
  return ACCENT_PRESETS[value]?.accent
}

/** Local label (themes/accents) when the backend did not provide the text. */
function fallbackLabel(value: string): string {
  void locale.value
  if (props.variant === 'theme' && value in THEME_PREVIEWS) return t(`pachiSettings.themes.${value}`)
  if (props.variant === 'accent' && value in ACCENT_PRESETS) return t(`pachiSettings.accents.${value}`)
  return value
}

const items = computed(() =>
  (props.options ?? []).map((o) => ({ value: String(o.value), label: o.label ?? fallbackLabel(String(o.value)) }))
)
</script>
