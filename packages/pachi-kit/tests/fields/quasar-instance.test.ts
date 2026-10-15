import { describe, expect, it, vi } from 'vitest'
import { createSSRApp, defineComponent, h } from 'vue'
import { renderToString } from 'vue/server-renderer'

const pluginNotify = vi.hoisted(() => vi.fn())
vi.mock('quasar', () => ({ Notify: { create: pluginNotify } }))

import { resolveQuasar, showNotify } from '../../src/fields/helpers/quasar-instance'

describe('resolveQuasar', () => {
  it('outside a component it returns null', () => {
    expect(resolveQuasar()).toBeNull()
  })

  it('in setup it returns the app\'s $q', async () => {
    const $q = { notify: vi.fn() }
    let found: unknown
    const app = createSSRApp(defineComponent({ setup() { found = resolveQuasar(); return () => h('div') } }))
    app.config.globalProperties.$q = $q
    await renderToString(app)
    expect(found).toBe($q)
  })
})

describe('showNotify', () => {
  it('uses $q.notify when available', () => {
    const $q = { notify: vi.fn() } as never
    showNotify($q, { message: 'm' })
    expect(($q as { notify: ReturnType<typeof vi.fn> }).notify).toHaveBeenCalledWith({ message: 'm' })
    expect(pluginNotify).not.toHaveBeenCalled()
  })

  it('falls back to the imported plugin without $q', () => {
    showNotify(null, { message: 'm' })
    expect(pluginNotify).toHaveBeenCalledTimes(1)
  })
})
