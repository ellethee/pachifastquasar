import type { RouteMeta } from 'vue-router'
import type { IDashboardCardStat, IDashboardWidget } from '../../core/dashboard/types/dashboard'

declare module 'vue-router' {
  interface RouteMeta {
    /** Public page, does not require authentication */
    noAuth?: boolean
    /** Route mounted at root level (outside the main layout) */
    root?: boolean
    /** Forces (true) or excludes (false) the automatic card dashboard for this route with children; default `QCLI_APP_AUTO_DASHBOARD`. */
    dashboard?: boolean
    /** Maximum width of the dashboard of this route (CSS length or pixels); default `app.dashboardMaxWidth`, then `1080px`. */
    dashboardMaxWidth?: string | number
    /** Columns of the card grid of this route: number or CSS `grid-template-columns`; default `app.dashboardColumns`, then 4. */
    dashboardColumns?: number | string
    /** Title animation of this route's card in the dashboard (`rubber-band`, `pulse`, `shake`, `wobble`, `tada`, `bounce`, `none`); default `app.titleAnimation`. */
    titleAnimation?: string
    /** Wraps the page in a scrollable container (`pachi-page-scroll`) within the bottom limit; default false. To scroll only part of the page use `PachiScrollArea`. */
    pageScroll?: boolean
    /** Hidden from the dashboard and menus */
    hidden?: boolean
    /** Literal title (backward compatible); if `titleKey` is present it takes precedence. */
    title?: string
    /** i18n key of the title, resolved with `t()` and reactive to language changes. */
    titleKey?: string
    description?: string
    /** i18n key of the description (takes precedence over `description`). */
    descriptionKey?: string
    icon?: string
    iconColor?: string
    /** Themed background image (dashboard card + page background), static import. */
    img?: string
    order?: number
    useMyIcon?: boolean
    bgStyle?: Record<string, string>
    statsUrl?: string
    stats?: IDashboardCardStat[] | (() => IDashboardCardStat[])
    /** Specific permissions required (all must be present) */
    permissions?: string[]
    /** Requires is_staff=true (or is_superuser) */
    requireStaff?: boolean
    /** Requires is_superuser=true */
    requireSuperuser?: boolean
    /** Widgets shown below the dashboard cards of this route (e.g. from `@ilpachi/fastquasar-dashboard-widgets`). */
    widgets?: IDashboardWidget[]
  }
}

/** `RouteMeta` with the properties added by the shell (importing this type loads the `vue-router` extension). */
export type PachiRouteMeta = RouteMeta
