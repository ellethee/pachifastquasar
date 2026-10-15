import { describe, expect, it, vi } from 'vitest'
import { createSSRApp, defineComponent, h } from 'vue'
import { renderToString } from 'vue/server-renderer'

const pluginDialog = vi.hoisted(() => vi.fn())
const pluginNotify = vi.hoisted(() => vi.fn())
vi.mock('quasar', () => ({ Dialog: { create: pluginDialog }, Notify: { create: pluginNotify } }))

import { openDialog, resolveQuasar, showNotify } from '../../src/table/helpers/quasar-instance'

describe('resolveQuasar', () => {
  it('outside a component it returns null', () => {
    expect(resolveQuasar()).toBeNull()
  })

  it('in setup it returns the app\'s $q', async () => {
    const $q = { dialog: vi.fn(), notify: vi.fn() }
    let found: unknown
    const app = createSSRApp(defineComponent({ setup() { found = resolveQuasar(); return () => h('div') } }))
    app.config.globalProperties.$q = $q
    await renderToString(app)
    expect(found).toBe($q)
  })
})

describe('openDialog / showNotify', () => {
  it('use $q when available', () => {
    const $q = { dialog: vi.fn(() => 'd'), notify: vi.fn() } as never
    expect(openDialog($q, { title: 'x' })).toBe('d')
    showNotify($q, { message: 'm' })
    expect(pluginDialog).not.toHaveBeenCalled()
    expect(pluginNotify).not.toHaveBeenCalled()
  })

  it('fall back to the imported plugins without $q', () => {
    openDialog(null, { title: 'x' })
    showNotify(null, { message: 'm' })
    expect(pluginDialog).toHaveBeenCalledTimes(1)
    expect(pluginNotify).toHaveBeenCalledTimes(1)
  })
})
