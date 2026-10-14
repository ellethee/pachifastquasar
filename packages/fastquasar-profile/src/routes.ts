import { mdiAccountCircleOutline } from '@quasar/extras/mdi-v7'
import { ensureMessages } from './helpers/register-messages'
import { PROFILE_PATH } from './menu'

/** Route minima compatibile con `RouteRecordRaw` (il package non dipende da vue-router). */
export interface IPachiRouteRecord {
  path: string
  meta?: Record<string, unknown>
  beforeEnter?: () => void
  component: () => Promise<unknown>
}

/**
 * Route del package (default export di `routes`, scoperto dalla shell `@ilpachi/pachifastquasar`):
 * la pagina profilo, nascosta dal menu laterale e raggiungibile dal menu account. L'utente si fornisce con
 * `setPachiProfileUser`.
 */
export default [
  {
    path: PROFILE_PATH,
    meta: {
      hidden: true,
      titleKey: 'pachiProfile.pageTitle',
      descriptionKey: 'pachiProfile.description',
      icon: mdiAccountCircleOutline,
    },
    // i testi del titolo servono prima che la pagina (e il suo `usePachiI18n`) sia montata
    beforeEnter: () => ensureMessages(),
    component: () => import('./components/PachiProfileRoute'),
  },
] as IPachiRouteRecord[]
