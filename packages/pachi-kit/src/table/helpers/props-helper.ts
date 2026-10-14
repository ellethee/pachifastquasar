/** Valore booleano fisso oppure funzione per riga (usato da `canEdit`/`canDelete`). */
export type RowFlag<T> = boolean | ((row: T) => boolean)

/**
 * Risolve un permesso per riga: `undefined` vale `true`, una funzione viene valutata sulla riga.
 *
 * @param flag - valore o funzione
 * @param row - riga corrente
 * @returns true se l'azione e' consentita
 */
export function resolveRowFlag<T>(flag: RowFlag<T> | undefined, row: T): boolean {
  if (flag === undefined) return true
  return typeof flag === 'function' ? flag(row) : flag
}

/**
 * Indica se la colonna azioni va mostrata: serve `useColActions` e almeno un'azione non disattivata
 * in modo statico (`canEdit`/`canDelete` uguali a `false` la nascondono).
 *
 * @param useColActions - valore della prop `useColActions`
 * @param canEdit - prop `canEdit`
 * @param canDelete - prop `canDelete`
 * @returns true se la colonna va mostrata
 */
export function shouldShowActionsColumn(useColActions: unknown, canEdit: unknown, canDelete: unknown): boolean {
  if (!useColActions) return false
  return !(canEdit === false && canDelete === false)
}

/**
 * Cerca un listener di evento tra le props vnode di un componente, sia in camelCase (`onPt2:editItem`,
 * da `@pt2:editItem` o `@pt2:edit-item` nei template SFC) sia con il nome originale (`onPt2:edit-item`,
 * da render function/JSX).
 *
 * @param vnodeProps - props del vnode (`instance.vnode.props`)
 * @param event - nome dell'evento (es. `pt2:edit-item`)
 * @returns true se esiste un listener
 */
export function hasEventListener(vnodeProps: Record<string, unknown> | null | undefined, event: string): boolean {
  if (!vnodeProps) return false
  const camel = event.replace(/-(\w)/g, (_, c: string) => c.toUpperCase())
  const cap = (s: string) => `on${s.charAt(0).toUpperCase()}${s.slice(1)}`
  return !!(vnodeProps[cap(camel)] || vnodeProps[cap(event)])
}
