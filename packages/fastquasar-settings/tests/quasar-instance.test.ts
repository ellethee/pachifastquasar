import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createSSRApp, defineComponent, h } from 'vue'
import { renderToString } from 'vue/server-renderer'

const pluginNotify = vi.hoisted(() => vi.fn())
const pluginDark = vi.hoisted(() => ({ isActive: true, set: vi.fn(), toggle: vi.fn() }))
vi.mock('quasar', () => ({ Notify: { create: pluginNotify }, Dark: pluginDark }))

import { isDarkActive, quasarDeps, resetQuasarCache, resolveQuasar, showNotify } from '../src/helpers/quasar-instance'

/** Esegue `fn` in `setup()` di un'app con il `$q` dato. */
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

  it('fuori da un componente e senza cache restituisce null', () => {
    expect(resolveQuasar()).toBeNull()
  })

  it('in setup restituisce $q e lo ricorda per le chiamate successive', async () => {
    const $q = { notify: vi.fn(), dark: { isActive: false, set: vi.fn(), toggle: vi.fn() } }
    await inSetup($q, () => { expect(resolveQuasar()).toBe($q) })
    expect(resolveQuasar()).toBe($q)
    showNotify({ message: 'm' })
    expect($q.notify).toHaveBeenCalledWith({ message: 'm' })
    expect(pluginNotify).not.toHaveBeenCalled()
    expect(isDarkActive()).toBe(false)
  })

  it('senza $q ripiega sui plugin importati', () => {
    showNotify({ message: 'm' })
    expect(pluginNotify).toHaveBeenCalledTimes(1)
    expect(isDarkActive()).toBe(true)
  })

  it('quasarDeps risolve Dark e Notify a ogni chiamata', async () => {
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
