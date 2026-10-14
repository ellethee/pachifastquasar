import type { AdminPk } from '../types/admin'
import type { IAdminApi } from './api'

/** Numero massimo di titoli mostrati nelle conferme. */
export const MAX_LABELS = 5
/** Numero massimo di id chiesti con una sola chiamata. */
const MAX_IDS = 50

/** Titoli da mostrare e quanti altri restano. */
export interface IRowLabelSummary {
  shown: string[]
  more: number
}

/**
 * Riassume i titoli delle righe: i primi `max` e il numero degli altri (sul totale delle righe selezionate).
 *
 * @param labels - titoli ricevuti
 * @param total - numero totale di righe coinvolte
 * @param max - titoli da mostrare
 */
export function summarizeLabels(labels: string[], total: number, max = MAX_LABELS): IRowLabelSummary {
  const shown = labels.slice(0, max)
  return { shown, more: Math.max(0, total - shown.length) }
}

/**
 * Titoli delle righe con UNA sola chiamata `_options?ids=` del modello stesso (gli errori danno elenco vuoto).
 *
 * @param api - client API
 * @param app - app
 * @param model - modello
 * @param ids - chiavi primarie (si chiedono al massimo le prime 50)
 * @returns i titoli, nell'ordine delle `ids` quando possibile
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
