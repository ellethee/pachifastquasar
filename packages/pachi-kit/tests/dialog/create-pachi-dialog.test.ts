import { describe, expect, it, vi } from 'vitest'
import { createSSRApp, defineComponent, h } from 'vue'
import { renderToString } from 'vue/server-renderer'

const create = vi.hoisted(() => vi.fn(() => ({ onOk: vi.fn() })))
const Stub = vi.hoisted(() => ({ name: 'PachiDialogStub' }))
vi.mock('quasar', () => ({ Dialog: { create } }))
vi.mock('../../src/dialog/components/PachiDialog.vue', () => ({ default: Stub }))

describe('createPachiDialog', () => {
  it('opens PachiDialog passing props and custom content as componentProps', async () => {
    const { createPachiDialog } = await import('../../src/dialog/composables/create-pachi-dialog')
    const content = () => null
    createPachiDialog({ title: 'T', content, contentProps: { a: 1 }, rounded: true })
    expect(create).toHaveBeenCalledTimes(1)
    const arg = create.mock.calls[0] as unknown as [{ component: unknown, componentProps: Record<string, unknown> }]
    expect(arg[0].component).toBe(Stub)
    expect(arg[0].componentProps).toMatchObject({ title: 'T', content, contentProps: { a: 1 }, rounded: true })
  })

  it('with $q it uses $q.dialog and not the imported plugin', async () => {
    create.mockClear()
    const { createPachiDialog } = await import('../../src/dialog/composables/create-pachi-dialog')
    const dialog = vi.fn(() => ({ onOk: vi.fn() }))
    createPachiDialog({ title: 'T' }, { dialog } as never)
    expect(dialog).toHaveBeenCalledTimes(1)
    expect(create).not.toHaveBeenCalled()
  })
})

describe('usePachiDialog', () => {
  it('in setup it binds to the app\'s $q', async () => {
    create.mockClear()
    const { usePachiDialog } = await import('../../src/dialog/composables/create-pachi-dialog')
    const dialog = vi.fn(() => ({ onOk: vi.fn() }))
    let open: ReturnType<typeof usePachiDialog> | undefined
    const app = createSSRApp(defineComponent({ setup() { open = usePachiDialog(); return () => h('div') } }))
    app.config.globalProperties.$q = { dialog }
    await renderToString(app)
    open?.({ title: 'T' })
    expect(dialog).toHaveBeenCalledTimes(1)
    expect(create).not.toHaveBeenCalled()
  })

  it('outside a component it falls back to the imported plugin', async () => {
    create.mockClear()
    const { usePachiDialog } = await import('../../src/dialog/composables/create-pachi-dialog')
    usePachiDialog()({ title: 'T' })
    expect(create).toHaveBeenCalledTimes(1)
  })
})
