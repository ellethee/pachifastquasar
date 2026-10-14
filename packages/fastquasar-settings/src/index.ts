import './styles/theme-defaults.scss'
export { default as PachiSettingsPage } from './components/PachiSettingsPage.vue'
export { SettingsManager } from './services/settings-manager'
export { useSettingsStore } from './services/settings-store'
export { setPachiSettingsOptions, getPachiSettingsOptions } from './helpers/http'
export { installPachiSettings, AUTH_CHANGED_EVENT, THEME_CHANGED_EVENT } from './services/auth-sync'
export type { IAuthChangedDetail, IInstallPachiSettingsOptions } from './services/auth-sync'
export { registerSettingsApplier, listSettingsAppliers, ACCENT_PRESETS } from './services/appliers'
export type {
  IAccentPreset,
  ISettingsApplierContext,
  SettingsApplier,
  SettingsApplySource,
} from './services/appliers'
export { FALLBACK_DEFAULTS, collectDefaults, resolveFieldDefault } from './helpers/defaults'
export { registerSettingsActions, listSettingsActions } from './helpers/actions'
export type { ISettingsActionContext, ISettingsActionDeps, SettingsActionHandler, SettingsActionSpec } from './helpers/actions'
export { resolveSettingsIcon, setPachiSettingsIcons } from './helpers/icons'
export type { IPachiSettingsHttp, IPachiSettingsOptions, IPachiSettingsRequestConfig } from './helpers/http'
export type {
  IUserSettings,
  ISettingsSchemaResponse,
  ISettingsSchema,
  ISettingsCategory,
  ISettingsSchemaExtended,
  IUserSettingsResponse,
  ComponentType,
  SettingValue,
} from './types/settings-manager'
