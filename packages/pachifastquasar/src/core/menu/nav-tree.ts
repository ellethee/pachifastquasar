import type { RouteMeta, RouteRecordRaw } from 'vue-router'

/**
 * Node of the side menu tree (`label`, `icon`, `to`, `children`, `header`).
 */
export interface PachiNavItem {
  /** Visible text. */
  label: string
  /** Icon (mdi SVG path, `img:<url>`...). */
  icon?: string | undefined
  /** Absolute path; the group nodes expand instead of navigating. */
  to?: string | undefined
  /** Nested items (a node with children is a group). */
  children?: PachiNavItem[] | undefined
  /** Non-clickable section label. */
  header?: boolean | undefined
}

/** Options of {@link buildNavTree}. */
export interface BuildNavTreeOptions {
  /** Title of a route (`useRouteText().routeTitle`); the path is used when empty. */
  title: (meta: Partial<RouteMeta>) => string
  /** Extra visibility filter (e.g. `authManager.canAccess` when auth is enabled); `meta.hidden` is always applied. */
  canAccess?: ((meta: Partial<RouteMeta>) => boolean) | undefined
  /** Path of the parent of `routes` (default `/`). */
  basePath?: string
}

/** Joins a (possibly relative) route path to its parent path. */
function resolvePath(parent: string, path: string): string {
  return (path.startsWith('/') ? path : `${parent}/${path}`).replace(/\/+/g, '/')
}

/**
 * Builds the side menu tree from the route records, with the same filters as the dashboard cards
 * (`meta.hidden !== true`, `canAccess`). Routes with an empty path (index routes), a catch-all or
 * dynamic segments (`:id`) are skipped. Children are kept in the given order, nested to any depth;
 * a group whose children are all filtered out becomes a plain item.
 *
 * @param routes - route records (e.g. the children of the layout route)
 * @param options - see {@link BuildNavTreeOptions}
 * @returns the tree of items
 */
export function buildNavTree(
  routes: readonly RouteRecordRaw[],
  options: BuildNavTreeOptions
): PachiNavItem[] {
  const { title, canAccess, basePath = '/' } = options
  const items: PachiNavItem[] = []
  for (const route of routes) {
    const path = String(route.path ?? '')
    if (path === '' || path.includes(':') || path.includes('*')) continue
    const meta: Partial<RouteMeta> = route.meta ?? {}
    if (meta.hidden === true || (canAccess && !canAccess(meta))) continue
    const to = resolvePath(basePath, path)
    const children = route.children?.length
      ? buildNavTree(route.children, { ...options, basePath: to })
      : []
    items.push({
      label: title(meta) || path,
      icon: meta.icon,
      to,
      children: children.length > 0 ? children : undefined
    })
  }
  return items
}

/**
 * Whether `item` or any of its descendants matches the current path (the item path or a sub-path).
 *
 * @param item - menu node
 * @param currentPath - current route path
 * @returns true if the node or a descendant is the active route
 */
export function isNavItemActive(item: PachiNavItem, currentPath: string): boolean {
  if (item.to && (currentPath === item.to || currentPath.startsWith(`${item.to}/`))) return true
  return item.children?.some(child => isNavItemActive(child, currentPath)) ?? false
}
