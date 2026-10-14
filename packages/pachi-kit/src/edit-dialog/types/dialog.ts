import type { ISectionSharedState } from './sections'

export interface IEditDialogData<T = unknown> {
  sections: Record<string, T|T[]>
  sharedState: ISectionSharedState
}

export interface IAwaitableDialogEmit<T = unknown> {
  data: T,
  onSuccess: () => void,
  onError: (error: unknown) => void,
}

export type AwaitableData = IAwaitableDialogEmit<IEditDialogData>
