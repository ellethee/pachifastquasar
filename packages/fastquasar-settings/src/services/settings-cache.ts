import { readStorage, removeStorage, writeStorage } from '../helpers/storage'
import type { SettingsApplyMap } from '../helpers/apply'

/** Prefisso della chiave localStorage della cache (una per utente). */
export const SETTINGS_CACHE_PREFIX = 'pachi-settings-cache:'

/** Cache dei soli valori legati a un applier, per riapplicarli al boot prima della risposta del backend. */
export interface ISettingsCache {
  /** Versione del formato. */
  v: 1
  /** `categoria.campo` -> nome dell'applier. */
  apply: SettingsApplyMap
  /** `categoria.campo` -> ultimo valore noto. */
  values: Record<string, unknown>
}

/**
 * Chiave localStorage della cache di un utente.
 *
 * @param userKey - identificativo dell'utente (id o username)
 */
export function settingsCacheKey(userKey: string): string {
  return `${SETTINGS_CACHE_PREFIX}${userKey}`
}

/**
 * Legge la cache di un utente; `null` se assente o illeggibile.
 *
 * @param userKey - identificativo dell'utente
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
 * Salva la cache di un utente.
 *
 * @param userKey - identificativo dell'utente
 * @param cache - contenuto
 */
export function writeSettingsCache(userKey: string, cache: ISettingsCache): void {
  writeStorage(settingsCacheKey(userKey), JSON.stringify(cache))
}

/**
 * Elimina la cache di un utente.
 *
 * @param userKey - identificativo dell'utente
 */
export function removeSettingsCache(userKey: string): void {
  removeStorage(settingsCacheKey(userKey))
}
