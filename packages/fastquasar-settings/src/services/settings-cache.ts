import { readStorage, removeStorage, writeStorage } from '../helpers/storage'
import type { SettingsApplyMap } from '../helpers/apply'

/** localStorage key prefix of the cache (one per user). */
export const SETTINGS_CACHE_PREFIX = 'pachi-settings-cache:'

/** Cache of only the values bound to an applier, to reapply them at boot before the backend responds. */
export interface ISettingsCache {
  /** Format version. */
  v: 1
  /** `category.field` -> applier name. */
  apply: SettingsApplyMap
  /** `category.field` -> last known value. */
  values: Record<string, unknown>
}

/**
 * localStorage key of a user's cache.
 *
 * @param userKey - user identifier (id or username)
 */
export function settingsCacheKey(userKey: string): string {
  return `${SETTINGS_CACHE_PREFIX}${userKey}`
}

/**
 * Reads a user's cache; `null` if missing or unreadable.
 *
 * @param userKey - user identifier
 */
export function readSettingsCache(userKey: string): ISettingsCache | null {
  const raw = readStorage(settingsCacheKey(userKey))
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<ISettingsCache> | null
    if (!parsed || parsed.v !== 1 || typeof parsed.apply !== 'object' || typeof parsed.values !== 'object') return null
    return { v: 1, apply: parsed.apply ?? {}, values: parsed.values ?? {} }
  } catch {
    return null
  }
}

/**
 * Saves a user's cache.
 *
 * @param userKey - user identifier
 * @param cache - content
 */
export function writeSettingsCache(userKey: string, cache: ISettingsCache): void {
  writeStorage(settingsCacheKey(userKey), JSON.stringify(cache))
}

/**
 * Deletes a user's cache.
 *
 * @param userKey - user identifier
 */
export function removeSettingsCache(userKey: string): void {
  removeStorage(settingsCacheKey(userKey))
}
