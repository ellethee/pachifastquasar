import { provide, ref } from 'vue'
import { SectionContextKey } from '../types/sections'
import { cloneValue } from '../utils/clone-value'
import type {
  ISectionContext,
  ISectionSharedState
} from '../types/sections'

/**
 * Crea e fornisce (provide) il contesto condiviso tra le sezioni.
 * @param initialSharedState stato condiviso iniziale (clonato)
 */
export function useSectionsManager(initialSharedState: ISectionSharedState = {}) {
  const sharedState = ref<ISectionSharedState>(cloneValue(initialSharedState))

  function setSharedValue(key: string, value: unknown) {
    sharedState.value = {
      ...sharedState.value,
      [key]: value
    }
  }

  function getSharedValue<T = unknown>(key: string): T | undefined {
    return sharedState.value[key] as T | undefined
  }

  const context: ISectionContext = {
    sharedState,
    setSharedValue,
    getSharedValue
  }

  provide(SectionContextKey, context)

  return {
    sharedState,
    setSharedValue,
    getSharedValue
  }
}
