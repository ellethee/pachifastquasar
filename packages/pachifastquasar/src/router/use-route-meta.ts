import { computed } from 'vue'
import type { ComputedRef } from 'vue'
import { useRoute } from 'vue-router'
import type { RouteMeta } from 'vue-router'

/**
 * Returns the meta of the current route as a recursive merge
 * from the farthest parent down to the current child.
 * The child meta always takes precedence over the parent one.
 *
 * The child `title`/`titleKey` and `description`/`descriptionKey` replace the parent pair.
 *
 * Example:
 *   parent: { title: 'Pachi', icon: mdiHome, description: 'Root' }
 *   child:  { title: 'Upload' }
 *   result: { title: 'Upload', icon: mdiHome, description: 'Root' }
 */
export function useRouteMeta(): ComputedRef<RouteMeta> {
  const route = useRoute()
  return computed(() =>
    route.matched.reduce<RouteMeta>((acc, r) => {
      const next: RouteMeta = { ...acc, ...r.meta }
      // a literal child title/description replaces the key inherited from the parent (and vice versa)
      if (r.meta.title && !r.meta.titleKey) delete next.titleKey
      if (r.meta.titleKey && !r.meta.title) delete next.title
      if (r.meta.description && !r.meta.descriptionKey) delete next.descriptionKey
      if (r.meta.descriptionKey && !r.meta.description) delete next.description
      return next
    }, {})
  )
}
