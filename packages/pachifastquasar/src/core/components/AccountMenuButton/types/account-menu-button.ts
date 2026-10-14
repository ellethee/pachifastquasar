export interface IMenuButton {
  label: string
  icon?: string
  caption?: string
  to?: string
  onClick?: () => void
  visible?: (() => boolean | null) | boolean
  /** Posizione nel menu (crescente; default 50). Predefinite: Profilo 10, Impostazioni 20, Home 90. */
  order?: number
}
