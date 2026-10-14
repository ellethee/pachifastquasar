import { mdiShieldAccountOutline } from '@quasar/extras/mdi-v7'
import { ensureMessages } from './helpers/register-messages'
import { ADMIN_PATH } from './menu'

/** Route minima compatibile con `RouteRecordRaw` (il package non dipende da vue-router). */
export interface IPachiRouteRecord {
  path: string
  meta?: Record<string, unknown>
  props?: boolean
  beforeEnter?: () => void
  component: () => Promise<unknown>
}

/** Componente della pagina (caricato in modo lazy). */
const page = (): Promise<unknown> => import('./components/PachiAdminPage.vue')

/** Metadati comuni alle route Admin (nascoste dal menu laterale, raggiungibili dal menu account). */
const meta = {
  hidden: true,
  titleKey: 'pachiAdmin.pageTitle',
  descriptionKey: 'pachiAdmin.description',
  icon: mdiShieldAccountOutline,
}

/**
 * Route del package (default export di `routes`, scoperto dalla shell `@ilpachi/pachifastquasar`): la pagina
 * Admin con l'elenco dei modelli (`/admin`) e il modello selezionato (`/admin/:app/:model`).
 * L'accesso ai dati è deciso dal backend con i permessi dell'utente: la route richiede solo l'autenticazione.
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
