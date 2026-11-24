/** Built-in theme ids (the `data-theme` values of `themes.css`). */
export type PachiBuiltinThemeId = 'slate' | 'zinc' | 'emerald' | 'cosmic' | 'amber' | 'teal'

/** Theme id: a built-in one or one registered with `registerPachiThemes`. */
export type ThemeId = PachiBuiltinThemeId | (string & {})

/** Color mode: dark, light or following the operating system. */
export type ColorMode = 'dark' | 'light' | 'auto'

/** Quasar brand colors applied (as CSS variables) when the theme is active. */
export interface ThemeColors {
  primary: string
  secondary: string
  accent: string
  dark: string
  darkPage?: string
  positive: string
  negative: string
  info: string
  warning: string
}

/** Colors of the swatch shown in the selector. */
export interface ThemePreview {
  bg: string
  surface: string
  surface2: string
  accent: string
  border: string
  ink: string
}

/** A theme: id (the `data-theme` attribute), texts, Quasar colors and preview per mode. */
export interface ThemeDefinition {
  id: ThemeId
  label: string
  tagline: string
  colors: { dark: ThemeColors; light: ThemeColors }
  preview: { dark: ThemePreview; light: ThemePreview }
}
