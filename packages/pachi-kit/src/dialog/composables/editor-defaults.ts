import type { Ref} from 'vue'
import { computed } from 'vue'
import type {QEditorCommand, QVueGlobals} from 'quasar'
import type { IEditorButtons, IEditorOptions } from '../types/PachiDialog'
/**
 * Default editor options: frozen object (to be spread and customized, e.g.
 * `{ ...defaultEditorOptions, editorHeight: '10em' }`); it must not be mutated because it is shared.
 */
export const defaultEditorOptions: Readonly<IEditorOptions> = Object.freeze({
  editorHeight: '6em',
  displayClass: 'pachi-nme-display',
  disableTypes: false,
  editorButtons: Object.freeze({}) as Record<string, IEditorButtons>,
})


/** Toolbar commands that QEditor treats as slots: without a definition they remain empty placeholders. */
const SLOT_COMMANDS = ['token', 'custom_btn'] as const

/**
 * Default `QEditor` toolbar. `token` and `custom_btn` (QEditor slot commands) are included
 * only if present in `editorButtons`, otherwise they would be empty placeholders.
 *
 * @param $q - Quasar instance (language and icon set)
 * @param editorButtons - custom buttons: if they contain `token`/`custom_btn` these take their position
 * @returns toolbar rows
 */
const useToolbar = ($q: QVueGlobals, editorButtons: Record<string, unknown> = {}) => {
  const has = (name: typeof SLOT_COMMANDS[number]) => name in editorButtons
  return [
    [
      {
        label: $q.lang.editor.align,
        icon: $q.iconSet.editor.align,
        fixedLabel: true,
        options: ['left', 'center', 'right', 'justify']
      }
    ],
    ['bold', 'italic', 'strike', 'underline', 'subscript', 'superscript'],
    [...(has('token') ? ['token'] : []), 'hr', 'link', ...(has('custom_btn') ? ['custom_btn'] : [])],
    ['print', 'fullscreen'],
    [
      {
        label: $q.lang.editor.formatting,
        icon: $q.iconSet.editor.formatting,
        list: 'no-icons',
        options: ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'code']
      },
      {
        label: $q.lang.editor.fontSize,
        icon: $q.iconSet.editor.fontSize,
        fixedLabel: true,
        fixedIcon: true,
        list: 'no-icons',
        options: ['size-1', 'size-2', 'size-3', 'size-4', 'size-5', 'size-6', 'size-7']
      },
      {
        label: $q.lang.editor.defaultFont,
        icon: $q.iconSet.editor.font,
        fixedIcon: true,
        list: 'no-icons',
        options: [
          'default_font',
          'arial',
          'arial_black',
          'comic_sans',
          'courier_new',
          'impact',
          'lucida_grande',
          'times_new_roman',
          'verdana'
        ]
      },
      'removeFormat'

    ],
    ['quote', 'unordered', 'ordered', 'outdent', 'indent'],
    ['undo', 'redo'],
    ['viewsource']
  ]
}
export { useToolbar }
export function useEditorOptions($q: QVueGlobals, text:Ref<string>, editorOptions: IEditorOptions) {
  // a single computed: never mutates `editorOptions` (buttons are cloned with handlers bound to `text`)
  const built = computed(() => {
    const tbar = useToolbar($q, editorOptions?.editorButtons ?? {})
    const defs: {[commandName: string]: QEditorCommand} = {}
    const buttons: string[] = []
    Object.entries(editorOptions?.editorButtons ?? {}).forEach(([key, value]: [string, IEditorButtons]) => {
      const def: IEditorButtons = { ...value }
      if (value.handler) {
        const handler = value.handler
        def.handler = () => handler(text)
      }
      if (value.toggled) {
        const toggled = value.toggled
        def.toggled = (...args) => toggled(text, ...args)
      }
      defs[key] = def as QEditorCommand
      // token/custom_btn are already in the default toolbar (dedicated position)
      if (!(SLOT_COMMANDS as readonly string[]).includes(key)) buttons.push(key)
    })
    if (buttons.length) tbar.push(buttons)
    return { tbar, defs }
  })
  const toolbar = computed(() => built.value.tbar)
  const definitions = computed(() => built.value.defs)
  const fonts = computed(() => ({
    arial: 'Arial',
    arial_black: 'Arial Black',
    comic_sans: 'Comic Sans MS',
    courier_new: 'Courier New',
    impact: 'Impact',
    lucida_grande: 'Lucida Grande',
    times_new_roman: 'Times New Roman',
    verdana: 'Verdana'
  }))
  return {
    toolbar,
    fonts,
    definitions,
    editorProps: editorOptions?.qEditorProps ?? {}
  }
}
