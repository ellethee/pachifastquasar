import type { Component } from 'vue'

export interface IDashboardCardStat {
  main: string
  sub?: string[]
}

export interface IDashboardCard {
  title: string
  description: string
  icon: string
  iconColor?: string | null
  /** Themed background image of the card (static import), optional. */
  img?: string | null
  parentIcon?: string | null
  parentIconColor?: string | null
  parentUrl?: string | null
  to: string
  /** Title animation on mouse hover (see `meta.titleAnimation`); empty = `app.titleAnimation`. */
  titleAnimation?: string | undefined
  stats?: IDashboardCardStat[] | (() => IDashboardCardStat[])
  statsUrl?: string
}

/** Generic widget mounted in the dashboard: Vue component + props. */
export interface IDashboardWidget {
  component: Component
  props?: Record<string, unknown>
}
