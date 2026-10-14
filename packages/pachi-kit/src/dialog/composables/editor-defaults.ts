import type { Ref} from 'vue'
import { computed } from 'vue'
import type {QEditorCommand, QVueGlobals} from 'quasar'
import type { IEditorButtons, IEditorOptions } from '../types/PachiDialog'
/**
 * Opzioni di default dell'editor: oggetto congelato (da spalmare e personalizzare, es.
 * `{ ...defaultEditorOptions, editorHeight: '10em' }`); non va mutato perche' e' condiviso.
 */
export const defaultEditorOptions: Readonly<IEditorOptions> = Object.freeze({
  editorHeight: '6em',
  displayClass: 'pachi-nme-display',
  disableTypes: false,
  editorButtons: Object.freeze({}) as Record<string, IEditorButtons>,
})


/** Comandi della toolbar che QEditor tratta come slot: senza una definizione restano segnaposto vuoti. */
const SLOT_COMMANDS = ['token', 'custom_btn'] as const

/**
 * Toolbar di default del `QEditor`. `token` e `custom_btn` (comandi-slot di QEditor) sono inclusi
 * solo se presenti in `editorButtons`, altrimenti sarebbero segnaposto vuoti.
 *
 * @param $q - istanza Quasar (lingua e set di icone)
 * @param editorButtons - pulsanti custom: se contengono `token`/`custom_btn` questi occupano la loro posizione
 * @returns righe della toolbar
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
  // un solo computed: non muta mai `editorOptions` (i pulsanti sono clonati con handler legati a `text`)
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
      // token/custom_btn sono gia' nella toolbar di default (posizione dedicata)
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
