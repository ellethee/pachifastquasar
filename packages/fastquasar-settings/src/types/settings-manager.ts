import type { Component } from 'vue'
import type { SettingsActionSpec } from '../helpers/actions'

/** Componente Vue risolto per un campo dello schema (QInput, QToggle, componente custom, ...). */
export type ComponentType = Component
export type Primitive = string | number | boolean | null
export type SettingValue = Primitive | IUserSettings

/** Insieme di impostazioni (chiave -> valore, anche annidato). */
export interface IUserSettings {
  [key: string]: SettingValue
}

/** Risposta dell'endpoint delle impostazioni utente (categoria -> impostazioni). */
export interface IUserSettingsResponse {
  [category: string]: IUserSettings
}

/** Descrizione di un singolo campo dello schema. */
export interface ISettingsSchema {
  component: string
  label?: string
  /** Chiave i18n del testo di `label` (es. `settings.audit.disable_activity_log.label`). */
  labelKey?: string
  /** Chiavi i18n delle proprietà di testo: `{ nomeProprietà: chiave }`. */
  propertyKeys?: Record<string, string>
  /** Chiavi i18n delle etichette delle opzioni: `{ valore: chiave }`. */
  optionKeys?: Record<string, string>
  properties?: Record<string, unknown>
  /**
   * Valore predefinito (JSON, anche `null`) esposto dal backend per i campi non obbligatori (pachifast >= 0.6.0).
   * Usato da "Reimposta l'aspetto" e dagli applier su `reset`; senza di esso valgono i fallback del frontend.
   */
  default?: unknown
  /**
   * Nome di un applier (`theme`, `accent`, `density`, `fontScale`, `reduceMotion`, `locale` o uno registrato con
   * `registerSettingsApplier`) eseguito al caricamento, a ogni modifica e dalla cache al boot.
   */
  apply?: string | null
  /** `{ evento Vue: azione }`; l'azione è una stringa legacy o `{ action, args }`. */
  events?: Record<string, SettingsActionSpec>
  /**
   * `{ campo osservato: azione }` (il campo può stare nella stessa sezione, o essere `sezione.campo`)
   * oppure `true` (legacy: riusa `events` sul valore del campo stesso).
   */
  watch?: Record<string, SettingsActionSpec> | boolean
  [key: string]: unknown
}

/** Campo dello schema con il componente già risolto. */
export interface ISettingsSchemaExtended extends Omit<ISettingsSchema, 'component'> {
  component: ComponentType
}

/** Categoria (sezione) dello schema. */
export interface ISettingsCategory {
  title: string
  /** Chiave i18n del titolo (es. `settings.preferences.title`). */
  titleKey?: string
  icon: string | null
  route: string | null
  fields: Record<string, ISettingsSchema>
}

/** Risposta dell'endpoint dello schema delle impostazioni. */
export interface ISettingsSchemaResponse {
  [key: string]: ISettingsCategory
}
