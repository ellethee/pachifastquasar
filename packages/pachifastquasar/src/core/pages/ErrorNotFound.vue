<template>
  <div class="pachi-not-found-page">
    <div class="pachi-not-found-page__inner">
      <div class="pachi-not-found-page__code">404</div>
      <div class="pachi-not-found-page__title">{{ t('errors.notFound.title') }}</div>
      <div class="pachi-not-found-page__desc">{{ t('errors.notFound.description') }}</div>
      <q-btn
        outline
        no-caps
        to="/"
        :label="t('errors.notFound.back')"
        class="pachi-not-found-page__btn"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<style lang="scss">
.pachi-not-found-page {
  min-height: 100vh;
  background: var(--pachi-bg);
  display: flex;
  align-items: center;
  justify-content: center;

  &__inner {
    text-align: center;
  }

  &__code {
    font-family: var(--pachi-mono);
    font-size: clamp(80px, 20vw, 180px);
    font-weight: 600;
    color: var(--pachi-faint);
    line-height: 1;
    letter-spacing: -0.04em;
  }

  &__title {
    font-family: var(--pachi-font);
    font-size: 18px;
    font-weight: 600;
    color: var(--pachi-ink);
    margin-top: 8px;
  }

  &__desc {
    font-family: var(--pachi-font);
    font-size: 13px;
    color: var(--pachi-muted);
    margin-top: 6px;
  }

  &__btn {
    margin-top: 28px;
    border-color: var(--pachi-border-hi) !important;
    color: var(--pachi-ink-2) !important;
    font-size: 13px;
  }
}
</style>
