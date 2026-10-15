import { createPinia } from 'pinia'
import type { Pinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'

/**
 * Creates the shell Pinia instance with the persistence (`pinia-plugin-persistedstate`) used by the
 * authentication store. In a Quasar app: `export default defineStore(() => createPachiPinia())` in
 * `src/stores/index.ts`.
 *
 * @returns Pinia instance
 */
export function createPachiPinia(): Pinia {
  const pinia = createPinia()
  pinia.use(piniaPluginPersistedstate)
  return pinia
}
