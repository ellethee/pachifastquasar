import { mdiShieldAccountOutline } from '@quasar/extras/mdi-v7'
import { ensureMessages } from './helpers/register-messages'
import { ADMIN_PATH } from './menu'

/** Minimal route compatible with `RouteRecordRaw` (the package does not depend on vue-router). */
export interface IPachiRouteRecord {
  path: string
  meta?: Record<string, unknown>
  props?: boolean
  beforeEnter?: () => void
  component: () => Promise<unknown>
}

/** Page component (lazy loaded). */
const page = (): Promise<unknown> => import('./components/PachiAdminPage.vue')

/** Metadata shared by the Admin routes (hidden from the side menu, reachable from the account menu). */
const meta = {
  hidden: true,
  titleKey: 'pachiAdmin.pageTitle',
  descriptionKey: 'pachiAdmin.description',
  icon: mdiShieldAccountOutline,
}

/**
 * Routes of the package (default export of `routes`, discovered by the `@ilpachi/pachifastquasar` shell): the
 * Admin page with the model list (`/admin`) and the selected model (`/admin/:app/:model`).
 * Data access is decided by the backend with the user permissions: the route only requires authentication.
 */
export default [
  {
    path: ADMIN_PATH,
    meta,
    props: true,
    beforeEnter: () => ensureMessages(),
    component: page,
  },
  {
    path: `${ADMIN_PATH}/:app/:model`,
    meta,
    props: true,
    beforeEnter: () => ensureMessages(),
    component: page,
  },
] as IPachiRouteRecord[]
