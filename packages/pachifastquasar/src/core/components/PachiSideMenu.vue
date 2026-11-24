<template>
  <q-drawer
    v-model="open"
    show-if-above
    bordered
    :width="260"
    :breakpoint="1023"
    class="pachi-side-menu"
    :aria-label="t('common.navigation')"
  >
    <q-scroll-area class="fit">
      <q-list class="pachi-side-menu__list">
        <pachi-side-menu-item v-for="item in items" :key="item.to ?? item.label" :item="item" />
      </q-list>
    </q-scroll-area>
  </q-drawer>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { getPachiConfig } from '../config'
import { buildNavTree } from '../menu/nav-tree'
import type { PachiNavItem } from '../menu/nav-tree'
import { useRouteText } from '../../router/route-text'
import { useSideMenu } from '../composables/use-side-menu'
import { AuthManager } from '../../services/auth-manager'
import { useAuthStore } from '../../services/auth-manager/auth-store'
import PachiSideMenuItem from './PachiSideMenuItem.vue'

/**
 * Tree side menu (`app.navigation: 'sidebar'`): a `q-drawer` (overlay under 1024px) with the routes of the
 * layout, filtered like the dashboard cards (`meta.hidden`, `AuthManager.canAccess`). Must be a child of a `q-layout`.
 * Accessibility: disclosure navigation (links + `aria-expanded` buttons, Tab / Enter / Space, `aria-current="page"`), not an ARIA
 * tree (which would promise arrow-key navigation).
 */
const { open } = useSideMenu()
const { t } = useI18n()
const router = useRouter()
const { routeTitle } = useRouteText()
const authManager = AuthManager.getInstance()
const { userInfoVersion } = storeToRefs(useAuthStore())

const items = computed<PachiNavItem[]>(() => {
  void userInfoVersion.value // re-evaluate after login/logout
  const config = getPachiConfig()
  const layout = router.options.routes.find(r => r.path === '/') ?? router.options.routes[0]
  return buildNavTree(layout?.children ?? [], {
    title: routeTitle,
    canAccess: config.auth.enabled ? meta => authManager.canAccess(meta) : undefined
  })
})
</script>

<style lang="scss">
// `.pachi-layout--sidebar` is on the q-layout (MainLayout). The `class` of q-drawer lands on its
// `.q-drawer__content`, not on the `aside.q-drawer`, so the aside is reached from the layout.
.pachi-layout--sidebar .q-drawer {
  border-color: var(--pachi-border);

  // overlay (mobile): fixed from the viewport top, so it starts explicitly below the bar (a q-header)
  &.q-drawer--on-top {
    top: var(--pachi-appbar-height, 52px);
  }
}

.q-drawer__content.pachi-side-menu {
  background: var(--pachi-surface);
  color: var(--pachi-ink-2);
}

.pachi-side-menu {
  &__list {
    padding: 8px 6px;
  }

  .pachi-side-menu__item {
    border-radius: var(--pachi-btn-r, 7px);
    min-height: 38px;
    margin-bottom: 2px;
    color: var(--pachi-ink-2);

    &:hover {
      background: var(--pachi-surface-2);
    }

    // Quasar's focus helper is invisible with the keyboard: explicit ring
    &:focus-visible {
      outline: 2px solid var(--pachi-accent);
      outline-offset: -2px;
    }

    &.pachi-side-menu__item--active {
      background: var(--pachi-accent-soft);
      color: var(--pachi-accent-ink);
      font-weight: 600;
    }
  }

  .pachi-side-menu__header {
    color: var(--pachi-muted);
    font-size: 11px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .q-expansion-item__container > .q-item {
    border-radius: var(--pachi-btn-r, 7px);
  }
}
</style>
