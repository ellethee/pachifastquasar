<template>
  <div class="pachi-loading-state">
    <!-- Skeleton header -->
    <div class="pachi-loading-state__header">
      <div
        v-for="i in columns"
        :key="i"
        class="pachi-esk"
        :style="{ width: i === 4 ? '40%' : '70%', height: '9px', opacity: 0.5 }"
      ></div>
    </div>

    <!-- Skeleton rows -->
    <div v-for="i in 8" :key="i" class="pachi-loading-state__row">
      <div class="pachi-esk" style="width: 13px; height: 13px; border-radius: 3px"></div>
      <div class="pachi-esk" style="width: 36px"></div>
      <div class="pachi-esk" style="width: 60px; height: 18px; border-radius: 4px"></div>
      <div class="pachi-esk" :style="{ width: rowWidths[i - 1] }"></div>
      <div class="pachi-esk" style="width: 80px"></div>
      <div class="pachi-esk" style="width: 80px"></div>
      <div
        class="pachi-esk"
        style="width: 48px; height: 18px; border-radius: 11px; margin: 0 auto"
      ></div>
      <div class="pachi-esk" style="width: 36px; margin-left: auto"></div>
    </div>

    <div class="pachi-loading-state__spacer"></div>

    <!-- Footer with spinner -->
    <div class="pachi-loading-state__footer">
      <div class="pachi-loading-state__spinner"></div>
      <span class="pachi-loading-state__label">{{ label || t('common.loading') }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

withDefaults(
  defineProps<{
    /** Footer label; default is translated (`common.loading`). */
    label?: string
    columns?: number
  }>(),
  {
    label: '',
    columns: 8
  }
)

const { t } = useI18n()

const rowWidths = ['85%', '62%', '78%', '55%', '70%', '88%', '60%', '72%']
</script>

<style lang="scss">
@keyframes esh {
  0% {
    background-position: -400px 0;
  }

  100% {
    background-position: 400px 0;
  }
}

@keyframes esspin {
  to {
    transform: rotate(360deg);
  }
}

.pachi-esk {
  background: linear-gradient(
    90deg,
    var(--pachi-surface-2) 0%,
    var(--pachi-surface-3) 50%,
    var(--pachi-surface-2) 100%
  );
  background-size: 800px 100%;
  animation: esh 1.4s linear infinite;
  border-radius: 4px;
  height: 12px;
  flex-shrink: 0;
}

.pachi-loading-state {
  flex: 1;
  border: 1px solid var(--pachi-border);
  border-radius: var(--pachi-card-r);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 200px;
  background: var(--pachi-surface);

  &__header {
    background: var(--pachi-surface-2);
    border-bottom: 1px solid var(--pachi-border);
    padding: 10px 12px;
    display: flex;
    gap: 10px;
    align-items: center;
  }

  &__row {
    padding: 12px;
    display: flex;
    gap: 10px;
    align-items: center;
    border-bottom: 1px solid var(--pachi-border);

    &:last-of-type {
      border-bottom: none;
    }
  }

  &__spacer {
    flex: 1;
    background: var(--pachi-surface);
  }

  &__footer {
    padding: 9px 14px;
    border-top: 1px solid var(--pachi-border);
    background: var(--pachi-surface-2);
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }

  &__spinner {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    border: 2px solid var(--pachi-border-hi);
    border-top-color: var(--pachi-accent);
    animation: esspin 0.7s linear infinite;
    flex-shrink: 0;
  }

  &__label {
    font-family: var(--pachi-mono);
    font-size: 11px;
    color: var(--pachi-muted);
  }
}
</style>
