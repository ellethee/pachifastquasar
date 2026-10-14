import { createPinia } from 'pinia'
import type { Pinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'

/**
 * Crea l'istanza Pinia della shell con la persistenza (`pinia-plugin-persistedstate`) usata dallo store
 * di autenticazione. In un'app Quasar: `export default defineStore(() => createPachiPinia())` in
 * `src/stores/index.ts`.
 *
 * @returns istanza Pinia
 */
export function createPachiPinia(): Pinia {
  const pinia = createPinia()
  pinia.use(piniaPluginPersistedstate)
  return pinia
}
