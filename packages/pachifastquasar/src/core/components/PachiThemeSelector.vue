<template>
  <q-btn
    flat
    round
    dense
    :icon="mdiPalette"
    :aria-label="t('themes.tooltip')"
    class="q-mr-xs pachi-app-action-btn pachi-theme-btn"
  >
    <q-tooltip>{{ t('themes.tooltip') }}</q-tooltip>

    <q-menu anchor="bottom right" self="top right" :offset="[0, 10]" class="pachi-theme-menu shadow-8">
      <div class="pachi-theme-menu__header q-pa-sm">
        <div class="row items-center justify-between q-mb-xs">
          <span class="text-caption text-weight-bold text-uppercase">{{ t('themes.title') }}</span>
          <span class="text-caption pachi-theme-menu__muted">{{ currentTheme.label }}</span>
        </div>
        <div class="pachi-theme-mode" role="group">
          <button
            v-for="m in modes"
            :key="m.mode"
            type="button"
            class="pachi-theme-mode__btn"
            :class="{ 'pachi-theme-mode__btn--active': activeMode === m.mode }"
            :aria-pressed="activeMode === m.mode"
            @click="manager.setMode(m.mode)"
          >
            <q-icon :name="m.icon" size="14px" class="q-mr-xs" />
            <span>{{ t(`themes.${m.mode}`) }}</span>
          </button>
        </div>
      </div>

      <q-separator />

      <div class="q-py-xs pachi-theme-list">
        <div
          v-for="th in themes"
          :key="th.id"
          class="pachi-theme-item q-px-sm q-py-xs"
          :class="{ 'pachi-theme-item--active': activeThemeId === th.id }"
          role="button"
          tabindex="0"
          @click="manager.setTheme(th.id)"
          @keydown.enter.prevent="manager.setTheme(th.id)"
          @keydown.space.prevent="manager.setTheme(th.id)"
        >
          <div class="row items-center no-wrap full-width">
            <div
              class="pachi-theme-swatch q-mr-sm"
              :style="{
                background: preview(th).surface,
                borderColor: preview(th).border,
                boxShadow: activeThemeId === th.id ? `0 0 0 2px ${preview(th).accent}` : 'none'
              }"
            >
              <span class="pachi-theme-swatch__dot" :style="{ background: preview(th).accent }"></span>
            </div>
            <div class="col ellipsis">
              <div class="pachi-theme-item__title">{{ th.label }}</div>
              <div class="pachi-theme-item__desc ellipsis">{{ th.tagline }}</div>
            </div>
            <q-icon v-if="activeThemeId === th.id" :name="mdiCheck" size="16px" class="q-ml-xs" />
          </div>
        </div>
      </div>
    </q-menu>
  </q-btn>
</template>

<script setup lang="ts">
import {
  mdiBrightness6,
  mdiCheck,
  mdiPalette,
  mdiWeatherNight,
  mdiWhiteBalanceSunny
} from '@quasar/extras/mdi-v7'
import { useI18n } from 'vue-i18n'
import { ThemeManager } from '../../services/theme-manager'
import type { ColorMode, ThemeDefinition, ThemePreview } from '../../services/theme-manager'

/** Palette button with a menu to choose the theme and the color mode (shown only with `app.themes`). */
const { t } = useI18n()
const manager = ThemeManager.getInstance()
const { activeThemeId, activeMode, currentTheme, themes, isDark } = manager

const modes: { mode: ColorMode; icon: string }[] = [
  { mode: 'dark', icon: mdiWeatherNight },
  { mode: 'light', icon: mdiWhiteBalanceSunny },
  { mode: 'auto', icon: mdiBrightness6 }
]

/** Swatch colors of the theme for the current mode. */
function preview(theme: ThemeDefinition): ThemePreview {
  return isDark.value ? theme.preview.dark : theme.preview.light
}
</script>

<style lang="scss">
.pachi-theme-menu {
  width: 280px;
  max-width: 90vw;
  background: var(--pachi-surface);
  border: 1px solid var(--pachi-border);
  border-radius: var(--pachi-menu-r, 10px);
  overflow: hidden;

  &__header {
    background: var(--pachi-surface-2);
  }

  &__muted {
    color: var(--pachi-muted);
  }
}

.pachi-theme-mode {
  display: flex;
  background: var(--pachi-surface-3);
  border-radius: 6px;
  padding: 2px;
  gap: 2px;

  &__btn {
    flex: 1;
    border: none;
    background: transparent;
    color: var(--pachi-muted);
    font-family: var(--pachi-font);
    font-size: 11px;
    font-weight: 500;
    padding: 4px 6px;
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s ease;

    &:hover {
      color: var(--pachi-ink);
    }

    &--active {
      background: var(--pachi-surface) !important;
      color: var(--pachi-accent) !important;
      box-shadow: 0 1px 3px rgb(0 0 0 / 15%);
    }
  }
}

.pachi-theme-list {
  max-height: 320px;
  overflow-y: auto;
}

.pachi-theme-item {
  cursor: pointer;
  border-radius: 6px;
  margin: 2px 6px;
  transition: background 0.15s ease;

  &:hover,
  &:focus-visible,
  &--active {
    background: var(--pachi-surface-2);
  }

  &:focus-visible {
    outline: 2px solid var(--pachi-accent);
  }

  &__title {
    font-size: 13px;
    font-weight: 500;
    color: var(--pachi-ink);
    line-height: 1.2;
  }

  &__desc {
    font-size: 11px;
    color: var(--pachi-muted);
    line-height: 1.2;
    margin-top: 2px;
  }
}

.pachi-theme-swatch {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: 1px solid;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  transition: box-shadow 0.2s ease;

  &__dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
  }
}
</style>
