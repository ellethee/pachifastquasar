import { mdiAccountCircleOutline } from '@quasar/extras/mdi-v7'
import { ensureMessages } from './helpers/register-messages'
import { PROFILE_PATH } from './menu'

/** Minimal route compatible with `RouteRecordRaw` (the package does not depend on vue-router). */
export interface IPachiRouteRecord {
  path: string
  meta?: Record<string, unknown>
  beforeEnter?: () => void
  component: () => Promise<unknown>
}

/**
 * Package routes (default export of `routes`, discovered by the `@ilpachi/pachifastquasar` shell):
 * the profile page, hidden from the side menu and reachable from the account menu. The user is provided with
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
    // the title texts are needed before the page (and its `usePachiI18n`) is mounted
    beforeEnter: () => ensureMessages(),
    component: () => import('./components/PachiProfileRoute'),
  },
] as IPachiRouteRecord[]
