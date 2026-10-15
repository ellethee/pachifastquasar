import { mdiCog } from '@quasar/extras/mdi-v7'
import { ensureMessages } from './helpers/register-messages'
import { SETTINGS_PATH } from './menu'

/** Minimal route compatible with `RouteRecordRaw` (the package does not depend on vue-router). */
export interface IPachiRouteRecord {
  path: string
  meta?: Record<string, unknown>
  beforeEnter?: () => void
  component: () => Promise<unknown>
}

/**
 * Package routes (default export of `routes`, discovered by the `@ilpachi/pachifastquasar` shell):
 * the settings page, hidden from the side menu and reachable from the account menu.
 */
export default [
  {
    path: SETTINGS_PATH,
    meta: {
      hidden: true,
      titleKey: 'pachiSettings.pageTitle',
      descriptionKey: 'pachiSettings.description',
      icon: mdiCog,
    },
    // the title texts are needed before the page (and its `usePachiI18n`) is mounted
    beforeEnter: () => ensureMessages(),
    component: () => import('./components/PachiSettingsPage.vue'),
  },
] as IPachiRouteRecord[]
