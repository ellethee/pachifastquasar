import type { Component, InjectionKey, Ref } from 'vue'

export interface IContainerProps {
  icon?: string
  title?: string
  [key: string]: unknown
}
/** Container type: `card` (QCard), `expansion` (QExpansionItem), `div`; other strings fall back to `div`. */
export type ContainerType = 'card' | 'expansion' | 'div' | (string & {})
export interface IContainer extends IContainerProps {
  type: ContainerType
}
export interface IContainerComponent {
  component: unknown
  props?: IContainerProps
}


export interface ISectionExpose<T = unknown> {
  reset: () => void | Promise<void>
  /** Rebuilds the baseline from the current state (called after a successful save). */
  commit?: () => void
  getResults: () => T | Promise<T>
  hasChanges: () => boolean
  validate?: () => boolean | Promise<boolean>
  name?: string
}

export interface ISectionDefinition<T = unknown> {
  key: string
  title: string
  icon?: string | null
  component: Component
  container?: IContainer
  props?: Record<string, unknown>
  enabled?: boolean
  order?: number
  initialValue?: T
  side?: boolean
}

/** State of the `SchedulerSection` demo section (local `YYYY-MM-DD` dates). */
export interface SchedulerState {
  enabled: boolean
  selectedDates: string[]
}

/** State of the `PermissionsSection` demo section. */
export interface PermissionsState {
  roles: string[]
  users: string[]
}

export interface ISectionSharedState {
  [key: string]: unknown
}

export interface ISectionContext {
  sharedState: Ref<ISectionSharedState>
  setSharedValue: (key: string, value: unknown) => void
  getSharedValue: <T = unknown>(key: string) => T | undefined
}

export interface SectionsContainerExpose {
  resetAll: () => Promise<void>
  commitAll: () => void
  validateAll: () => Promise<boolean>
  getResults: () => Promise<Record<string, unknown>>
  hasChanges: () => boolean
}

export const SectionContextKey: InjectionKey<ISectionContext> = Symbol('SectionContext')
