import type { QBtnProps, QEditorCommand, QEditorProps } from 'quasar'
import type { Component, Ref, VNodeChild } from 'vue'

/** Pulsante di azione configurabile del dialog (estende le props di `QBtn`). */
export interface IPachiDialogButton extends QBtnProps {
  label: string
  action?: (_payload?: unknown) => void
  primary?: boolean
  disabled?: boolean
  color?: string
  icon?: string
  emit?: string
}

/** Messaggio strutturato che un'azione può restituire al dialog. */
export interface IPachiDialogMessage {
  kind: 'dialog-message'
  type?: 'positive' | 'negative' | 'warning' | 'info'
  message: string
  success?: boolean
  payload?: boolean | Record<string, unknown>
}

/** Contenuto del dialog passato come prop: componente Vue o render function (funzione che restituisce VNode). */
export type PachiDialogContent = Component | (() => VNodeChild)

/** Props di `PachiDialog`. */
export interface IPachiDialogProps {
  icon?: string | null
  title: string
  /** Classi della toolbar del titolo (default `bg-primary text-white`). */
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
  /** Disabilita (non nasconde) il pulsante di conferma. */
  confirmDisabled?: boolean
  /** Disabilita (non nasconde) il pulsante di chiusura. */
  cancelDisabled?: boolean
  cardClass?: string | null
  /** Mostra l'etichetta di testo accanto all'icona dei pulsanti d'azione (default `false`: solo icona con tooltip). */
  showActionLabels?: boolean
  /** Usa le azioni "ripristina/salva/chiudi" al posto di conferma/chiudi. */
  useEditActions?: boolean
  hasChanges?: boolean
  /** Con `useEditActions` e `hasChanges` chiede conferma prima di chiudere (default true). */
  avoidHideWithChanges?: boolean
  /**
   * Contenuto del dialog come componente o render function, alternativa allo slot di default
   * (con `Dialog.create({ component: PachiDialog })` non si possono passare slot). Lo slot ha la precedenza.
   * Equivale a {@link PachiDialogContent} (scritto cosi' perche' il compilatore Vue ricavi i tipi runtime Object|Function).
   */
  content?: object | (() => VNodeChild)
  /** Props passate a `content` (se e' un componente). */
  contentProps?: Record<string, unknown>
}

/** Opzioni dell'editor (`useEditorOptions`). */
export interface IEditorOptions {
  editorHeight?: string
  displayClass?: string
  disableTypes?: boolean
  editorButtons?: Record<string, IEditorButtons>
  qEditorProps?: Partial<QEditorProps>
}

/** Definizione di un pulsante custom di `QEditor` con handler che ricevono il testo. */
export interface IEditorButtons extends Omit<QEditorCommand, 'handler' | 'toggled'> {
  toggled?: (text: string|Ref<string>, ...args: unknown[]) => boolean
  handler?: (text: string|Ref<string>, ...args: unknown[]) => void
}

/** Contratto esposto da una sezione extra inserita nel dialog. */
export interface IExtraSectionExpose<T = unknown> {
  reset(): void
  getResults(): T
  hasChanges(): boolean
  validate?(): boolean
}

/** Opzioni di `createPachiDialog`: le props di `PachiDialog` piu' il contenuto. */
export type ICreatePachiDialogOptions = IPachiDialogProps
