<template>
  <q-layout view="hHh LpR lFf" container class="shadow-2 rounded-borders" style="height: 360px">
    <pachi-side-menu :items="items" />
    <q-page-container>
      <q-page padding>Fake menu tree passed with the <code>items</code> prop (no router routes).</q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { mdiAccountGroup, mdiChartBox, mdiCog, mdiFileDocument, mdiHome } from '@quasar/extras/mdi-v7'
import { PachiSideMenu, useSideMenu } from '@ilpachi/pachifastquasar'
import type { PachiNavItem } from '@ilpachi/pachifastquasar'

/** Fake tree: nested groups (3 levels), a `header` node and icons. */
const items: PachiNavItem[] = [
  { label: 'Home', icon: mdiHome, to: '/' },
  { label: 'Data', header: true },
  {
    label: 'Reports',
    icon: mdiChartBox,
    children: [
      { label: 'Daily', to: '/gallery-shell?daily' },
      {
        label: 'Monthly',
        icon: mdiFileDocument,
        children: [{ label: 'Archive', to: '/gallery-shell?archive' }]
      }
    ]
  },
  { label: 'People', icon: mdiAccountGroup, to: '/gallery-shell?people' },
  { label: 'Settings', icon: mdiCog, to: '/gallery-shell?settings' }
]

useSideMenu().open.value = true
</script>
