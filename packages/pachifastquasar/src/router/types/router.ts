import type { RouteMeta } from 'vue-router'
import type { IDashboardCardStat, IDashboardWidget } from '../../core/dashboard/types/dashboard'

declare module 'vue-router' {
  interface RouteMeta {
    /** Pagina pubblica, non richiede autenticazione */
    noAuth?: boolean
    /** Route montata a livello root (fuori dal layout principale) */
    root?: boolean
    /** Forza (true) o esclude (false) la dashboard automatica di card per questa route con figli; default `QCLI_APP_AUTO_DASHBOARD`. */
    dashboard?: boolean
    /** Larghezza massima della dashboard di questa route (lunghezza CSS o pixel); default `app.dashboardMaxWidth`, poi `1080px`. */
    dashboardMaxWidth?: string | number
    /** Colonne della griglia di card di questa route: numero o `grid-template-columns` CSS; default `app.dashboardColumns`, poi 4. */
    dashboardColumns?: number | string
    /** Animazione del titolo della card di questa route nella dashboard (`rubber-band`, `pulse`, `shake`, `wobble`, `tada`, `bounce`, `none`); default `app.titleAnimation`. */
    titleAnimation?: string
    /** Avvolge la pagina in un contenitore scrollabile (`pachi-page-scroll`) entro il limite inferiore; default false. Per scrollare solo una parte della pagina usare `PachiScrollArea`. */
    pageScroll?: boolean
    /** Nascosta dalla dashboard e dai menu */
    hidden?: boolean
    /** Titolo letterale (retrocompatibile); se presente `titleKey` ha la precedenza. */
    title?: string
    /** Chiave i18n del titolo, risolta con `t()` e reattiva al cambio lingua. */
    titleKey?: string
    description?: string
    /** Chiave i18n della descrizione (precedenza su `description`). */
    descriptionKey?: string
    icon?: string
    iconColor?: string
    /** Immagine di sfondo a tema (card dashboard + sfondo pagina), import statico. */
    img?: string
    order?: number
    useMyIcon?: boolean
    bgStyle?: Record<string, string>
    statsUrl?: string
    stats?: IDashboardCardStat[] | (() => IDashboardCardStat[])
    /** Permessi specifici richiesti (tutti devono essere presenti) */
    permissions?: string[]
    /** Richiede is_staff=true (o is_superuser) */
    requireStaff?: boolean
    /** Richiede is_superuser=true */
    requireSuperuser?: boolean
    /** Widget mostrati sotto le card della dashboard di questa route (es. da `@ilpachi/fastquasar-dashboard-widgets`). */
    widgets?: IDashboardWidget[]
  }
}

/** `RouteMeta` con le proprietà aggiunte dalla shell (importare questo tipo carica l'estensione di `vue-router`). */
export type PachiRouteMeta = RouteMeta
