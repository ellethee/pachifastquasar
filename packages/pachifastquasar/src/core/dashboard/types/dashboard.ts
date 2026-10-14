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
  /** Immagine di sfondo a tema della card (import statico), opzionale. */
  img?: string | null
  parentIcon?: string | null
  parentIconColor?: string | null
  parentUrl?: string | null
  to: string
  /** Animazione del titolo al passaggio del mouse (vedi `meta.titleAnimation`); vuoto = `app.titleAnimation`. */
  titleAnimation?: string | undefined
  stats?: IDashboardCardStat[] | (() => IDashboardCardStat[])
  statsUrl?: string
}

/** Widget generico montato nella dashboard: componente Vue + props. */
export interface IDashboardWidget {
  component: Component
  props?: Record<string, unknown>
}
