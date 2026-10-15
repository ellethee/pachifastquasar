import { mdiShieldAccountOutline } from '@quasar/extras/mdi-v7'
import { afterEach, describe, expect, it, vi } from 'vitest'
import getMenuItemDefault, { getMenuItem } from '../src/menu'
import { resetAdminModels, setAdminModels, visibleModels } from '../src/helpers/models-state'
import { resetPachiAdminOptions, setPachiAdminOptions } from '../src/helpers/options'
import routes from '../src/routes'

// the i18n package imports quasar (requires `window`): not needed in tests
vi.mock('@ilpachi/pachi-i18n', () => ({ getPachiI18n: () => undefined, collectLocales: () => ({}), pachiT: (k: string) => k }))

const perms = { view: true, add: false, change: false, delete: false }

afterEach(() => {
  resetAdminModels()
  resetPachiAdminOptions()
})

describe('menu: Admin entry', () => {
  it('entry with texts, icon, route and order', () => {
    const item = getMenuItem({ t: (k) => `tr:${k}` })
    expect(item).toMatchObject({ label: 'tr:pachiAdmin.menuLabel', icon: mdiShieldAccountOutline, to: '/admin', order: 30 })
    expect(getMenuItemDefault).toBe(getMenuItem)
  })

  it('is visible only with at least one visible model', () => {
    const item = getMenuItem({ t: (k) => k })
    setAdminModels([])
    expect(item.visible()).toBe(false)
    setAdminModels([{ app: 'a', model: 'm', title: 'M', permissions: perms }])
    expect(item.visible()).toBe(true)
  })

  it('without an HTTP client the first read is silent and stays hidden', () => {
    expect(getMenuItem({ t: (k) => k }).visible()).toBe(false)
  })

  it('models without view or hidden do not count', () => {
    setPachiAdminOptions({ hideModels: ['a.hidden'] })
    const list = [
      { app: 'a', model: 'm', title: 'M', permissions: perms },
      { app: 'a', model: 'hidden', title: 'H', permissions: perms },
      { app: 'a', model: 'noview', title: 'N', permissions: { ...perms, view: false } },
    ]
    expect(visibleModels(list).map((m) => m.model)).toEqual(['m'])
  })
})

describe('routes', () => {
  it('exposes /admin and /admin/:app/:model with route props', () => {
    expect(routes.map((r) => r.path)).toEqual(['/admin', '/admin/:app/:model'])
    expect(routes.every((r) => r.props === true && r.meta?.hidden === true)).toBe(true)
  })
})
