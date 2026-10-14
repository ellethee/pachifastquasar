import type { IDashboardActivity, IDashboardSystemInfo } from '../types/dashboard-widgets'

/**
 * Valida la risposta dell'endpoint attività: qualunque valore che non sia un array di oggetti
 * produce una lista vuota.
 *
 * @param data - risposta grezza del backend
 * @returns lista di attività (eventualmente vuota)
 */
export function parseActivities(data: unknown): IDashboardActivity[] {
  if (!Array.isArray(data)) return []
  return data.filter((x): x is IDashboardActivity => typeof x === 'object' && x !== null)
}

/**
 * Valida la risposta dell'endpoint di sistema: accetta solo un oggetto non-array.
 *
 * @param data - risposta grezza del backend
 * @returns informazioni di sistema o `null` se la risposta non è valida
 */
export function parseSystemInfo(data: unknown): IDashboardSystemInfo | null {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) return null
  return data as IDashboardSystemInfo
}
