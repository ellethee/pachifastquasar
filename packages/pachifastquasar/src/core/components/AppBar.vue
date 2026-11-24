<template>
  <q-toolbar class="q-px-md pachi-app-bar" :class="{ 'pachi-app-bar--sidebar': isSidebar }">
    <!-- Side menu toggle (app.navigation: 'sidebar') -->
    <q-btn
      v-if="isSidebar"
      flat
      round
      dense
      :icon="mdiMenu"
      :aria-label="t('common.openMenu')"
      class="q-mr-sm pachi-app-action-btn"
      @click="toggleSideMenu"
    />
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

    <!-- Breadcrumb (desktop; sidebar: also on xs, reduced to the last crumb by the CSS) -->
    <div class="q-ml-lg pachi-breadcrumb-wrap" :class="{ 'gt-xs': !isSidebar }">
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

    <!-- Centered title pill -->
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
        class="pachi-app-action-btn pachi-app-bar__nav-btn"
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
        class="q-ml-xs pachi-app-action-btn pachi-app-bar__nav-btn"
        @click="goParent"
      >
        <q-tooltip v-if="parentLabel" key="tooltipParent">
          {{ t('common.backTo', { label: parentLabel }) }}
        </q-tooltip>
      </q-btn>
      <pachi-theme-selector v-if="themesEnabled" key="theme-palette" />
      <toggle-theme-button key="theme" />
      <pachi-locale-switcher v-if="showLocaleSwitcher" key="locale" class="q-mr-xs" />
    </transition-group>

    <!-- Account -->
    <account-menu-button />
  </q-toolbar>
</template>
<script setup lang="ts">
import { mdiArrowUp, mdiHome, mdiMenu } from '@quasar/extras/mdi-v7'
import { useAppBar } from '../composables/use-app-bar'
import AccountMenuButton from './AccountMenuButton/AccountMenuButtonNew.vue'
import ToggleThemeButton from './ToggleThemeButton.vue'
import PachiThemeSelector from './PachiThemeSelector.vue'
import { useSideMenu } from '../composables/use-side-menu'
import PachiLogo from './PachiLogo.vue'
import { getPachiConfig, resolveThemesConfig } from '../config'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { PachiLocaleSwitcher, useLocale } from '@ilpachi/pachi-i18n'

const appConfig = getPachiConfig()
const isSidebar = appConfig.app.navigation === 'sidebar'
const themesEnabled = resolveThemesConfig(appConfig).enabled
const { toggle: toggleSideMenu } = useSideMenu()

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
// The switcher appears only if enabled by config and there is more than one language
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

  // logoOverlap: the icon hangs below the bar (absolute position, top at 6px from the top edge)
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

// ── Sidebar mode on xs: only the essentials fit (hamburger, logo, last crumb, theme/language, account) ─
@media (max-width: 599px) {
  .pachi-app-bar--sidebar {
    padding-left: 8px !important;
    padding-right: 8px !important;

    .pachi-app-logo {
      gap: 0;
    }

    // the breadcrumb takes the free space
    > .q-space {
      display: none;
    }

    .pachi-app-logo__wordmark,
    .pachi-title-pill,
    .pachi-app-bar__nav-btn {
      display: none;
    }

    .pachi-breadcrumb-wrap {
      flex: 1 1 0;
      margin-left: 8px !important; // beats q-ml-lg
      max-width: none;
    }

    .pachi-breadcrumbs-bar .q-breadcrumbs__el {
      max-width: 100%;
      flex-wrap: nowrap;
    }

    // last crumb only
    .pachi-breadcrumbs-bar > div > div:not(.q-breadcrumbs--last) {
      display: none;
    }
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
