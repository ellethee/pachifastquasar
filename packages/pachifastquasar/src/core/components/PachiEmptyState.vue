<template>
  <div class="pachi-empty-state">
    <div class="pachi-empty-state__bg"></div>
    <div class="pachi-empty-state__content">
      <div class="pachi-empty-state__icon-box">
        <div class="pachi-empty-state__icon-ring"></div>
        <q-icon :name="icon" size="32px" color="primary" />
      </div>
      <h3 class="pachi-empty-state__title">{{ title }}</h3>
      <p class="pachi-empty-state__desc">{{ description }}</p>
      <div v-if="primaryLabel || secondaryLabel" class="pachi-empty-state__actions">
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
defineProps<{
  icon: string
  title: string
  description: string
  primaryLabel?: string
  secondaryLabel?: string
}>()

const emit = defineEmits<{
  primary: []
  secondary: []
}>()
</script>

<style lang="scss">
.pachi-empty-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  background: var(--pachi-surface);
  border: 1px solid var(--pachi-border);
  border-radius: var(--pachi-card-r);
  min-height: 240px;

  // Blueprint grid, radial fade toward center
  &__bg {
    position: absolute;
    inset: 0;
    pointer-events: none;
    opacity: 0.4;
    background-image:
      linear-gradient(var(--pachi-border) 1px, transparent 1px),
      linear-gradient(90deg, var(--pachi-border) 1px, transparent 1px);
    background-size: 32px 32px;
    mask-image: radial-gradient(circle at center, black, transparent 70%);
  }

  &__content {
    text-align: center;
    max-width: 360px;
    position: relative;
    padding: 24px;
  }

  // Icon box 84×84 with gradient teal ring
  &__icon-box {
    position: relative;
    width: 84px;
    height: 84px;
    border-radius: 18px;
    margin: 0 auto 18px;
    background: linear-gradient(135deg, var(--pachi-surface-2), var(--pachi-surface));
    border: 1px solid var(--pachi-border);
    display: grid;
    place-items: center;
  }

  &__icon-ring {
    position: absolute;
    inset: -1px;
    border-radius: 18px;
    pointer-events: none;
    background: linear-gradient(135deg, rgb(45 212 191 / 20%), transparent 60%);
    mask:
      linear-gradient(#000 0 0) content-box,
      linear-gradient(#000 0 0);
    mask-composite: xor;
    mask-composite: exclude;
    padding: 1px;
  }

  &__title {
    margin: 0;
    font-family: var(--pachi-font);
    font-size: 16px;
    font-weight: 600;
    color: var(--pachi-ink);
    letter-spacing: -0.01em;
  }

  &__desc {
    margin: 6px 0 0;
    font-family: var(--pachi-font);
    font-size: 13px;
    color: var(--pachi-muted);
    line-height: 1.5;
  }

  &__actions {
    display: flex;
    gap: 8px;
    justify-content: center;
    margin-top: 18px;
  }
}
</style>
