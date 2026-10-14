# Usage

## Mounting it in a pachifastquasar app

With the `@ilpachi/pachifastquasar` shell nothing has to be written for the route and the menu entry: the shell scans
`node_modules/@ilpachi/*` for two modules of every package and registers what they export.

| Module (sub-path) | Default export | What the shell does with it |
| --- | --- | --- |
| `@ilpachi/fastquasar-settings/routes` (`dist/routes.js`) | an array of route records | Adds the `/user/settings` route to the router. |
| `@ilpachi/fastquasar-settings/menu` (`dist/menu.js`) | a menu factory `getMenuItem(ctx)` | Adds the "Settings" entry to the account menu. |

The scan is configured once in the app router (this is the default of the generated apps):

```ts
// src/router/index.ts
import { defineRouter } from '#q-app'
import { createPachiRouter } from '@ilpachi/pachifastquasar'
import { pachiConfig } from 'src/pachi-config'

export default defineRouter(function () {
  return createPachiRouter({
    config: pachiConfig,
    env: import.meta.env,
    mode: import.meta.env.QUASAR_VUE_ROUTER_MODE,
    base: import.meta.env.QUASAR_VUE_ROUTER_BASE,
    features: import.meta.glob('/src/features/**/routes.ts', { eager: true, import: 'default' }),
    packages: import.meta.glob('/node_modules/@ilpachi/*/{routes,dist/routes,src/routes}.{ts,js}', {
      eager: true,
      import: 'default',
    }),
    menus: import.meta.glob('/node_modules/@ilpachi/*/{menu,dist/menu,src/menu}.{ts,js}', {
      eager: true,
      import: 'default',
    }),
  })
})
```

### The route

```ts
{
  path: '/user/settings',
  meta: {
    hidden: true, // not shown in the side menu, reachable from the account menu
    titleKey: 'pachiSettings.pageTitle',
    descriptionKey: 'pachiSettings.description',
    icon: mdiCog,
  },
  beforeEnter: () => ensureMessages(), // registers the package messages before the title is rendered
  component: () => import('./components/PachiSettingsPage.vue'),
}
```

### The menu factory

`menu.ts` exports `getMenuItem(ctx)` (also as default export). It follows the `PachiMenuItemFactory` contract of the
shell, but the context type is declared locally (`IPachiSettingsMenuContext`), so the package never imports the shell.

```ts
getMenuItem({ t, config }) // =>
{
  label: t('pachiSettings.menuLabel'),
  caption: t('pachiSettings.menuCaption'),
  icon: mdiCog,
  to: '/user/settings',
  order: 20,
  visible: config?.auth?.menu?.showSettings ?? true,
}
```

The entry is hidden when the shell is configured with `auth.menu.showSettings = false`
(`QCLI_AUTH_MENU_SETTINGS=false`).

### Boot file

The page works without any configuration: the HTTP client comes from the `@ilpachi/use-alova` instance registered by
`createPachiApp` of the shell. A boot file is only needed to tell the package when the user is authenticated, or to use
the manager before the page is mounted:

```ts
// src/boot/pachi.ts
import { defineBoot } from '#q-app'
import { AuthManager, createPachiApp } from '@ilpachi/pachifastquasar'
import { setPachiSettingsOptions } from '@ilpachi/fastquasar-settings'
import { pachiConfig } from 'src/pachi-config'

export default defineBoot((ctx) => {
  createPachiApp(ctx, { config: pachiConfig /* , messages */ })

  setPachiSettingsOptions({
    isAuthenticated: () => AuthManager.getInstance().isAuthenticated,
  })
})
```

To load the settings at login, clear them at logout and apply theme, accent, density, language, etc. everywhere (not
only in the page), call `installPachiSettings({ app: ctx.app, getUser, isAuthenticated })` in the same boot file: see
[Appliers and auto-loading](appliers.md). With it, calling `clearSettings()` by hand is no longer needed.

### Replacing the route with your own

To mount the page elsewhere (another path, a wrapper, extra `components`), disable the package routes with
`ilpachi-fastquasar-settings-disable-route` (the account-menu entry disappears with them) and declare your own route in
a feature of the app:

```ts
// src/features/account/routes.ts
import { defineComponent, h } from 'vue'
import type { RouteRecordRaw } from 'vue-router'
import { PachiSettingsPage } from '@ilpachi/fastquasar-settings'
import ToggleThemeButton from '../../components/ToggleThemeButton.vue'

const SettingsRoute = defineComponent(() => () =>
  h(PachiSettingsPage, { components: { 'theme-toggle': ToggleThemeButton } }),
)

export default [
  { path: '/account/settings', meta: { hidden: true, title: 'Settings' }, component: SettingsRoute },
] as RouteRecordRaw[]
```

## Using the page directly

Outside the shell (any Vue 3 + Quasar + Pinia + `@ilpachi/pachi-i18n` app) import the component:

```vue
<template>
  <pachi-settings-page :components="{ 'theme-toggle': ToggleThemeButton }" />
</template>

<script setup lang="ts">
import { PachiSettingsPage } from '@ilpachi/fastquasar-settings'
import ToggleThemeButton from './ToggleThemeButton.vue'
</script>
```

The `components` prop registers custom components that a schema field can reference by name in its `component`
attribute. Reading and writing a setting from anywhere:

```ts
import { SettingsManager } from '@ilpachi/fastquasar-settings'

const settings = SettingsManager.getInstance()
await settings.loadSettings() // after login: values + schema, one request each

settings.get('preferences', 'theme') // 'dark'
settings.set('preferences', 'theme', 'light') // optimistic update, debounced PUT (400 ms)

// reactive, v-model friendly
const theme = settings.getReactiveForKey<string>('preferences', 'theme')
theme.value = 'dark'

// a whole section as an object of computed refs
const audit = settings.getReactiveFor<{ disableActivityLog: boolean }>('audit')
audit.disableActivityLog.value = true
```

`setPachiSettingsOptions({ ... })` (see [Options](reference.md#options)) configures the HTTP client and the authentication check.
