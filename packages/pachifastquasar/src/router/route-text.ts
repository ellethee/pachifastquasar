import { useI18n } from 'vue-i18n'
import type { RouteMeta } from 'vue-router'

/**
 * Resolver of the texts of a route (title and description) in the current language.
 * `meta.titleKey` / `meta.descriptionKey` are i18n keys resolved with `t()` (reactive to language
 * changes); `meta.title` / `meta.description` remain literal strings (backward compatible) used
 * when the key is not present.
 *
 * @returns `routeTitle(meta)` and `routeDescription(meta)` functions; empty string if absent
 */
export function useRouteText() {
  const { t } = useI18n()

  /** Route title in the current language. */
  function routeTitle(meta?: Partial<RouteMeta>): string {
    if (meta?.titleKey) return t(meta.titleKey)
    return meta?.title ?? ''
  }

  /** Route description in the current language. */
  function routeDescription(meta?: Partial<RouteMeta>): string {
    if (meta?.descriptionKey) return t(meta.descriptionKey)
    return meta?.description ?? ''
  }

  /** True if the route has a title (literal or key). */
  function hasTitle(meta?: Partial<RouteMeta>): boolean {
    return !!(meta?.titleKey || meta?.title)
  }

  return { routeTitle, routeDescription, hasTitle }
}
