import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { IUserSettings } from '../types/settings-manager'
import { getByPath, setByPath } from '../helpers/path'

/** Initial settings (empty). */
function initialSettings(): Record<string, IUserSettings> {
  return {}
}

/**
 * Pinia store of the current user's settings. NOT persisted: each user has their own settings,
 * loaded from the backend at login; values needed before the response (theme, language, ...) live in the
 * per-user cache (`pachi-settings-cache:<user>`), see `SettingsManager`.
 */
export const useSettingsStore = defineStore('settings', () => {
  const userSettings = ref<Record<string, IUserSettings>>(initialSettings())

  /**
   * Clears the settings (and thus the persisted data): call at logout.
   */
  function clearSettings(): void {
    userSettings.value = initialSettings()
  }

  /** Backward-compatible alias of {@link clearSettings}. */
  function resetSettings(): void {
    clearSettings()
  }

  /**
   * Sets a value (also nested with `a.b`); dangerous keys (`__proto__`, `constructor`, `prototype`) are ignored.
   *
   * @param appKey - category
   * @param settingKey - key or path
   * @param value - new value
   */
  function setValue(appKey: string, settingKey: string, value: unknown): void {
    if (['__proto__', 'constructor', 'prototype'].includes(appKey)) return
    if (!Object.hasOwn(userSettings.value, appKey)) userSettings.value[appKey] = {}
    setByPath(userSettings.value[appKey], settingKey, value)
  }

  /**
   * Reads a value (also nested with `a.b`).
   *
   * @param appKey - category
   * @param settingKey - key or path
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
