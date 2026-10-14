/**
 * Calcola l'etichetta di un'opzione senza mai lanciare: un `optionLabel` funzione scritto per
 * opzioni "vere" può fallire su un'opzione virtuale o malformata; in tal caso restituisce `''`.
 *
 * @param getLabel - estrattore di etichetta
 * @param item - opzione
 * @returns l'etichetta (stringa vuota se l'estrattore lancia o non restituisce un valore)
 */
export function safeLabel(getLabel: (item: unknown) => string, item: unknown): string {
  try {
    const label: unknown = getLabel(item)
    return label === null || label === undefined ? '' : String(label)
  } catch {
    return ''
  }
}

/**
 * Aggiunge alle opzioni caricate quelle "virtuali" create al volo, se non già presenti
 * (confronto sul valore `optionValue`).
 *
 * @param items - opzioni caricate (locali o remote)
 * @param virtuals - opzioni virtuali da conservare
 * @param valueKey - chiave del valore dell'opzione
 * @returns un nuovo array con le opzioni e le virtuali mancanti
 */
export function mergeVirtualOptions(items: unknown[], virtuals: unknown[], valueKey: string): unknown[] {
  if (!virtuals.length) return items
  const read = (item: unknown): unknown =>
    item !== null && typeof item === 'object' ? (item as Record<string, unknown>)[valueKey] : item
  const present = new Set(items.map(read))
  return [...items, ...virtuals.filter((v) => !present.has(read(v)))]
}
