import { mdiCog } from '@quasar/extras/mdi-v7'
import { describe, expect, it, vi } from 'vitest'
import getMenuItemDefault, { getMenuItem } from '../src/menu'

// il package i18n importa quasar (richiede `window`): nei test non serve
vi.mock('@ilpachi/pachi-i18n', () => ({ getPachiI18n: () => undefined, collectLocales: () => ({}) }))

describe('menu: voce Impostazioni', () => {
  it('restituisce la voce con testi tradotti, icona, route e ordine', () => {
    const t = vi.fn((key: string) => `tr:${key}`)
    const item = getMenuItem({ t })
    expect(item).toEqual({
      label: 'tr:pachiSettings.menuLabel',
      caption: 'tr:pachiSettings.menuCaption',
      icon: mdiCog,
      to: '/user/settings',
      order: 20,
      visible: true,
    })
    expect(t).toHaveBeenCalledWith('pachiSettings.menuLabel')
    expect(t).toHaveBeenCalledWith('pachiSettings.menuCaption')
  })

  it('rispetta config.auth.menu.showSettings', () => {
    const t = (key: string): string => key
    expect(getMenuItem({ t, config: { auth: { menu: { showSettings: false } } } }).visible).toBe(false)
    expect(getMenuItem({ t, config: { auth: { menu: { showSettings: true } } } }).visible).toBe(true)
  })

  it('è anche il default export del modulo', () => {
    expect(getMenuItemDefault).toBe(getMenuItem)
  })
})
