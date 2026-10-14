import { defineComponent, h } from 'vue'
import PachiProfilePage from './PachiProfilePage.vue'
import { getPachiProfileEdit } from '../helpers/edit-options'
import { getPachiProfileSecurity } from '../helpers/security-options'
import { getPachiProfileUser } from '../helpers/user-source'

/**
 * Componente della route `/user/profile`: mostra {@link PachiProfilePage} con l'utente fornito da
 * `setPachiProfileUser` e le opzioni di sicurezza da `setPachiProfileSecurity` e la modifica da `setPachiProfileEdit` (senza avatar personalizzato: per quello monta la pagina in una feature dell'app).
 */
export default defineComponent({
  name: 'PachiProfileRoute',
  setup: () => () => h(PachiProfilePage, { user: getPachiProfileUser() ?? null, security: getPachiProfileSecurity() ?? true, editable: getPachiProfileEdit() ?? false }),
})
