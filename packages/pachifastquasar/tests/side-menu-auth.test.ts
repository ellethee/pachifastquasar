// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest'
import { h } from 'vue'
import { mount } from '@vue/test-utils'
import { Quasar, QLayout } from 'quasar'
import { createI18n } from 'vue-i18n'
import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'

/** Fake AuthManager: only `admin` routes are forbidden (no real login involved). */
const auth = vi.hoisted(() => ({ canAccess: vi.fn((meta: { role?: string }) => meta.role !== 'admin') }))
vi.mock('src/services/auth-manager/auth-manager', () => ({ AuthManager: { getInstance: () => auth } }))
vi.mock('src/core/config', () => ({ getPachiConfig: () => ({ auth: { enabled: true } }) }))

// happy-dom does not implement screen.orientation, required by Quasar's Screen/Platform plugin
if (!window.screen.orientation) {
  Object.defineProperty(window.screen, 'orientation', {
    value: { type: 'portrait-primary', addEventListener() {}, removeEventListener() {} },
    configurable: true,
  })
}

const { default: PachiSideMenu } = await import('src/core/components/PachiSideMenu.vue')

const Empty = { render: () => null }

describe('PachiSideMenu with auth enabled', () => {
  it('renders only the routes accessible to the user (canAccess), also inside groups', () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        {
          path: '/',
          component: Empty,
          children: [
            { path: 'home', component: Empty, meta: { title: 'Public page' } },
            { path: 'secret', component: Empty, meta: { title: 'Admin page', role: 'admin' } },
            {
              path: 'group',
              component: Empty,
              meta: { title: 'Group' },
              children: [
                { path: 'ok', component: Empty, meta: { title: 'Child ok' } },
                { path: 'no', component: Empty, meta: { title: 'Child forbidden', role: 'admin' } },
              ],
            },
          ],
        },
      ],
    })
    const i18n = createI18n({ legacy: false, locale: 'it', missingWarn: false, fallbackWarn: false, messages: { it: {} } })
    const wrapper = mount(
      { render: () => h(QLayout, null, { default: () => h(PachiSideMenu) }) },
      { attachTo: document.body, global: { plugins: [Quasar, i18n, router, createPinia()] } },
    )
    const html = document.body.innerHTML
    expect(html).toContain('Public page')
    expect(html).toContain('Group')
    expect(html).not.toContain('Admin page')
    expect(html).toContain('Child ok')
    expect(html).not.toContain('Child forbidden')
    expect(auth.canAccess).toHaveBeenCalled()
    wrapper.unmount()
  })
})
