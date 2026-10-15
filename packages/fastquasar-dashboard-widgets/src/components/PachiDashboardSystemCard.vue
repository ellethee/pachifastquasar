<template>
  <div class="pachi-pdw-card pachi-dsc-card">
    <div class="pachi-pdw-bg"></div>
    <div class="pachi-pdw-glow"></div>

    <div class="pachi-pdw-top">
      <div class="pachi-pdw-icon">
        <q-icon :name="mdiServerOutline" size="22px" style="color: var(--pachi-accent-ink)" />
      </div>
      <span class="pachi-pdw-code">{{ t('pachiDashboardWidgets.system.code') }}</span>
    </div>

    <h3 class="pachi-pdw-title">{{ t('pachiDashboardWidgets.system.title') }}</h3>

    <div v-if="loading" class="pachi-dsc-rows">
      <div v-for="n in 4" :key="n" class="pachi-dsc-skeleton"></div>
    </div>
    <div v-else-if="error" class="pachi-dsc-empty pachi-dsc-error" role="alert">
      <span>{{ t('pachiDashboardWidgets.system.error') }}</span>
      <q-btn
        flat
        dense
        no-caps
        size="sm"
        type="button"
        :label="t('pachiDashboardWidgets.retry')"
        @click="reload"
      />
    </div>
    <div v-else-if="!info" class="pachi-dsc-empty">
      {{ t('pachiDashboardWidgets.system.empty') }}
    </div>
    <div v-else class="pachi-dsc-rows">
      <div v-if="info.version" class="pachi-dsc-row">
        <span class="pachi-dsc-row__label">{{ t('pachiDashboardWidgets.system.version') }}</span>
        <span class="pachi-dsc-row__value">{{ info.version }}</span>
      </div>
      <div v-if="info.environment" class="pachi-dsc-row">
        <span class="pachi-dsc-row__label">{{ t('pachiDashboardWidgets.system.environment') }}</span>
        <span class="pachi-dsc-row__value">{{ info.environment }}</span>
      </div>
      <div v-if="info.uptime" class="pachi-dsc-row">
        <span class="pachi-dsc-row__label">{{ t('pachiDashboardWidgets.system.uptime') }}</span>
        <span class="pachi-dsc-row__value">{{ info.uptime }}</span>
      </div>
      <div class="pachi-dsc-row">
        <span class="pachi-dsc-row__label">{{ t('pachiDashboardWidgets.system.status') }}</span>
        <span class="pachi-dsc-row__value pachi-dsc-status">
          <span class="pachi-dsc-dot" :class="`pachi-dsc-dot--${info.status}`"></span>
          {{ statusLabel }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { mdiServerOutline } from '@quasar/extras/mdi-v7'
import type { IPachiWidgetsHttp } from '../helpers/http'
import { usePachiWidgetData } from '../helpers/use-widget-data'
import { parseSystemInfo } from '../helpers/validate'
import type { IDashboardSystemInfo } from '../types/dashboard-widgets'
import { usePachiI18n } from '@ilpachi/pachi-i18n'
import { messages } from '../locales'

/**
 * System status dashboard widget: requires `url` (GET JSON, object) and shows the result.
 * Self-contained styles (`pachi-pdw-*` classes, `--pachi-*` defaults at zero specificity): if the app defines the `--pachi-*` variables they take precedence.
 */
const props = withDefaults(
  defineProps<{
    /** Endpoint to query (reactive: a change triggers a new request). */
    url: string
    /** Optional HTTP client; if absent, the one registered with `setPachiWidgetsHttp` is used. */
    http?: IPachiWidgetsHttp
    /** Refresh interval in ms; 0 (default) = no polling. */
    refreshInterval?: number
  }>(),
  { refreshInterval: 0 },
)

const { t } = usePachiI18n(messages)

const { loading, error, data, reload } = usePachiWidgetData<IDashboardSystemInfo | null>({
  url: () => props.url,
  http: () => props.http,
  refreshInterval: () => props.refreshInterval,
  parse: parseSystemInfo,
  empty: null,
})
const info = computed(() => data.value)

const statusLabel = computed(() => {
  const map: Record<string, string> = {
    ok: t('pachiDashboardWidgets.system.statusOk'),
    warn: t('pachiDashboardWidgets.system.statusWarn'),
    error: t('pachiDashboardWidgets.system.statusError'),
  }
  return map[info.value?.status ?? 'ok'] ?? '—'
})
</script>

<style lang="scss">
.pachi-dsc-card {
  cursor: default;
  min-height: 180px;
}

.pachi-dsc-rows {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  position: relative;
  z-index: 1;
}

.pachi-dsc-skeleton {
  height: 18px;
  border-radius: 4px;
  background: linear-gradient(90deg, var(--pachi-surface-2), var(--pachi-surface-3), var(--pachi-surface-2));
  background-size: 200% 100%;
  animation: pachi-dsc-shimmer 1.4s infinite;

  &:nth-child(2) { width: 80%; }
  &:nth-child(3) { width: 65%; }
  &:nth-child(4) { width: 70%; }
}

@keyframes pachi-dsc-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.pachi-dsc-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
}

.pachi-dsc-row__label {
  color: var(--pachi-muted);
}

.pachi-dsc-row__value {
  font-family: var(--pachi-mono);
  color: var(--pachi-ink);
}

.pachi-dsc-status {
  display: flex;
  align-items: center;
  gap: 6px;
}

.pachi-dsc-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;

  &--ok    { background: var(--pachi-accent); }
  &--warn  { background: var(--pachi-amber); }
  &--error { background: var(--pachi-red); }
}

.pachi-dsc-error {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--pachi-red);
}

.pachi-dsc-empty {
  margin-top: 12px;
  font-size: 12px;
  color: var(--pachi-faint);
  font-family: var(--pachi-mono);
  position: relative;
  z-index: 1;
}
</style>
