import { defineComponent, h } from 'vue'
import PachiProfilePage from './PachiProfilePage.vue'
import { getPachiProfileEdit } from '../helpers/edit-options'
import { getPachiProfileSecurity } from '../helpers/security-options'
import { getPachiProfileUser } from '../helpers/user-source'

/**
 * Component of the `/user/profile` route: shows {@link PachiProfilePage} with the user provided by
 * `setPachiProfileUser`, the security options from `setPachiProfileSecurity` and the editing from
 * `setPachiProfileEdit` (no custom avatar: for that, mount the page in an app feature).
 */
export default defineComponent({
  name: 'PachiProfileRoute',
  setup: () => () => h(PachiProfilePage, { user: getPachiProfileUser() ?? null, security: getPachiProfileSecurity() ?? true, editable: getPachiProfileEdit() ?? false }),
})
