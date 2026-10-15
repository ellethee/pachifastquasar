import type { IDashboardActivity, IDashboardSystemInfo } from '../types/dashboard-widgets'

/**
 * Validates the activity endpoint response: any value that is not an array of objects
 * produces an empty list.
 *
 * @param data - raw backend response
 * @returns list of activities (possibly empty)
 */
export function parseActivities(data: unknown): IDashboardActivity[] {
  if (!Array.isArray(data)) return []
  return data.filter((x): x is IDashboardActivity => typeof x === 'object' && x !== null)
}

/**
 * Validates the system endpoint response: accepts only a non-array object.
 *
 * @param data - raw backend response
 * @returns system info, or `null` if the response is not valid
 */
export function parseSystemInfo(data: unknown): IDashboardSystemInfo | null {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) return null
  return data as IDashboardSystemInfo
}
