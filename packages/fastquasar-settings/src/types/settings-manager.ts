import type { Component } from 'vue'
import type { SettingsActionSpec } from '../helpers/actions'

/** Vue component resolved for a schema field (QInput, QToggle, custom component, ...). */
export type ComponentType = Component
export type Primitive = string | number | boolean | null
export type SettingValue = Primitive | IUserSettings

/** Set of settings (key -> value, possibly nested). */
export interface IUserSettings {
  [key: string]: SettingValue
}

/** Response of the user settings endpoint (category -> settings). */
export interface IUserSettingsResponse {
  [category: string]: IUserSettings
}

/** Description of a single schema field. */
export interface ISettingsSchema {
  component: string
  label?: string
  /** i18n key of the `label` text (e.g. `settings.audit.disable_activity_log.label`). */
  labelKey?: string
  /** i18n keys of the text properties: `{ propertyName: key }`. */
  propertyKeys?: Record<string, string>
  /** i18n keys of the option labels: `{ value: key }`. */
  optionKeys?: Record<string, string>
  properties?: Record<string, unknown>
  /**
   * Default value (JSON, also `null`) exposed by the backend for non-required fields (pachifast >= 0.6.0).
   * Used by "Reset appearance" and by appliers on `reset`; without it the frontend fallbacks apply.
   */
  default?: unknown
  /**
   * Name of an applier (`theme`, `accent`, `density`, `fontScale`, `reduceMotion`, `locale` or one registered with
   * `registerSettingsApplier`) run on load, on every change and from the cache at boot.
   */
  apply?: string | null
  /** `{ Vue event: action }`; the action is a legacy string or `{ action, args }`. */
  events?: Record<string, SettingsActionSpec>
  /**
   * `{ watched field: action }` (the field can be in the same section, or be `section.field`)
   * or `true` (legacy: reuses `events` on the field's own value).
   */
  watch?: Record<string, SettingsActionSpec> | boolean
  [key: string]: unknown
}

/** Schema field with the component already resolved. */
export interface ISettingsSchemaExtended extends Omit<ISettingsSchema, 'component'> {
  component: ComponentType
}

/** Schema category (section). */
export interface ISettingsCategory {
  title: string
  /** i18n key of the title (e.g. `settings.preferences.title`). */
  titleKey?: string
  icon: string | null
  route: string | null
  fields: Record<string, ISettingsSchema>
}

/** Response of the settings schema endpoint. */
export interface ISettingsSchemaResponse {
  [key: string]: ISettingsCategory
}
