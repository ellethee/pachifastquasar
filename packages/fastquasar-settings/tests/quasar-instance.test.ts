import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createSSRApp, defineComponent, h } from 'vue'
import { renderToString } from 'vue/server-renderer'

const pluginNotify = vi.hoisted(() => vi.fn())
const pluginDark = vi.hoisted(() => ({ isActive: true, set: vi.fn(), toggle: vi.fn() }))
vi.mock('quasar', () => ({ Notify: { create: pluginNotify }, Dark: pluginDark }))

import { isDarkActive, quasarDeps, resetQuasarCache, resolveQuasar, showNotify } from '../src/helpers/quasar-instance'

/** Runs `fn` in the `setup()` of an app with the given `$q`. */
async function inSetup($q: unknown, fn: () => void): Promise<void> {
  const app = createSSRApp(defineComponent({ setup() { fn(); return () => h('div') } }))
  app.config.globalProperties.$q = $q
  await renderToString(app)
}

describe('quasar-instance', () => {
  beforeEach(() => {
    resetQuasarCache()
    vi.clearAllMocks()
  })

  it('outside a component and without cache returns null', () => {
    expect(resolveQuasar()).toBeNull()
  })

  it('in setup returns $q and remembers it for subsequent calls', async () => {
    const $q = { notify: vi.fn(), dark: { isActive: false, set: vi.fn(), toggle: vi.fn() } }
    await inSetup($q, () => { expect(resolveQuasar()).toBe($q) })
    expect(resolveQuasar()).toBe($q)
    showNotify({ message: 'm' })
    expect($q.notify).toHaveBeenCalledWith({ message: 'm' })
    expect(pluginNotify).not.toHaveBeenCalled()
    expect(isDarkActive()).toBe(false)
  })

  it('without $q falls back to the imported plugins', () => {
    showNotify({ message: 'm' })
    expect(pluginNotify).toHaveBeenCalledTimes(1)
    expect(isDarkActive()).toBe(true)
  })

  it('quasarDeps resolves Dark and Notify on every call', async () => {
    const deps = quasarDeps()
    deps.Dark?.toggle()
    expect(pluginDark.toggle).toHaveBeenCalledTimes(1)
    const $q = { notify: vi.fn(), dark: { isActive: false, set: vi.fn(), toggle: vi.fn() } }
    await inSetup($q, () => { resolveQuasar() })
    deps.Dark?.set(true)
    deps.Notify?.create({ message: 'x' })
    expect($q.dark.set).toHaveBeenCalledWith(true)
    expect($q.notify).toHaveBeenCalledWith({ message: 'x' })
  })
})
