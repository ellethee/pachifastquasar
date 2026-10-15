import type { AdminPk } from '../types/admin'
import type { IAdminApi } from './api'

/** Maximum number of titles shown in confirmations. */
export const MAX_LABELS = 5
/** Maximum number of ids requested with a single call. */
const MAX_IDS = 50

/** Titles to show and how many others remain. */
export interface IRowLabelSummary {
  shown: string[]
  more: number
}

/**
 * Summarizes the row titles: the first `max` and the number of the others (out of the total selected rows).
 *
 * @param labels - received titles
 * @param total - total number of rows involved
 * @param max - titles to show
 */
export function summarizeLabels(labels: string[], total: number, max = MAX_LABELS): IRowLabelSummary {
  const shown = labels.slice(0, max)
  return { shown, more: Math.max(0, total - shown.length) }
}

/**
 * Row titles with a SINGLE `_options?ids=` call of the model itself (errors yield an empty list).
 *
 * @param api - API client
 * @param app - app
 * @param model - model
 * @param ids - primary keys (at most the first 50 are requested)
 * @returns the titles, in the order of `ids` when possible
 */
export async function loadRowLabels(api: IAdminApi, app: string, model: string, ids: AdminPk[]): Promise<string[]> {
  if (!ids.length) return []
  try {
    const page = await api.options(app, model, { ids: ids.slice(0, MAX_IDS) })
    const byId = new Map(page.items.map((i) => [String(i.value), i.label]))
    const ordered = ids.map((id) => byId.get(String(id))).filter((l): l is string => !!l)
    return ordered.length ? ordered : page.items.map((i) => i.label)
  } catch {
    return []
  }
}
