import { useI18n } from 'vue-i18n'
import type { RouteMeta } from 'vue-router'

/**
 * Risolutore dei testi di una route (titolo e descrizione) nella lingua corrente.
 * `meta.titleKey` / `meta.descriptionKey` sono chiavi i18n risolte con `t()` (reattive al cambio
 * lingua); `meta.title` / `meta.description` restano stringhe letterali (retrocompatibili) usate
 * quando la chiave non è presente.
 *
 * @returns funzioni `routeTitle(meta)` e `routeDescription(meta)`; stringa vuota se assenti
 */
export function useRouteText() {
  const { t } = useI18n()

  /** Titolo della route nella lingua corrente. */
  function routeTitle(meta?: Partial<RouteMeta>): string {
    if (meta?.titleKey) return t(meta.titleKey)
    return meta?.title ?? ''
  }

  /** Descrizione della route nella lingua corrente. */
  function routeDescription(meta?: Partial<RouteMeta>): string {
    if (meta?.descriptionKey) return t(meta.descriptionKey)
    return meta?.description ?? ''
  }

  /** Vero se la route ha un titolo (letterale o chiave). */
  function hasTitle(meta?: Partial<RouteMeta>): boolean {
    return !!(meta?.titleKey || meta?.title)
  }

  return { routeTitle, routeDescription, hasTitle }
}
