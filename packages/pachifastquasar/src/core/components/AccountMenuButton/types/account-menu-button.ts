export interface IMenuButton {
  label: string
  icon?: string
  caption?: string
  to?: string
  onClick?: () => void
  visible?: (() => boolean | null) | boolean
  /** Position in the menu (ascending; default 50). Defaults: Profile 10, Settings 20, Home 90. */
  order?: number
}
