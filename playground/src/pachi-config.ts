import { definePachiConfig } from '@ilpachi/pachifastquasar'
import type { PachiConfigInput } from '@ilpachi/pachifastquasar'

/**
 * Base configuration of the app (logo, components, menu items, own settings). The `QCLI_*` / `VITE_*`
 * variables (see `.env.example`) override it ONLY for the settings they define:
 * whatever is not in the environment stays as written here.
 */
const baseConfig: PachiConfigInput = {
  // app: { title: 'My app', gravatar: true },
  // http: { envelope: false },             // backend with PACHIFAST_ENVELOPE_ENABLED=false
  // logo: mioLogo,                          // SVG path, 'img:<url>' or Vue component
  // components: { layout, loginPage, errorPage },
  // menuItems: [{ label: 'Guide', to: '/guide', order: 80 }],
}

/** Shared by boot and router. */
export const pachiConfig: PachiConfigInput = definePachiConfig(baseConfig, import.meta.env)
