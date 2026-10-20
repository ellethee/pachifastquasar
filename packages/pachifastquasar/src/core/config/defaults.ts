import type { IAppConfig } from './types/app-config'

/** Default configuration values (applied beneath what the app provides). */
export const DEFAULT_PACHI_CONFIG: IAppConfig = {
  auth: {
    enabled: true,
    storage: 'local',
    refreshMode: 'body',
    menu: { showProfile: true, showSettings: true, showHome: true }
  },
  app: {
    title: 'Pachi Fast Quasar',
    description: 'Quasar Vue boilerplate',
    showAppLogo: true,
    logoSize: '36px',
    logoOverlap: false,
    locale: undefined,
    autoDashboard: true,
    showLocaleSwitcher: true,
    hideHubHeader: false,
    dashboardMaxWidth: undefined,
    dashboardColumns: undefined,
    titleAnimation: undefined,
    gravatar: false,
    hoverEffectsEnabled: true
  },
  http: {
    envelope: true
  }
}
