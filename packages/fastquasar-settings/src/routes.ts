import { mdiCog } from '@quasar/extras/mdi-v7'
import { ensureMessages } from './helpers/register-messages'
import { SETTINGS_PATH } from './menu'

/** Route minima compatibile con `RouteRecordRaw` (il package non dipende da vue-router). */
export interface IPachiRouteRecord {
  path: string
  meta?: Record<string, unknown>
  beforeEnter?: () => void
  component: () => Promise<unknown>
}

/**
 * Route del package (default export di `routes`, scoperto dalla shell `@ilpachi/pachifastquasar`):
 * la pagina impostazioni, nascosta dal menu laterale e raggiungibile dal menu account.
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
    // i testi del titolo servono prima che la pagina (e il suo `usePachiI18n`) sia montata
    beforeEnter: () => ensureMessages(),
    component: () => import('./components/PachiSettingsPage.vue'),
  },
] as IPachiRouteRecord[]
