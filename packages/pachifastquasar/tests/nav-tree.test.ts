import { describe, expect, it } from 'vitest'
import type { RouteRecordRaw } from 'vue-router'
import { buildNavTree, isNavItemActive } from 'src/core/menu/nav-tree'

const title = (meta: { title?: string }) => meta.title ?? ''
const page = { template: '<i />' }

const routes: RouteRecordRaw[] = [
  { path: '', component: page },
  { path: 'a', component: page, meta: { title: 'A', icon: 'M0' } },
  {
    path: 'group',
    component: page,
    meta: { title: 'Group' },
    children: [
      { path: '', component: page },
      { path: 'one', component: page, meta: { title: 'One' } },
      {
        path: 'deep',
        component: page,
        meta: { title: 'Deep' },
        children: [{ path: 'leaf', component: page, meta: { title: 'Leaf' } }]
      },
      { path: 'secret', component: page, meta: { title: 'Secret', hidden: true } },
      { path: ':id', component: page, meta: { title: 'Detail' } }
    ]
  },
  { path: '/abs', component: page, meta: { title: 'Abs' } },
  { path: '/:catchAll(.*)*', component: page }
]

describe('buildNavTree', () => {
  it('builds nested paths, skipping index, hidden, dynamic and catch-all routes', () => {
    const tree = buildNavTree(routes, { title })
    expect(tree.map(i => i.to)).toEqual(['/a', '/group', '/abs'])
    const group = tree[1]!
    expect(group.children?.map(i => i.to)).toEqual(['/group/one', '/group/deep'])
    expect(group.children?.[1]?.children?.[0]).toMatchObject({ label: 'Leaf', to: '/group/deep/leaf' })
    expect(tree[0]).toMatchObject({ label: 'A', icon: 'M0', children: undefined })
  })
  it('applies the canAccess filter and flattens groups left without children', () => {
    const tree = buildNavTree(routes, {
      title,
      canAccess: meta => meta.title !== 'One' && meta.title !== 'Deep'
    })
    expect(tree[1]).toMatchObject({ label: 'Group', to: '/group', children: undefined })
  })
  it('filters by route permissions with a fake canAccess (auth enabled, user without `logs.view`)', () => {
    const granted = ['users.read']
    const guarded: RouteRecordRaw[] = [
      { path: 'users', component: page, meta: { title: 'Users', permissions: ['users.read'] } },
      { path: 'logs', component: page, meta: { title: 'Logs', permissions: ['logs.view'] } },
      { path: 'open', component: page, meta: { title: 'Open' } }
    ]
    const canAccess = (meta: { permissions?: string[] }) => (meta.permissions ?? []).every(p => granted.includes(p))
    expect(buildNavTree(guarded, { title, canAccess }).map(i => i.label)).toEqual(['Users', 'Open'])
  })
  it('falls back to the path when there is no title', () => {
    expect(buildNavTree([{ path: 'x', component: page }], { title })[0]?.label).toBe('x')
  })
})

describe('isNavItemActive', () => {
  const tree = buildNavTree(routes, { title })
  it('matches the item, its sub-paths and descendants', () => {
    expect(isNavItemActive(tree[0]!, '/a')).toBe(true)
    expect(isNavItemActive(tree[0]!, '/a/x')).toBe(true)
    expect(isNavItemActive(tree[1]!, '/group/deep/leaf')).toBe(true)
    expect(isNavItemActive(tree[2]!, '/group')).toBe(false)
    expect(isNavItemActive(tree[0]!, '/ab')).toBe(false)
  })
})
