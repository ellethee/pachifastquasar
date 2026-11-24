<template>
  <q-layout view="hHh LpR lFf" container class="shadow-2 rounded-borders" style="height: 360px">
    <pachi-side-menu />
    <q-page-container>
      <q-page padding>Current fake route: <b>{{ current }}</b></q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { computed, provide } from 'vue'
import { createMemoryHistory, createRouter, routeLocationKey, routerKey } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { mdiChartBox, mdiCog, mdiFileDocument, mdiHome, mdiAccountGroup } from '@quasar/extras/mdi-v7'
import { PachiSideMenu, useSideMenu } from '@ilpachi/pachifastquasar'

/**
 * `PachiSideMenu` builds its tree from `router.options.routes`, so the demo gives it a private
 * in-memory router (fake routes, nested groups) instead of the playground router.
 */
const page = { render: () => null }
const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: page,
    children: [
      { path: 'home', component: page, meta: { title: 'Home', icon: mdiHome } },
      {
        path: 'reports',
        component: page,
        meta: { title: 'Reports', icon: mdiChartBox },
        children: [
          { path: 'daily', component: page, meta: { title: 'Daily' } },
          {
            path: 'monthly',
            component: page,
            meta: { title: 'Monthly', icon: mdiFileDocument },
            children: [{ path: 'archive', component: page, meta: { title: 'Archive' } }]
          }
        ]
      },
      { path: 'people', component: page, meta: { title: 'People', icon: mdiAccountGroup } },
      { path: 'hidden', component: page, meta: { title: 'Hidden', hidden: true } },
      { path: 'settings', component: page, meta: { title: 'Settings', icon: mdiCog } }
    ]
  }
]

const router = createRouter({ history: createMemoryHistory(), routes })
void router.push('/reports/monthly')
// `useRoute()` of the items reads `path`: a getter keeps it reactive on the memory router.
provide(routerKey, router)
provide(routeLocationKey, {
  get path() {
    return router.currentRoute.value.path
  }
} as never)
useSideMenu().open.value = true

const current = computed(() => router.currentRoute.value.path)
</script>
