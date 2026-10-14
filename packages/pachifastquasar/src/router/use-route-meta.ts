import { computed } from 'vue'
import type { ComputedRef } from 'vue'
import { useRoute } from 'vue-router'
import type { RouteMeta } from 'vue-router'

/**
 * Restituisce il meta della route corrente come merge ricorsivo
 * dal parent più lontano fino al figlio corrente.
 * I meta del figlio hanno sempre precedenza su quelli del parent.
 *
 * `title`/`titleKey` e `description`/`descriptionKey` del figlio sostituiscono la coppia del parent.
 *
 * Esempio:
 *   parent: { title: 'Pachi', icon: mdiHome, description: 'Root' }
 *   child:  { title: 'Upload' }
 *   result: { title: 'Upload', icon: mdiHome, description: 'Root' }
 */
export function useRouteMeta(): ComputedRef<RouteMeta> {
  const route = useRoute()
  return computed(() =>
    route.matched.reduce<RouteMeta>((acc, r) => {
      const next: RouteMeta = { ...acc, ...r.meta }
      // un titolo/descrizione letterale del figlio sostituisce la chiave ereditata dal parent (e viceversa)
      if (r.meta.title && !r.meta.titleKey) delete next.titleKey
      if (r.meta.titleKey && !r.meta.title) delete next.title
      if (r.meta.description && !r.meta.descriptionKey) delete next.descriptionKey
      if (r.meta.descriptionKey && !r.meta.description) delete next.description
      return next
    }, {})
  )
}
