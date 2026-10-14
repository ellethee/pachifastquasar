<template>
  <q-toolbar class="q-px-md pachi-app-bar">
    <!-- Logo + wordmark -->
    <div
      v-if="appConfig.app.showAppLogo"
      class="pachi-app-logo"
      :class="{ 'pachi-app-logo--overlap': appConfig.app.logoOverlap }"
      :style="{ '--pachi-app-logo-size': appConfig.app.logoSize }"
      role="button"
      tabindex="0"
      :aria-label="appConfig.app.title"
      @click="goHome"
      @keydown.enter="goHome"
      @keydown.space.prevent="goHome"
    >
      <pachi-logo class="pachi-app-logo__sun" size="var(--pachi-app-logo-size, 36px)" />
      <span class="pachi-app-logo__wordmark">{{ appConfig.app.title }}</span>
    </div>

    <!-- Breadcrumb (desktop) -->
    <div class="q-ml-lg gt-xs pachi-breadcrumb-wrap">
      <q-breadcrumbs gutter="xs" class="pachi-breadcrumbs-bar">
        <q-breadcrumbs-el
          v-for="(b, i) in crumbs"
          :key="i"
          :label="b.label"
          :icon="b.icon"
          :to="i < crumbs.length - 1 ? b.to : undefined"
        />
      </q-breadcrumbs>
    </div>

    <q-space />

    <!-- Title pill centrata -->
    <div v-if="title && !hideTitle" class="pachi-title-pill">
      <q-icon v-if="icon" :name="icon" size="14px" style="color: var(--pachi-accent)" />
      <span class="pachi-title-text">{{ title }}</span>
      <span v-if="description" class="pachi-title-desc">· {{ description }}</span>
    </div>

    <q-space />

    <!-- Route-specific components (via route.meta.appBarComponents) -->
    <template v-if="appBarComponents.length">
      <component :is="comp" v-for="(comp, idx) in appBarComponents" :key="idx" />
    </template>

    <!-- Actions -->
    <transition-group name="pachi-actions">
      <q-btn
        v-if="!isHome"
        key="isHome"
        flat
        round
        dense
        :icon="mdiHome"
        :aria-label="t('common.home')"
        class="pachi-app-action-btn"
        @click="goHome"
      >
        <q-tooltip>{{ t('common.goHome') }}</q-tooltip>
      </q-btn>

      <q-btn
        v-if="hasParent"
        key="hasParent"
        flat
        round
        dense
        :icon="mdiArrowUp"
        :aria-label="t('common.parentLevel')"
        class="q-ml-xs pachi-app-action-btn"
        @click="goParent"
      >
        <q-tooltip v-if="parentLabel" key="tooltipParent">
          {{ t('common.backTo', { label: parentLabel }) }}
        </q-tooltip>
      </q-btn>
      <toggle-theme-button key="theme" />
      <pachi-locale-switcher v-if="showLocaleSwitcher" key="locale" class="q-mr-xs" />
    </transition-group>

    <!-- Account -->
    <account-menu-button />
  </q-toolbar>
</template>
<script setup lang="ts">
import { mdiArrowUp, mdiHome } from '@quasar/extras/mdi-v7'
import { useAppBar } from '../composables/use-app-bar'
import AccountMenuButton from './AccountMenuButton/AccountMenuButtonNew.vue'
import ToggleThemeButton from './ToggleThemeButton.vue'
import PachiLogo from './PachiLogo.vue'
import { getPachiConfig } from '../config'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { PachiLocaleSwitcher, useLocale } from '@ilpachi/pachi-i18n'

const appConfig = getPachiConfig()

const {
  title,
  description,
  icon,
  isHome,
  crumbs,
  hasParent,
  parentLabel,
  goHome,
  goParent,
  appBarComponents,
  hideTitle
} = useAppBar()
const { t } = useI18n()
const { availableLocales } = useLocale()
// Lo switcher compare solo se abilitato da config e se c'è più di una lingua
const showLocaleSwitcher = computed(
  () =>
    !appConfig.app.locale &&
    appConfig.app.showLocaleSwitcher !== false &&
    availableLocales.value.length > 1
)
</script>

<style lang="scss">
// ── App logo ──────────────────────────────────────────────────────────────────
.pachi-app-logo {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
  flex-shrink: 0;

  &__sun {
    color: var(--pachi-accent) !important;
  }

  // logoOverlap: l'icona pende sotto la barra (posizione assoluta, parte alta a 6px dal bordo superiore)
  &--overlap {
    position: relative;
    align-self: stretch;
    padding-left: calc(var(--pachi-app-logo-size, 36px) + 8px);
    z-index: 2000;
  }

  &--overlap &__sun {
    position: absolute;
    left: 0;
    top: 6px;
  }

  &__wordmark {
    font-family: var(--pachi-title-font);
    font-weight: 600;
    font-size: 14px;
    color: var(--pachi-ink);
    letter-spacing: -0.01em;
  }

  &:hover &__wordmark {
    animation: var(--pachi-hover-fx-animation);
  }
}

// ── Breadcrumbs ───────────────────────────────────────────────────────────────
.pachi-breadcrumb-wrap {
  min-width: 0;
  max-width: 40vw;
  overflow: hidden;
}

.pachi-breadcrumbs-bar {
  .q-breadcrumbs__el {
    font-family: var(--pachi-font);
    font-size: 12px;
    color: var(--pachi-muted);
    max-width: 180px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .q-breadcrumbs__separator {
    color: var(--pachi-faint);
  }

  .q-breadcrumbs__el:last-child {
    color: var(--pachi-ink-2);
  }
}

// ── Title pill ────────────────────────────────────────────────────────────────
.pachi-title-pill {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 14px 5px 10px;
  background: var(--pachi-surface);
  border: 1px solid var(--pachi-border);
  border-radius: 8px;
  white-space: nowrap;
  pointer-events: none;

  .pachi-title-text {
    font-family: var(--pachi-font);
    font-size: 13px;
    font-weight: 600;
    color: var(--pachi-ink);
  }

  .pachi-title-desc {
    font-family: var(--pachi-font);
    font-size: 12px;
    font-weight: 400;
    color: var(--pachi-muted);
  }
}

// ── Action buttons ────────────────────────────────────────────────────────────
.pachi-app-action-btn {
  width: 30px;
  height: 30px;
  border-radius: 6px !important;
  color: var(--pachi-muted);

  &:hover {
    color: var(--pachi-ink);
    background: var(--pachi-surface-3) !important;
  }
}
</style>
