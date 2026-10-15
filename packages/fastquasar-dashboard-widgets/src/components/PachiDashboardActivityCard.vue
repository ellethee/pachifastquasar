<template>
  <div class="pachi-pdw-card pachi-dac-card">
    <div class="pachi-pdw-bg"></div>
    <div class="pachi-pdw-glow"></div>

    <div class="pachi-pdw-top">
      <div class="pachi-pdw-icon">
        <q-icon :name="mdiHistory" size="22px" style="color: var(--pachi-accent-ink)" />
      </div>
      <span class="pachi-pdw-code">{{ t('pachiDashboardWidgets.activity.code') }}</span>
    </div>

    <h3 class="pachi-pdw-title">{{ t('pachiDashboardWidgets.activity.title') }}</h3>

    <div v-if="loading" class="pachi-dac-list">
      <div v-for="n in 5" :key="n" class="pachi-dac-skeleton"></div>
    </div>
    <div v-else-if="error" class="pachi-dac-empty pachi-dac-error" role="alert">
      <span>{{ t('pachiDashboardWidgets.activity.error') }}</span>
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
    <div v-else-if="activities.length === 0" class="pachi-dac-empty">
      {{ t('pachiDashboardWidgets.activity.empty') }}
    </div>
    <div v-else class="pachi-dac-list">
      <div v-for="(item, i) in activities" :key="item.id ?? `${item.timestamp}-${i}`" class="pachi-dac-item row">
        <q-icon
          :name="mdiCircleSmall"
          size="16px"
          style="color: var(--pachi-accent-ink); flex-shrink: 0"
        />
        <div class="pachi-dac-item__label">{{ item.description || item.path }}</div>
        <span class="pachi-dac-item__time">{{ date.formatDate(item.timestamp, 'HH:mm:ss') }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { mdiHistory, mdiCircleSmall } from '@quasar/extras/mdi-v7'
import type { IPachiWidgetsHttp } from '../helpers/http'
import { usePachiWidgetData } from '../helpers/use-widget-data'
import { parseActivities } from '../helpers/validate'
import type { IDashboardActivity } from '../types/dashboard-widgets'
import { date } from 'quasar'
import { usePachiI18n } from '@ilpachi/pachi-i18n'
import { messages } from '../locales'

/**
 * Recent activity dashboard widget: requires `url` (GET JSON, array of activities) and shows them as text.
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

const { loading, error, data, reload } = usePachiWidgetData<IDashboardActivity[]>({
  url: () => props.url,
  http: () => props.http,
  refreshInterval: () => props.refreshInterval,
  parse: parseActivities,
  empty: [],
})
const activities = computed(() => data.value)
</script>

<style lang="scss">
.pachi-dac-card {
  cursor: default;
  min-height: 180px;
}

.pachi-dac-list {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  position: relative;
  z-index: 1;
}

.pachi-dac-skeleton {
  height: 20px;
  border-radius: 4px;
  background: linear-gradient(90deg, var(--pachi-surface-2), var(--pachi-surface-3), var(--pachi-surface-2));
  background-size: 200% 100%;
  animation: pachi-dac-shimmer 1.4s infinite;

  &:nth-child(2) { width: 85%; }
  &:nth-child(3) { width: 92%; }
  &:nth-child(4) { width: 78%; }
  &:nth-child(5) { width: 88%; }
}

@keyframes pachi-dac-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.pachi-dac-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--pachi-ink);
  line-height: 1.4;
}

.pachi-dac-item__label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pachi-dac-item__time {
  font-family: var(--pachi-mono);
  font-size: 10px;
  color: var(--pachi-muted);
  flex-shrink: 0;
}

.pachi-dac-error {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--pachi-red);
}

.pachi-dac-empty {
  margin-top: 12px;
  font-size: 12px;
  color: var(--pachi-faint);
  font-family: var(--pachi-mono);
  position: relative;
  z-index: 1;
}
</style>
