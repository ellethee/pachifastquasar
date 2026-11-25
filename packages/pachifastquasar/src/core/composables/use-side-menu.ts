import { ref } from 'vue'

/** Open state of the side menu drawer, shared by the AppBar button and `PachiSideMenu`. */
const sideMenuOpen = ref(false)

/**
 * State of the side menu (`app.navigation: 'sidebar'`).
 *
 * @returns `open` (drawer visibility, v-model of the `q-drawer`) and `toggle`
 */
export function useSideMenu() {
  return { open: sideMenuOpen, toggle: () => (sideMenuOpen.value = !sideMenuOpen.value) }
}
