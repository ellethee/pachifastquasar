import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { IUserSettings } from '../types/settings-manager'
import { getByPath, setByPath } from '../helpers/path'

/** Impostazioni iniziali (vuote). */
function initialSettings(): Record<string, IUserSettings> {
  return {}
}

/**
 * Store Pinia delle impostazioni dell'utente corrente. NON è persistito: ogni utente ha le proprie impostazioni,
 * caricate dal backend al login; i valori che servono prima della risposta (tema, lingua, ...) stanno nella cache
 * per utente (`pachi-settings-cache:<utente>`), vedi `SettingsManager`.
 */
export const useSettingsStore = defineStore('settings', () => {
  const userSettings = ref<Record<string, IUserSettings>>(initialSettings())

  /**
   * Svuota le impostazioni (e quindi il dato persistito): da chiamare al logout.
   */
  function clearSettings(): void {
    userSettings.value = initialSettings()
  }

  /** Alias retrocompatibile di {@link clearSettings}. */
  function resetSettings(): void {
    clearSettings()
  }

  /**
   * Imposta un valore (anche annidato con `a.b`); chiavi pericolose (`__proto__`, `constructor`, `prototype`) sono ignorate.
   *
   * @param appKey - categoria
   * @param settingKey - chiave o percorso
   * @param value - nuovo valore
   */
  function setValue(appKey: string, settingKey: string, value: unknown): void {
    if (['__proto__', 'constructor', 'prototype'].includes(appKey)) return
    if (!Object.hasOwn(userSettings.value, appKey)) userSettings.value[appKey] = {}
    setByPath(userSettings.value[appKey], settingKey, value)
  }

  /**
   * Legge un valore (anche annidato con `a.b`).
   *
   * @param appKey - categoria
   * @param settingKey - chiave o percorso
   */
  function getValue(appKey: string, settingKey: string): unknown {
    if (!Object.hasOwn(userSettings.value, appKey)) return undefined
    return getByPath(userSettings.value[appKey], settingKey)
  }

  return {
    userSettings,
    clearSettings,
    resetSettings,
    setValue,
    getValue,
  }
})
