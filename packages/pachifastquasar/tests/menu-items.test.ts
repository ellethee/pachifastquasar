import { beforeEach, describe, expect, it } from 'vitest'
import { buildMenuItems } from 'src/core/menu/menu-items'
import { registerPachiMenus } from 'src/core/menu/menu-registry'
import { resolvePachiConfig } from 'src/core/config'
import type { PachiConfigInput } from 'src/core/config'
import type { PachiMenuItemContext } from 'src/core/components/AccountMenuButton/types/menu-item-factory'

const ctx = (config: PachiConfigInput = {}): PachiMenuItemContext => ({
  t: key => key,
  router: {} as never,
  config: resolvePachiConfig(config),
  user: null
})
const tos = (items: { to?: string | undefined }[]) => items.map(i => i.to)

describe('buildMenuItems', () => {
  beforeEach(() => registerPachiMenus([]))

  it('senza package: solo home', () => {
    expect(tos(buildMenuItems(ctx()))).toEqual(['/'])
  })
  it('voci di profilo e impostazioni dei package: una sola per ciascuna, senza doppioni', () => {
    registerPachiMenus([
      () => ({ label: 'Profilo', to: '/user/profile', order: 10 }),
      () => ({ label: 'Impostazioni', to: '/user/settings', order: 20 })
    ])
    expect(tos(buildMenuItems(ctx()))).toEqual(['/user/profile', '/user/settings', '/'])
  })
  it('una factory che fornisce / sostituisce la home predefinita', () => {
    registerPachiMenus([() => ({ label: 'H', to: '/', order: 5 })])
    const items = buildMenuItems(ctx())
    expect(items.filter(i => i.to === '/')).toHaveLength(1)
    expect(items[0]?.label).toBe('H')
  })
  it('accetta array, null e ignora le factory che lanciano', () => {
    registerPachiMenus([
      () => [{ label: 'a', to: '/a' }, { label: 'b', to: '/b' }],
      () => null,
      () => {
        throw new Error('boom')
      }
    ])
    expect(tos(buildMenuItems(ctx()))).toEqual(['/a', '/b', '/'])
  })
  it('menuItems array = aggiunte; funzione = trasformazione', () => {
    expect(tos(buildMenuItems(ctx({ menuItems: [{ label: 'x', to: '/x', order: 99 }] }))).at(-1)).toBe(
      '/x'
    )
    const items = buildMenuItems(ctx({ menuItems: list => list.filter(i => i.to === '/') }))
    expect(tos(items)).toEqual(['/'])
  })
  it('extraButtons dell\'auth restano supportati', () => {
    const cfg = { auth: { menu: { extraButtons: [{ label: 'e', to: '/e' }] } } }
    expect(tos(buildMenuItems(ctx(cfg)))).toContain('/e')
  })
})
