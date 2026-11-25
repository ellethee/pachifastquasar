<template>
  <q-page padding>
    <gallery-section
      id="scroll-area"
      title="PachiScrollArea"
      caption="Scrolls inside the space left below it (fixed minHeight here, so it scrolls with a small window too)."
    >
      <pachi-scroll-area :min-height="160" :offset="0" class="gallery__box">
        <div v-for="n in 20" :key="n" class="q-pa-xs">Row {{ n }}</div>
      </pachi-scroll-area>
    </gallery-section>

    <gallery-section
      id="empty-state"
      title="PachiEmptyState"
      caption="Icon, title, description and optional primary/secondary actions."
    >
      <pachi-empty-state
        :icon="mdiInbox"
        title="No items"
        description="Nothing here yet."
      />
      <pachi-empty-state
        :icon="mdiInbox"
        title="No items"
        description="Create the first one or import a file."
        primary-label="Create"
        secondary-label="Import"
        @primary="last = 'empty: primary'"
        @secondary="last = 'empty: secondary'"
      />
    </gallery-section>

    <gallery-section
      id="error-state"
      title="PachiErrorState"
      caption="Error with optional HTTP code, request id (copy button) and actions."
    >
      <pachi-error-state title="Something went wrong" description="Try again later." />
      <pachi-error-state
        title="Request failed"
        description="The server answered with an error."
        http-code="500"
        req-id="req-7f3a9c2e"
        primary-label="Retry"
        secondary-label="Back"
        @primary="last = 'error: primary'"
        @secondary="last = 'error: secondary'"
        @copy-req-id="last = 'error: copy req id'"
      />
    </gallery-section>

    <gallery-section
      id="loading-state"
      title="PachiLoadingState"
      caption="Skeleton rows with a footer label: default (translated), custom label, fewer columns."
    >
      <pachi-loading-state class="gallery__box" />
      <pachi-loading-state class="gallery__box" label="Fetching data..." :columns="3" />
    </gallery-section>

    <gallery-section
      id="gravatar"
      title="PachiGravatar"
      caption="Initials fallback (Gravatar is opt-in via app.gravatar, so no external request by default)."
    >
      <pachi-gravatar email="jane.doe@example.com" full-name="Jane Doe" :size="32" />
      <pachi-gravatar email="jane.doe@example.com" full-name="Jane Doe" :size="48" />
      <pachi-gravatar email="john@example.com" :size="64" />
      <div style="width: 96px; height: 96px">
        <pachi-gravatar full-name="Fill Container" />
      </div>
    </gallery-section>

    <gallery-section
      id="logo"
      title="PachiLogo"
      caption="Default logo (config.logo or Pachi), custom size, custom SVG path via the value prop."
    >
      <pachi-logo />
      <pachi-logo size="48px" />
      <pachi-logo :value="mdiRocketLaunch" size="48px" />
    </gallery-section>

    <gallery-section
      id="theme-buttons"
      title="ToggleThemeButton / PachiThemeSelector"
      caption="Dark/light toggle and the palette menu (theme + mode); both drive the ThemeManager."
    >
      <toggle-theme-button />
      <toggle-theme-button label="With label" />
      <pachi-theme-selector />
    </gallery-section>

    <gallery-section
      id="side-menu"
      title="PachiSideMenu"
      caption="Tree menu with nested groups, icons and a hidden route, in a container layout with a private fake router."
    >
      <div class="full-width"><side-menu-demo /></div>
    </gallery-section>

    <gallery-section
      id="dashboard-card"
      title="DashboardCard"
      caption="Dashboard cards: plain, with stats, with a parent link (static fake data)."
    >
      <dashboard-card v-for="(card, i) in cards" :key="card.title" :card="card" :index="i" />
    </gallery-section>

    <gallery-section
      id="theme-tokens"
      title="Theme tokens (--pachi-*)"
      caption="Live values read with getComputedStyle: switch theme/mode or edit the SCSS and they update."
    >
      <theme-tokens />
    </gallery-section>

    <div class="text-caption text-grey-7">Last event: {{ last || '-' }}</div>
  </q-page>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { mdiChartBox, mdiInbox, mdiRocketLaunch, mdiAccountGroup } from '@quasar/extras/mdi-v7'
import {
  DashboardCard,
  PachiEmptyState,
  PachiErrorState,
  PachiGravatar,
  PachiLoadingState,
  PachiLogo,
  PachiScrollArea,
  PachiThemeSelector,
  ToggleThemeButton
} from '@ilpachi/pachifastquasar'
import type { IDashboardCard } from '@ilpachi/pachifastquasar'
import GallerySection from './GallerySection.vue'
import SideMenuDemo from './SideMenuDemo.vue'
import ThemeTokens from './ThemeTokens.vue'

/** Last emitted event of the examples. */
const last = ref('')

/** Fake dashboard cards (no backend). */
const cards: IDashboardCard[] = [
  { title: 'Reports', description: 'Plain card.', icon: mdiChartBox, to: '/gallery-shell' },
  {
    title: 'People',
    description: 'Card with stats.',
    icon: mdiAccountGroup,
    to: '/gallery-shell',
    stats: [{ main: '128', sub: ['active'] }, { main: '7', sub: ['new'] }]
  },
  {
    title: 'Child',
    description: 'Card with a parent link.',
    icon: mdiInbox,
    to: '/gallery-shell',
    parentIcon: mdiChartBox,
    parentUrl: '/gallery-shell'
  }
]
</script>

<style>
.gallery__box {
  width: 320px;
  max-height: 200px;
  border: 1px solid var(--pachi-border, rgba(128, 128, 128, 0.4));
  border-radius: 8px;
}
</style>
