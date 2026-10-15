import { describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import type { QVueGlobals } from 'quasar'
import { useEditorOptions } from '../../src/dialog/composables/editor-defaults'
import type { IEditorOptions } from '../../src/dialog/types/PachiDialog'

const $q = {
  lang: { editor: new Proxy({}, { get: (_t, k) => String(k) }) },
  iconSet: { editor: new Proxy({}, { get: (_t, k) => String(k) }) },
} as unknown as QVueGlobals

describe('useEditorOptions', () => {
  it('does not mutate editorOptions and does not nest wrappers on every recomputation', () => {
    const handler = vi.fn()
    const options: IEditorOptions = { editorButtons: { mine: { icon: 'x', handler } } }
    const text = ref('ciao')
    const { toolbar, definitions } = useEditorOptions($q, text, options)

    expect(options.editorButtons?.mine?.handler).toBe(handler)
    // read several times: the result is stable
    expect(toolbar.value.at(-1)).toEqual(['mine'])
    expect(toolbar.value.at(-1)).toEqual(['mine'])
    expect(options.editorButtons?.mine?.handler).toBe(handler)

    const def = definitions.value.mine as { handler: () => void }
    def.handler()
    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledWith(text)
  })

  it('without custom buttons it adds no rows to the toolbar', () => {
    const base = useEditorOptions($q, ref(''), {}).toolbar.value.length
    const withBtn = useEditorOptions($q, ref(''), { editorButtons: { a: { icon: 'x' } } }).toolbar.value.length
    expect(withBtn).toBe(base + 1)
  })
})

describe('useEditorOptions: slot commands', () => {
  const flat = (rows: unknown[]) => rows.flat().filter(x => typeof x === 'string')

  it('without definitions it does not include token/custom_btn (empty placeholders)', () => {
    const { toolbar } = useEditorOptions($q, ref(''), {})
    expect(flat(toolbar.value)).not.toContain('token')
    expect(flat(toolbar.value)).not.toContain('custom_btn')
  })

  it('with definitions it includes them once in the dedicated position', () => {
    const { toolbar, definitions } = useEditorOptions($q, ref(''), {
      editorButtons: { token: { icon: 'x' }, custom_btn: { icon: 'y' }, mine: { icon: 'z' } },
    })
    const all = flat(toolbar.value)
    expect(all.filter(x => x === 'token')).toHaveLength(1)
    expect(all.filter(x => x === 'custom_btn')).toHaveLength(1)
    expect(toolbar.value.at(-1)).toEqual(['mine'])
    expect(Object.keys(definitions.value).sort()).toEqual(['custom_btn', 'mine', 'token'])
  })
})

describe('editor-defaults null safety', () => {
  it('defaultEditorOptions is frozen and useEditorOptions tolerates missing qEditorProps', async () => {
    const { defaultEditorOptions } = await import('../../src/dialog/composables/editor-defaults')
    expect(Object.isFrozen(defaultEditorOptions)).toBe(true)
    const { editorProps } = useEditorOptions($q, ref(''), { ...defaultEditorOptions })
    expect(editorProps).toEqual({})
  })
})
