/**
 * Custom SVG icons of the project (24x24 paths).
 */

/** Duotone icon: primary path at full opacity, secondary at reduced opacity. */
export interface DuotoneIcon {
  /** path at full opacity (100%) */
  primary: string
  /** path at reduced opacity (default 40%) */
  secondary: string
}

/**
 * Default Pachi logo (fixed-color mascot) in the `img:<url>` form accepted by `q-icon` and `config.logo`.
 * The SVG (`src/assets/logo/logo.svg`) is not inlined in the JS: Vite emits it as an asset (`dist/assets/`) and the URL
 * is resolved against `import.meta.url`, so it also works from the package in `node_modules`.
 */
export const pachiLogo = `img:${new URL('../../assets/logo/logo.svg', import.meta.url).href}`

/**
 * Duotone Pachi logo: top face (primary) and side faces (secondary).
 * @deprecated the default logo is now the mascot (`pachiLogo`); kept for `PachiDuotoneIcon`/backward compatibility.
 */
export const pachiLogoDuotone: DuotoneIcon = {
  primary: 'M12 2 2 7.5v9L12 22l10-5.5v-9L12 2Zm0 3.2 6.9 3.8L12 12.8 5.1 9 12 5.2Z',
  secondary: 'M5 11.1l6 3.3v6.3l-6-3.3v-6.3Zm8 9.6v-6.3l6-3.3v6.3l-6 3.3Z'
}
