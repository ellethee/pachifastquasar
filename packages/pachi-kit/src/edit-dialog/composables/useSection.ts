import { computed, ref, inject, hasInjectionContext, watch } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import type { ISectionContext } from '../types/sections'
import { SectionContextKey } from '../types/sections'
import { cloneValue } from '../utils/clone-value'
import { isEqualValue } from '../utils/equal'

/** Risultato di `useSection`. */
export interface IUseSection<T> {
  state: Ref<T>
  /** Baseline corrente (sola lettura). */
  originalState: Readonly<Ref<T>>
  reset: () => void
  /** Imposta baseline e stato correnti (es. quando arriva il record da modificare). */
  setOriginalState: (value: T) => void
  /** Rifà il baseline dallo stato corrente (da chiamare dopo un salvataggio riuscito). */
  commit: () => void
  getResults: () => T
  hasChanges: ComputedRef<boolean>
  sharedState: ISectionContext['sharedState'] | undefined
  setSharedValue: ISectionContext['setSharedValue'] | undefined
  getSharedValue: ISectionContext['getSharedValue'] | undefined
}

/** Opzioni di `useSection`. */
export interface IUseSectionOptions<T> {
  /**
   * Getter del valore iniziale reattivo (es. `() => props.initialValue`): a ogni cambio
   * (anche dopo il mount, record asincrono) baseline e stato vengono reimpostati, ma solo se il
   * CONTENUTO e' diverso dall'ultimo applicato: un nuovo riferimento con lo stesso contenuto
   * (es. riassegnazione del record dal parent) non cancella le modifiche dell'utente.
   */
  initialValue?: () => T | undefined
}

/**
 * Stato locale di una sezione con baseline, reset e dirty-check.
 * @param initialState stato di partenza
 * @param options opzioni (watch sul valore iniziale)
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
