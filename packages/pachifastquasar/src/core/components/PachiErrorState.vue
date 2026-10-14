<template>
  <div class="pachi-error-state">
    <div class="pachi-error-state__glow"></div>
    <div class="pachi-error-state__content">
      <div class="pachi-error-state__icon"><q-icon :name="mdiAlert" /></div>

      <h3 class="pachi-error-state__title">{{ title }}</h3>

      <p v-if="description" class="pachi-error-state__desc">
        <slot>{{ description }}</slot>
      </p>

      <div v-if="httpCode || reqId" class="pachi-error-state__detail">
        <span v-if="httpCode" class="pachi-error-state__http">{{ httpCode }}</span>
        <span v-if="reqId" class="pachi-error-state__req">
          req-id
          <span class="pachi-error-state__req-id">{{ reqId }}</span>
        </span>
        <span v-if="reqId" class="pachi-error-state__copy" @click="onCopy">
          {{ t('common.copy') }}
        </span>
      </div>

      <div v-if="primaryLabel || secondaryLabel" class="pachi-error-state__actions">
        <q-btn
          v-if="secondaryLabel"
          outline
          no-caps
          size="13px"
          :label="secondaryLabel"
          @click="emit('secondary')"
        />
        <q-btn
          v-if="primaryLabel"
          unelevated
          no-caps
          color="primary"
          size="13px"
          :label="primaryLabel"
          @click="emit('primary')"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { mdiAlert } from '@quasar/extras/mdi-v7'
import { useI18n } from 'vue-i18n'
const props = defineProps<{
  title: string
  description?: string
  httpCode?: string | number
  reqId?: string
  primaryLabel?: string
  secondaryLabel?: string
}>()

const { t } = useI18n()

const emit = defineEmits<{
  primary: []
  secondary: []
  'copy-req-id': []
}>()

function onCopy() {
  if (props.reqId) void navigator.clipboard.writeText(props.reqId)
  emit('copy-req-id')
}
</script>

<style lang="scss">
.pachi-error-state {
  flex: 1;
  background: var(--pachi-surface);
  border: 1px solid rgb(248 113 113 / 33%);
  border-radius: var(--pachi-card-r);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  min-height: 240px;

  &__glow {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: radial-gradient(600px 300px at 50% 40%, rgb(248 113 113 / 7%), transparent 60%);
  }

  &__content {
    text-align: center;
    max-width: 420px;
    position: relative;
    padding: 24px;
  }

  &__icon {
    width: 80px;
    height: 80px;
    border-radius: 18px;
    margin: 0 auto 18px;
    background: var(--pachi-red-soft);
    border: 1px solid rgb(248 113 113 / 27%);
    display: grid;
    place-items: center;
    font-size: 34px;
    color: var(--pachi-red);
  }

  &__title {
    margin: 0;
    font-family: var(--pachi-font);
    font-size: 17px;
    font-weight: 600;
    color: var(--pachi-ink);
    letter-spacing: -0.01em;
  }

  &__desc {
    margin: 6px 0 0;
    font-family: var(--pachi-font);
    font-size: 13px;
    color: var(--pachi-muted);
    line-height: 1.55;
  }

  &__detail {
    margin-top: 18px;
    padding: 10px 14px;
    background: var(--pachi-surface-2);
    border: 1px solid var(--pachi-border);
    border-radius: 8px;
    text-align: left;
    font-family: var(--pachi-mono);
    font-size: 11px;
    color: var(--pachi-muted);
    display: flex;
    gap: 10px;
    align-items: center;
  }

  &__http {
    color: var(--pachi-red);
    font-weight: 600;
    flex-shrink: 0;
  }

  &__req {
    flex: 1;
  }

  &__req-id {
    color: var(--pachi-ink-2);
  }

  &__copy {
    cursor: pointer;
    color: var(--pachi-accent-ink);
    flex-shrink: 0;

    &:hover {
      text-decoration: underline;
    }
  }

  &__actions {
    display: flex;
    gap: 8px;
    justify-content: center;
    margin-top: 18px;
  }
}
</style>
