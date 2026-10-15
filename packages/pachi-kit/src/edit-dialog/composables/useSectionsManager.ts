import { provide, ref } from 'vue'
import { SectionContextKey } from '../types/sections'
import { cloneValue } from '../utils/clone-value'
import type {
  ISectionContext,
  ISectionSharedState
} from '../types/sections'

/**
 * Creates and provides the context shared between sections.
 * @param initialSharedState initial shared state (cloned)
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
