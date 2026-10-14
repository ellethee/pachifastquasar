/**
 * Icone SVG personalizzate del progetto (path 24x24).
 */

/** Icona duotone: path primario a opacità piena, secondario a opacità ridotta. */
export interface DuotoneIcon {
  /** path a opacità piena (100%) */
  primary: string
  /** path a opacità ridotta (default 40%) */
  secondary: string
}

/**
 * Logo Pachi predefinito (mascotte a colori fissi) nella forma `img:<url>` accettata da `q-icon` e da `config.logo`.
 * Il SVG (`src/assets/logo/logo.svg`) non e' inlinato nel JS: Vite lo emette come asset (`dist/assets/`) e l'URL
 * si risolve rispetto a `import.meta.url`, quindi funziona anche dal pacchetto in `node_modules`.
 */
export const pachiLogo = `img:${new URL('../../assets/logo/logo.svg', import.meta.url).href}`

/**
 * Logo Pachi duotone: faccia superiore (primary) e facce laterali (secondary).
 * @deprecated il logo predefinito e' ora la mascotte (`pachiLogo`); resta per `PachiDuotoneIcon`/retrocompatibilita'.
 */
export const pachiLogoDuotone: DuotoneIcon = {
  primary: 'M12 2 2 7.5v9L12 22l10-5.5v-9L12 2Zm0 3.2 6.9 3.8L12 12.8 5.1 9 12 5.2Z',
  secondary: 'M5 11.1l6 3.3v6.3l-6-3.3v-6.3Zm8 9.6v-6.3l6-3.3v6.3l-6 3.3Z'
}
