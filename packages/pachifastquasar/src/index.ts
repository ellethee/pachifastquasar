/**
 * `@ilpachi/pachifastquasar`: Vue 3 / Quasar application shell (layout, auth, dashboard, i18n, router) as a
 * package. See the README for usage from an app.
 */
export type { PachiRouteMeta } from './router/types/router'

// ── Bootstrap ────────────────────────────────────────────────────────────────
export { createPachiApp, pachiBoot } from './app/create-pachi-app'
export type { CreatePachiAppOptions, PachiAppContext } from './app/create-pachi-app'
export { createPachiHttp } from './app/create-http'
export type { CreatePachiHttpOptions, PachiUseAlova } from './app/create-http'
export { createPachiPinia } from './stores/create-pinia'

// ── Configuration ──────────────────────────────────────────────────────────────
export {
  DEFAULT_PACHI_CONFIG,
  definePachiConfig,
  getPachiConfig,
  mergePachiConfig,
  pachiConfigFromEnv,
  resolvePachiConfig,
  setPachiConfig
} from './core/config'
export type {
  IAppConfig,
  IAppSettings,
  IAuthConfig,
  IHttpConfig,
  IPachiComponents,
  IPachiToastConfig,
  PachiConfigInput,
  PachiEnv,
  PachiLogo as PachiLogoValue,
  PachiRefreshMode,
  PachiToastPosition
} from './core/config'

// ── Router ───────────────────────────────────────────────────────────────────
export { createPachiRouter, createPachiHistory } from './router/create-pachi-router'
export type { CreatePachiRouterOptions, PachiRouterMode } from './router/create-pachi-router'
export { buildPachiRoutes } from './router/routes'
export type { PachiRoutesSources } from './router/routes'
export {
  collectAppFeatureRoutes,
  collectFeatureRoutes,
  collectPackageRoutes,
  enabledPackageEntries,
  extractPackageName,
  getFilteredRoutes,
  isPackageRouteDisabled,
  isTruthyEnv
} from './router/routes-finder'
export type { PachiGlob } from './router/routes-finder'
export { useRouteMeta } from './router/use-route-meta'
export { useRouteText } from './router/route-text'

// ── Account menu ───────────────────────────────────────────────────────────────
export {
  buildMenuItems,
  collectPackageMenus,
  createDefaultButtons,
  getPachiMenuFactories,
  registerPachiMenus
} from './core/menu'
export type {
  PachiMenuItem,
  PachiMenuItemContext,
  PachiMenuItemFactory
} from './core/components/AccountMenuButton/types/menu-item-factory'
export type { IMenuButton } from './core/components/AccountMenuButton/types/account-menu-button'

// ── i18n ─────────────────────────────────────────────────────────────────────
export { composePachiMessages, pachiShellMessages } from './i18n'
export type { MessageSchema, PachiMessageLayers } from './i18n'
export { findQuasarLang, setQuasarLang } from './i18n/quasar-lang'

// ── Shell components ──────────────────────────────────────────────────────
export { default as MainLayout } from './core/layouts/MainLayout.vue'
export { default as LoginPage } from './core/auth/pages/LoginPage.vue'
export { default as ErrorNotFound } from './core/pages/ErrorNotFound.vue'
export { default as AppBar } from './core/components/AppBar.vue'
export { default as AccountMenuButton } from './core/components/AccountMenuButton/AccountMenuButtonNew.vue'
export { default as DashboardCard } from './core/dashboard/components/DashboardCard.vue'
export { default as PachiGravatar } from './core/components/PachiGravatar.vue'
export { default as PachiLogo } from './core/components/PachiLogo.vue'
export { default as PachiLoadingState } from './core/components/PachiLoadingState.vue'
export { default as PachiScrollArea } from './core/components/PachiScrollArea.vue'
export { default as PachiEmptyState } from './core/components/PachiEmptyState.vue'
export { default as PachiErrorState } from './core/components/PachiErrorState.vue'
export { default as ToggleThemeButton } from './core/components/ToggleThemeButton.vue'
export { useAppBar } from './core/composables/use-app-bar'
export type { IDashboardCard, IDashboardCardStat, IDashboardWidget } from './core/dashboard/types/dashboard'
export { PACHI_TITLE_ANIMATIONS } from './core/dashboard/helpers/title-animation'
export type { PachiTitleAnimation } from './core/dashboard/helpers/title-animation'

// ── Services, stores, helpers ──────────────────────────────────────────────────────
export {
  AuthManager,
  PACHI_AUTH_REFRESH_HEADER,
  PACHI_AUTH_REFRESH_HEADER_VALUE,
  useAuthStore
} from './services/auth-manager'
export type { IMfaRequiredResponse, IToken, ITokenResponse, LoginResult } from './services/auth-manager'
export type { IEngineInfo, IUserInfo } from './services/auth-manager/types/auth-manager'
export { WebSocketManager } from './services/ws-manager'
export type {
  IWebSocketManagerHandler,
  IWebSocketManagerHandlers,
  IWebSocketManagerMessage
} from './services/ws-manager/types/ws-manager'
export { usePachiEventsStore } from './stores/pachi-events'
export { errorMessage } from './helpers/errormessages-helper'
export { safeNextPath } from './helpers/next-path'
export { parseRetryAfter, retryAfterFromError, formatCountdown } from './helpers/retry-after'
export { gravatarHash, gravatarUrl, initialsOf } from './helpers/gravatar-helper'
export { createPachiAvatarResolver, PACHI_AVATAR_URL_KEY } from './helpers/avatar-resolver'
export { createPachiLogout, PACHI_LOGOUT_KEY } from './helpers/logout-provider'
export { PACHI_AUTH_CHANGED_EVENT, PACHI_THEME_CHANGED_EVENT } from './helpers/auth-events'
export type { PachiAuthChangedDetail, PachiThemeChangedDetail } from './helpers/auth-events'
export type { PachiLogout } from './helpers/logout-provider'
export type { PachiAvatarResolver } from './helpers/avatar-resolver'
export { isSameOrigin } from './helpers/url-helper'
export { pachiLogo, pachiLogoDuotone } from './extras/pachi-icons'
export type { DuotoneIcon } from './extras/pachi-icons'
export type { AwaitableEmit } from './types/awaitableemit'
export type { IPaginatedResponse } from './types/responses'
