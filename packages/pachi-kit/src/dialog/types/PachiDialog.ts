import type { QBtnProps, QEditorCommand, QEditorProps } from 'quasar'
import type { Component, Ref, VNodeChild } from 'vue'

/** Configurable action button of the dialog (extends the `QBtn` props). */
export interface IPachiDialogButton extends QBtnProps {
  label: string
  action?: (_payload?: unknown) => void
  primary?: boolean
  disabled?: boolean
  color?: string
  icon?: string
  emit?: string
}

/** Structured message that an action can return to the dialog. */
export interface IPachiDialogMessage {
  kind: 'dialog-message'
  type?: 'positive' | 'negative' | 'warning' | 'info'
  message: string
  success?: boolean
  payload?: boolean | Record<string, unknown>
}

/** Dialog content passed as a prop: Vue component or render function (function returning a VNode). */
export type PachiDialogContent = Component | (() => VNodeChild)

/** `PachiDialog` props. */
export interface IPachiDialogProps {
  icon?: string | null
  title: string
  /** Title toolbar classes (default `bg-primary text-white`). */
  titleClass?: string
  rounded?: boolean
  shaped?: boolean
  top?: string | null
  left?: string | null
  bottom?: string | null
  right?: string | null
  width?: string | null
  height?: string | null
  minWidth?: string | null
  minHeight?: string | null
  maxWidth?: string | null
  maxHeight?: string | null
  actionClasses?: string[]
  /** Disables (does not hide) the confirm button. */
  confirmDisabled?: boolean
  /** Disables (does not hide) the close button. */
  cancelDisabled?: boolean
  cardClass?: string | null
  /** Shows the text label next to the icon of the action buttons (default `false`: icon only with tooltip). */
  showActionLabels?: boolean
  /** Uses the "restore/save/close" actions instead of confirm/close. */
  useEditActions?: boolean
  hasChanges?: boolean
  /** With `useEditActions` and `hasChanges` asks for confirmation before closing (default true). */
  avoidHideWithChanges?: boolean
  /**
   * Dialog content as a component or render function, alternative to the default slot
   * (slots cannot be passed with `Dialog.create({ component: PachiDialog })`). The slot takes precedence.
   * Equivale a {@link PachiDialogContent} (written this way so that the Vue compiler derives the Object|Function runtime types).
   */
  content?: object | (() => VNodeChild)
  /** Props passed to `content` (if it is a component). */
  contentProps?: Record<string, unknown>
}

/** Editor options (`useEditorOptions`). */
export interface IEditorOptions {
  editorHeight?: string
  displayClass?: string
  disableTypes?: boolean
  editorButtons?: Record<string, IEditorButtons>
  qEditorProps?: Partial<QEditorProps>
}

/** Definition of a custom `QEditor` button with handlers that receive the text. */
export interface IEditorButtons extends Omit<QEditorCommand, 'handler' | 'toggled'> {
  toggled?: (text: string|Ref<string>, ...args: unknown[]) => boolean
  handler?: (text: string|Ref<string>, ...args: unknown[]) => void
}

/** Contract exposed by an extra section inserted in the dialog. */
export interface IExtraSectionExpose<T = unknown> {
  reset(): void
  getResults(): T
  hasChanges(): boolean
  validate?(): boolean
}

/** Options of `createPachiDialog`: the `PachiDialog` props plus the content. */
export type ICreatePachiDialogOptions = IPachiDialogProps
