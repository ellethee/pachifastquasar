import type { PachiTitleAnimation } from '../../dashboard/helpers/title-animation'
import type { Component } from 'vue'
import type { IMenuButton } from '../../components/AccountMenuButton/types/account-menu-button'
import type { PachiMenuItemFactory } from '../../components/AccountMenuButton/types/menu-item-factory'

export interface IAuthConfig {
  enabled: boolean
  /** Dove persistere i token e i dati utente: `local` (localStorage, default) o `session` (sessionStorage). */
  storage: 'local' | 'session'
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
  /** Dimensione del logo nella barra (lunghezza CSS, default `36px`). Anche `QCLI_APP_LOGO_SIZE` o `--pachi-app-logo-size`. */
  logoSize?: string
  /**
   * Con un logo più alto della barra: `false` (default) la barra cresce per contenerlo (l'elmo non viene mai tagliato);
   * `true` la barra resta di 52px e il logo "pende" sotto di essa (parte alta sempre dentro la pagina).
   */
  logoOverlap?: boolean
  /** Lingua fissa (es. `it`): niente rilevamento né selettore, solo quella lingua. Vuoto = lingua scelta dall'utente. */
  locale?: string | undefined
  /** Le route con figli mostrano la dashboard di card (default true). Override per route: `meta.dashboard`. */
  autoDashboard?: boolean
  showLocaleSwitcher?: boolean
  /** Nasconde l'header (titolo/descrizione) della dashboard home. */
  hideHubHeader?: boolean
  /** Larghezza massima della dashboard (lunghezza CSS, es. `1400px`, `90%`, `none`; default `1080px`). Per route: `meta.dashboardMaxWidth`. Anche `QCLI_APP_DASHBOARD_MAX_WIDTH`. */
  dashboardMaxWidth?: string | undefined
  /** Colonne della griglia di card: un numero (`3` = `repeat(3, 1fr)`) o un `grid-template-columns` CSS (default 3 colonne). Per route: `meta.dashboardColumns`. Anche `QCLI_APP_DASHBOARD_COLUMNS`. */
  dashboardColumns?: number | string | undefined
  /**
   * Animazione del titolo delle card della dashboard al passaggio del mouse: `rubber-band` (default), `pulse`, `shake`,
   * `wobble`, `tada`, `bounce` o `none` per disabilitarla. Per card: `meta.titleAnimation` della route. Anche
   * `QCLI_APP_TITLE_ANIMATION`. Gli effetti hover disattivati (`hoverEffectsEnabled`) o `prefers-reduced-motion` la spengono comunque.
   */
  titleAnimation?: PachiTitleAnimation | undefined
  /** Usa Gravatar per gli avatar (default false, opt-in: invia a terzi l'hash SHA-256 dell'email); false = solo iniziali, nessuna richiesta esterna. */
  gravatar?: boolean
  hoverEffectsEnabled?: boolean
}

/** Impostazioni del client HTTP (`@ilpachi/use-alova`). */
export interface IHttpConfig {
  /**
   * Il backend risponde con l'envelope `{ success, message, data }` (default `true`): il client restituisce
   * solo `data`. Va messo a `false` se il backend ha `PACHIFAST_ENVELOPE_ENABLED=false` (corpo semplice).
   */
  envelope: boolean
}

/** Logo dell'app: path SVG (es. icona mdi), `img:<url>` oppure un componente Vue. */
export type PachiLogo = string | Component

/** Componenti della shell sostituibili dall'app (tutti opzionali: il default è quello del pacchetto). */
export interface IPachiComponents {
  /** Layout principale (sostituisce `MainLayout`). */
  layout?: Component | (() => Promise<unknown>)
  /** Pagina di login (sostituisce `LoginPage`). */
  loginPage?: Component | (() => Promise<unknown>)
  /** Pagina 404 (sostituisce `ErrorNotFound`). */
  errorPage?: Component | (() => Promise<unknown>)
}

/** Configurazione completa e risolta (con i default applicati) della shell. */
export interface IAppConfig {
  auth: IAuthConfig
  app: IAppSettings
  /** Client HTTP. */
  http: IHttpConfig
  /** Logo dell'app (default: logo Pachi). Usato da route home, AppBar e login. */
  logo?: PachiLogo
  /** Componenti della shell sostituibili. */
  components?: IPachiComponents
  /**
   * Personalizza le voci del menu account: un array (voci aggiunte in coda) oppure una funzione che
   * riceve le voci calcolate (default + package) e restituisce l'elenco finale.
   */
  menuItems?: IMenuButton[] | ((items: IMenuButton[]) => IMenuButton[])
  /** Factory delle voci di menu registrate dall'app (oltre a quelle scoperte nei package). */
  menuFactories?: PachiMenuItemFactory[]
}

/** Configurazione accettata da `setPachiConfig` / `createPachiApp` / `createPachiRouter`: tutto opzionale. */
export interface PachiConfigInput {
  auth?: Partial<Omit<IAuthConfig, 'menu'>> & { menu?: Partial<IAuthConfig['menu']> }
  app?: Partial<IAppSettings>
  http?: Partial<IHttpConfig>
  logo?: IAppConfig['logo']
  components?: IPachiComponents
  menuItems?: IAppConfig['menuItems']
  menuFactories?: IAppConfig['menuFactories']
}

/** Sottoinsieme di `import.meta.env` letto da `pachiConfigFromEnv`. */
export type PachiEnv = Record<string, unknown>
