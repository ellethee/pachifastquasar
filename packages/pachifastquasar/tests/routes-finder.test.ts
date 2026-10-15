import { describe, expect, it } from 'vitest'
import { RouterView } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import {
  collectFeatureRoutes,
  collectPackageRoutes,
  ensureNavigableRoutes,
  enabledPackageEntries,
  extractPackageName,
  getFilteredRoutes,
  isPackageRouteDisabled
} from 'src/router/routes-finder'
import { collectPackageMenus } from 'src/core/menu/collect-menus'
import { buildPachiRoutes } from 'src/router/routes'
import { resolvePachiConfig } from 'src/core/config'

const route = (path: string, order?: number, root?: boolean): RouteRecordRaw =>
  ({ path, meta: { order, root }, component: {} }) as RouteRecordRaw

describe('routes-finder', () => {
  it('sorts by meta.order (default 99) without mutating', () => {
    const input = [route('/c'), route('/a', 1), route('/b', 5)]
    expect(getFilteredRoutes(input).map(r => r.path)).toEqual(['/a', '/b', '/c'])
    expect(input[0]?.path).toBe('/c')
  })
  it('extracts the package name', () => {
    expect(extractPackageName('/node_modules/@ilpachi/fastquasar-settings/dist/routes.js')).toBe(
      'fastquasar-settings'
    )
    expect(extractPackageName('/src/features/x/routes.ts')).toBeUndefined()
  })
  it('rispetta ilpachi-<pkg>-disable-route', () => {
    expect(isPackageRouteDisabled('p', { 'ilpachi-p-disable-route': 'true' })).toBe(true)
    expect(isPackageRouteDisabled('p', { 'ilpachi-p-disable-route': '0' })).toBe(false)
    const glob = {
      '/node_modules/@ilpachi/a/routes.ts': [route('/a')],
      '/node_modules/@ilpachi/b/dist/routes.js': { default: route('/b') }
    }
    expect(collectPackageRoutes(glob, { 'ilpachi-a-disable-route': 'yes' }).map(r => r.path)).toEqual(
      ['/b']
    )
  })
  it('packages before features', () => {
    const routes = collectFeatureRoutes({
      packages: { '/node_modules/@ilpachi/a/routes.ts': route('/pkg') },
      features: { '/src/features/f/routes.ts': [route('/feat')] }
    })
    expect(routes.map(r => r.path)).toEqual(['/pkg', '/feat'])
  })
  it('collects menu factories and discards non-functions', () => {
    const f = () => null
    const glob = {
      '/node_modules/@ilpachi/a/menu.ts': f,
      '/node_modules/@ilpachi/b/menu.ts': { x: 1 },
      '/node_modules/@ilpachi/c/dist/menu.js': f
    }
    expect(collectPackageMenus(glob, { 'ilpachi-c-disable-route': 'true' })).toEqual([f])
  })
})

describe('buildPachiRoutes', () => {
  it('compone layout, auth, root, figli e catch-all', () => {
    const config = resolvePachiConfig({ app: { title: 'T' } })
    const routes = buildPachiRoutes(config, {
      features: {
        '/src/features/a/routes.ts': [route('/x', 2), route('/r', 1, true)]
      }
    })
    expect(routes[0]?.path).toBe('/')
    // the home has no title: the app name is already in the AppBar and must not appear in the crumb
    expect(routes[0]?.meta?.title).toBeUndefined()
    expect(routes[0]?.meta?.hideTitle).toBe(true)
    expect(routes[0]?.children?.map(r => r.path)).toEqual(['/x'])
    expect(routes.map(r => r.path)).toEqual(['/', '/auth/login', '/r', '/:catchAll(.*)*'])
  })
  it('without auth it does not mount the login and uses the replaced components', () => {
    const layout = { name: 'L' }
    const config = resolvePachiConfig({
      auth: { enabled: false },
      components: { layout } as never
    })
    const routes = buildPachiRoutes(config)
    expect(routes.map(r => r.path)).toEqual(['/', '/:catchAll(.*)*'])
    expect(routes[0]?.component).toBe(layout)
  })
  it('a package with src and dist (linked) counts once, preferring dist', () => {
    const entries = enabledPackageEntries(
      {
        '/node_modules/@ilpachi/a/src/menu.ts': { default: 'src' },
        '/node_modules/@ilpachi/a/dist/menu.js': { default: 'dist' },
        '/node_modules/@ilpachi/b/menu.js': { default: 'b' }
      },
      {}
    )
    expect(entries).toEqual([['a', 'dist'], ['b', 'b']])
  })
})

describe('ensureNavigableRoutes', () => {
  const page = { render: () => null }
  it('adds a RouterView to a parent with children and no component', () => {
    const input = [{ path: '/inv', children: [{ path: 'a', component: page }] }] as RouteRecordRaw[]
    const [out] = ensureNavigableRoutes(input)
    expect((out as { component?: unknown }).component).toBe(RouterView)
    expect((input[0] as { component?: unknown }).component).toBeUndefined()
  })
  it('does not touch component, redirect and routes without children', () => {
    const input = [
      { path: '/a', component: page, children: [{ path: 'x', component: page }] },
      { path: '/b', redirect: '/a', children: [{ path: 'x', component: page }] },
      { path: '/c', component: page }
    ] as RouteRecordRaw[]
    const out = ensureNavigableRoutes(input) as { component?: unknown }[]
    expect(out[0]?.component).toBe(page)
    expect(out[1]?.component).toBeUndefined()
    expect(out[2]?.component).toBe(page)
  })
  it('the parent without component resolves (does not fall into the catch-all)', async () => {
    const { createRouter, createMemoryHistory } = await import('vue-router')
    const routes = ensureNavigableRoutes([
      { path: '/inv', children: [{ path: 'a', component: page }] }
    ] as RouteRecordRaw[])
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [...routes, { path: '/:catchAll(.*)*', component: page }]
    })
    expect(router.resolve('/inv').matched.map(r => r.path)).toEqual(['/inv'])
  })
})
