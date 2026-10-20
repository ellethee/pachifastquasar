import type { PachiTitleAnimation } from '../../dashboard/helpers/title-animation'
import type { Component } from 'vue'
import type { IMenuButton } from '../../components/AccountMenuButton/types/account-menu-button'
import type { PachiMenuItemFactory } from '../../components/AccountMenuButton/types/menu-item-factory'

/** Transport of the refresh token: JSON body (default) or HttpOnly cookie. */
export type PachiRefreshMode = 'body' | 'cookie'

export interface IAuthConfig {
  enabled: boolean
  /** Where to persist tokens and user data: `local` (localStorage, default) or `session` (sessionStorage). */
  storage: 'local' | 'session'
  /**
   * Where the refresh token lives: `body` (default, sent in the JSON body and persisted with the
   * other tokens in `storage`) or `cookie` (HttpOnly cookie set by the backend: the client never
   * sees it and keeps access token and user data in memory only). Also `QCLI_AUTH_REFRESH_MODE`.
   * Invalid values fall back to `body` with a console warning.
   */
  refreshMode?: PachiRefreshMode
  menu: {
    showProfile: boolean
    showSettings: boolean
    showHome: boolean
    extraButtons?: IMenuButton[]
  }
}

export interface IAppSettings {
  title: string
  description: string
  showAppLogo?: boolean
  /** Logo size in the bar (CSS length, default `36px`). Also `QCLI_APP_LOGO_SIZE` or `--pachi-app-logo-size`. */
  logoSize?: string
  /**
   * With a logo taller than the bar: `false` (default) the bar grows to contain it (the helmet is never cut off);
   * `true` the bar stays 52px and the logo "hangs" below it (top always inside the page).
   */
  logoOverlap?: boolean
  /** Fixed language (e.g. `it`): no detection or selector, only that language. Empty = language chosen by the user. */
  locale?: string | undefined
  /** Routes with children show the card dashboard (default true). Per-route override: `meta.dashboard`. */
  autoDashboard?: boolean
  showLocaleSwitcher?: boolean
  /** Hides the header (title/description) of the home dashboard. */
  hideHubHeader?: boolean
  /** Maximum dashboard width (CSS length, e.g. `1400px`, `90%`, `none`; default `1080px`). Per route: `meta.dashboardMaxWidth`. Also `QCLI_APP_DASHBOARD_MAX_WIDTH`. */
  dashboardMaxWidth?: string | undefined
  /** Card grid columns: a number (`3` = `repeat(3, 1fr)`) or a CSS `grid-template-columns` (default 3 columns). Per route: `meta.dashboardColumns`. Also `QCLI_APP_DASHBOARD_COLUMNS`. */
  dashboardColumns?: number | string | undefined
  /**
   * Dashboard card title animation on mouse hover: `rubber-band` (default), `pulse`, `shake`,
   * `wobble`, `tada`, `bounce` or `none` to disable it. Per card: the route's `meta.titleAnimation`. Also
   * `QCLI_APP_TITLE_ANIMATION`. Disabled hover effects (`hoverEffectsEnabled`) or `prefers-reduced-motion` turn it off anyway.
   */
  titleAnimation?: PachiTitleAnimation | undefined
  /** Use Gravatar for avatars (default false, opt-in: sends the SHA-256 hash of the email to third parties); false = initials only, no external request. */
  gravatar?: boolean
  hoverEffectsEnabled?: boolean
}

/** HTTP client settings (`@ilpachi/use-alova`). */
export interface IHttpConfig {
  /**
   * The backend responds with the `{ success, message, data }` envelope (default `true`): the client returns
   * only `data`. Set to `false` if the backend has `PACHIFAST_ENVELOPE_ENABLED=false` (plain body).
   */
  envelope: boolean
}

/** App logo: SVG path (e.g. mdi icon), `img:<url>` or a Vue component. */
export type PachiLogo = string | Component

/** Shell components replaceable by the app (all optional: the default is the package's). */
export interface IPachiComponents {
  /** Main layout (replaces `MainLayout`). */
  layout?: Component | (() => Promise<unknown>)
  /** Login page (replaces `LoginPage`). */
  loginPage?: Component | (() => Promise<unknown>)
  /** 404 page (replaces `ErrorNotFound`). */
  errorPage?: Component | (() => Promise<unknown>)
}

/** Complete, resolved shell configuration (with defaults applied). */
export interface IAppConfig {
  auth: IAuthConfig
  app: IAppSettings
  /** HTTP client. */
  http: IHttpConfig
  /** App logo (default: Pachi logo). Used by the home route, AppBar and login. */
  logo?: PachiLogo
  /** Replaceable shell components. */
  components?: IPachiComponents
  /**
   * Customizes the account menu items: an array (items appended at the end) or a function that
   * receives the computed items (default + packages) and returns the final list.
   */
  menuItems?: IMenuButton[] | ((items: IMenuButton[]) => IMenuButton[])
  /** Menu item factories registered by the app (in addition to those discovered in packages). */
  menuFactories?: PachiMenuItemFactory[]
}

/** Configuration accepted by `setPachiConfig` / `createPachiApp` / `createPachiRouter`: everything optional. */
export interface PachiConfigInput {
  auth?: Partial<Omit<IAuthConfig, 'menu'>> & { menu?: Partial<IAuthConfig['menu']> }
  app?: Partial<IAppSettings>
  http?: Partial<IHttpConfig>
  logo?: IAppConfig['logo']
  components?: IPachiComponents
  menuItems?: IAppConfig['menuItems']
  menuFactories?: IAppConfig['menuFactories']
}

/** Subset of `import.meta.env` read by `pachiConfigFromEnv`. */
export type PachiEnv = Record<string, unknown>
