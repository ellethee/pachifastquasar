/**
 * Computes an option's label without ever throwing: a function `optionLabel` written for
 * "real" options may fail on a virtual or malformed option; in that case it returns `''`.
 *
 * @param getLabel - label extractor
 * @param item - option
 * @returns the label (empty string if the extractor throws or returns no value)
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
 * Adds to the loaded options the "virtual" ones created on the fly, if not already present
 * (compared on the `optionValue` value).
 *
 * @param items - loaded options (local or remote)
 * @param virtuals - virtual options to keep
 * @param valueKey - option value key
 * @returns a new array with the options and the missing virtual ones
 */
export function mergeVirtualOptions(items: unknown[], virtuals: unknown[], valueKey: string): unknown[] {
  if (!virtuals.length) return items
  const read = (item: unknown): unknown =>
    item !== null && typeof item === 'object' ? (item as Record<string, unknown>)[valueKey] : item
  const present = new Set(items.map(read))
  return [...items, ...virtuals.filter((v) => !present.has(read(v)))]
}
