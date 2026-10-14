import { mdiShieldAccountOutline } from '@quasar/extras/mdi-v7'
import { afterEach, describe, expect, it, vi } from 'vitest'
import getMenuItemDefault, { getMenuItem } from '../src/menu'
import { resetAdminModels, setAdminModels, visibleModels } from '../src/helpers/models-state'
import { resetPachiAdminOptions, setPachiAdminOptions } from '../src/helpers/options'
import routes from '../src/routes'

// il package i18n importa quasar (richiede `window`): nei test non serve
vi.mock('@ilpachi/pachi-i18n', () => ({ getPachiI18n: () => undefined, collectLocales: () => ({}), pachiT: (k: string) => k }))

const perms = { view: true, add: false, change: false, delete: false }

afterEach(() => {
  resetAdminModels()
  resetPachiAdminOptions()
})

describe('menu: voce Admin', () => {
  it('voce con testi, icona, route e ordine', () => {
    const item = getMenuItem({ t: (k) => `tr:${k}` })
    expect(item).toMatchObject({ label: 'tr:pachiAdmin.menuLabel', icon: mdiShieldAccountOutline, to: '/admin', order: 30 })
    expect(getMenuItemDefault).toBe(getMenuItem)
  })

  it('è visibile solo con almeno un modello visibile', () => {
    const item = getMenuItem({ t: (k) => k })
    setAdminModels([])
    expect(item.visible()).toBe(false)
    setAdminModels([{ app: 'a', model: 'm', title: 'M', permissions: perms }])
    expect(item.visible()).toBe(true)
  })

  it('senza client HTTP la prima lettura è silenziosa e resta nascosta', () => {
    expect(getMenuItem({ t: (k) => k }).visible()).toBe(false)
  })

  it('i modelli senza view o nascosti non contano', () => {
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
  it('espone /admin e /admin/:app/:model con props di route', () => {
    expect(routes.map((r) => r.path)).toEqual(['/admin', '/admin/:app/:model'])
    expect(routes.every((r) => r.props === true && r.meta?.hidden === true)).toBe(true)
  })
})
