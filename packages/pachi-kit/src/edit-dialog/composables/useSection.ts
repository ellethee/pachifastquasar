import { computed, ref, inject, hasInjectionContext, watch } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import type { ISectionContext } from '../types/sections'
import { SectionContextKey } from '../types/sections'
import { cloneValue } from '../utils/clone-value'
import { isEqualValue } from '../utils/equal'

/** Result of `useSection`. */
export interface IUseSection<T> {
  state: Ref<T>
  /** Current baseline (read-only). */
  originalState: Readonly<Ref<T>>
  reset: () => void
  /** Sets the current baseline and state (e.g. when the record to edit arrives). */
  setOriginalState: (value: T) => void
  /** Rebuilds the baseline from the current state (to be called after a successful save). */
  commit: () => void
  getResults: () => T
  hasChanges: ComputedRef<boolean>
  sharedState: ISectionContext['sharedState'] | undefined
  setSharedValue: ISectionContext['setSharedValue'] | undefined
  getSharedValue: ISectionContext['getSharedValue'] | undefined
}

/** Options of `useSection`. */
export interface IUseSectionOptions<T> {
  /**
   * Getter of the reactive initial value (e.g. `() => props.initialValue`): on every change
   * (even after mount, async record) baseline and state are reset, but only if the
   * CONTENT differs from the last applied one: a new reference with the same content
   * (e.g. the parent reassigning the record) does not erase the user's changes.
   */
  initialValue?: () => T | undefined
}

/**
 * Local state of a section with baseline, reset and dirty-check.
 * @param initialState initial state
 * @param options options (watch on the initial value)
 */
export function useSection<T>(initialState: T, options: IUseSectionOptions<T> = {}): IUseSection<T> {
  const state = ref(cloneValue(initialState)) as Ref<T>
  const originalState = ref(cloneValue(initialState)) as Ref<T>

  const sectionContext = hasInjectionContext() ? inject<ISectionContext | null>(SectionContextKey, null) : null

  function reset() {
    state.value = cloneValue(originalState.value)
  }

  function setOriginalState(value: T) {
    originalState.value = cloneValue(value)
    state.value = cloneValue(value)
  }

  function commit() {
    originalState.value = cloneValue(state.value)
  }

  function getResults(): T {
    return state.value
  }

  const hasChanges = computed(() => {
    return !isEqualValue(state.value, originalState.value)
  })

  if (options.initialValue) {
    let applied: { value: T } | null = null
    watch(options.initialValue, (value) => {
      if (value === undefined) return
      if (applied && isEqualValue(applied.value, value)) return
      applied = { value: cloneValue(value) }
      setOriginalState(value)
    }, { immediate: true, deep: true })
  }

  return {
    state,
    originalState: originalState as Readonly<Ref<T>>,
    reset,
    setOriginalState,
    commit,
    getResults,
    hasChanges,
    sharedState: sectionContext?.sharedState,
    setSharedValue: sectionContext?.setSharedValue,
    getSharedValue: sectionContext?.getSharedValue
  }
}
