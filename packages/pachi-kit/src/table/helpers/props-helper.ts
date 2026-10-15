/** Fixed boolean value or per-row function (used by `canEdit`/`canDelete`). */
export type RowFlag<T> = boolean | ((row: T) => boolean)

/**
 * Resolves a per-row permission: `undefined` is `true`, a function is evaluated on the row.
 *
 * @param flag - value or function
 * @param row - current row
 * @returns true if the action is allowed
 */
export function resolveRowFlag<T>(flag: RowFlag<T> | undefined, row: T): boolean {
  if (flag === undefined) return true
  return typeof flag === 'function' ? flag(row) : flag
}

/**
 * Tells whether the actions column should be shown: it needs `useColActions` and at least one action not statically
 * disabled (`canEdit`/`canDelete` equal to `false` hide it).
 *
 * @param useColActions - value of the `useColActions` prop
 * @param canEdit - `canEdit` prop
 * @param canDelete - `canDelete` prop
 * @returns true if the column should be shown
 */
export function shouldShowActionsColumn(useColActions: unknown, canEdit: unknown, canDelete: unknown): boolean {
  if (!useColActions) return false
  return !(canEdit === false && canDelete === false)
}

/**
 * Looks for an event listener among a component's vnode props, both in camelCase (`onPt2:editItem`,
 * from `@pt2:editItem` or `@pt2:edit-item` in SFC templates) and with the original name (`onPt2:edit-item`,
 * from render function/JSX).
 *
 * @param vnodeProps - vnode props (`instance.vnode.props`)
 * @param event - event name (e.g. `pt2:edit-item`)
 * @returns true if a listener exists
 */
export function hasEventListener(vnodeProps: Record<string, unknown> | null | undefined, event: string): boolean {
  if (!vnodeProps) return false
  const camel = event.replace(/-(\w)/g, (_, c: string) => c.toUpperCase())
  const cap = (s: string) => `on${s.charAt(0).toUpperCase()}${s.slice(1)}`
  return !!(vnodeProps[cap(camel)] || vnodeProps[cap(event)])
}
