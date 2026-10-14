import { definePachiConfig } from '@ilpachi/pachifastquasar'
import type { PachiConfigInput } from '@ilpachi/pachifastquasar'

/**
 * Configurazione di base dell'app (logo, componenti, voci di menu, impostazioni proprie). Le variabili
 * `QCLI_*` / `VITE_*` (vedi `.env.example`) la sovrascrivono SOLO per le impostazioni che definiscono:
 * ciò che non è nell'ambiente resta come scritto qui.
 */
const baseConfig: PachiConfigInput = {
  // app: { title: 'La mia app', gravatar: true },
  // http: { envelope: false },             // backend con PACHIFAST_ENVELOPE_ENABLED=false
  // logo: mioLogo,                          // path SVG, 'img:<url>' o componente Vue
  // components: { layout, loginPage, errorPage },
  // menuItems: [{ label: 'Guida', to: '/guida', order: 80 }],
}

/** Condivisa da boot e router. */
export const pachiConfig: PachiConfigInput = definePachiConfig(baseConfig, import.meta.env)
