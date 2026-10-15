import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useRouteMeta } from '../../router/use-route-meta'
import { useRouteText } from '../../router/route-text'
import { colors } from 'quasar'

const { getPaletteColor } = colors

type Crumb = { label: string; to: string; icon: string | undefined }

/**
 * Converts an icon (Quasar format) into a CSS url(...) value usable
 * as background-image.
 *
 * Supported formats:
 *   - 'img:URL'   → url('URL')                   (Vite import / image path)
 *   - 'M...'      → inline SVG data URI           (MDI path from @quasar/extras)
 */
function iconToCssUrl(icon: string, fill = '#000000'): string | undefined {
  if (icon.startsWith('img:')) {
    return `url('${icon.slice(4)}')`
  }
  // SVG path data: MDI paths always start with 'M' o 'm'
  if (/^[Mm]/.test(icon)) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="${fill}" d="${icon}"/></svg>`
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
  }
  return undefined
}

export function useAppBar() {
  const route = useRoute()
  const router = useRouter()
  const routeMeta = useRouteMeta()
  const { routeTitle, routeDescription, hasTitle } = useRouteText()

  const title = computed(() => routeTitle(routeMeta.value))
  const description = computed(() => routeDescription(routeMeta.value))
  const icon = computed(() => routeMeta.value.icon)

  const isHome = computed(() => route.path === '/')
  const hideTitle = computed(() => route.meta?.hideTitle === true)

  const crumbs = computed<Crumb[]>(() => {
    const list = route.matched
      .filter(r => hasTitle(r.meta))
      .map(r => ({
        label: routeTitle(r.meta),
        icon: r.meta?.icon,
        to: r.path
      }))

    // if the last segment has an empty path (index route ''), use the current path
    const last = list[list.length - 1]
    if (last && last.to === '') {
      last.to = route.path
      last.icon = icon.value
    }
    return list
  })

  const parentTo = computed(() => {
    const matched = route.matched
    for (let i = matched.length - 2; i >= 0; i--) {
      const record = matched[i]
      if (record && (record.children?.length ?? 0) > 0) return record.path
    }
    return '/'
  })

  const hasParent = computed(() => !isHome.value && !!parentTo.value)

  const parentLabel = computed(() => {
    const withTitle = route.matched.filter(r => hasTitle(r.meta))
    const parent = withTitle[withTitle.length - 2]
    return parent ? routeTitle(parent.meta) : ''
  })

  function goHome() {
    void router.push('/')
  }

  function goParent() {
    if (parentTo.value) void router.push(parentTo.value)
  }

  /**
   * Walks route.matched from the child to the parent and returns the first
   * node with meta.useMyIcon = true.
   * Does not use the merged meta: each level is evaluated individually.
   */
  function findMyIconRoute() {
    const matched = [...route.matched].reverse()
    for (const r of matched) {
      if (r.meta?.useMyIcon) return r
    }
    return undefined
  }
  function getIconColor(color?: string): string {
    if (!color) return getPaletteColor('primary')
    if (color.startsWith('#')) return color
    if (color === 'auto') {
      // If the color is 'auto', returns the app bar text color
      return (
        getComputedStyle(document.documentElement).getPropertyValue('--pachi-body-color') ||
        '#000000'
      )
    }
    if (color.startsWith('var(--')) {
      // Extracts the CSS variable name from 'var(--name)' and returns its value
      const varName = color.slice(4, -1).trim()
      return getComputedStyle(document.documentElement).getPropertyValue(varName) || '#000000'
    }
    return getPaletteColor(color) || '#000000'
  }
  /** CSS url(...) to use as the layout background-image. */
  const layoutBgImage = computed<string | undefined>(() => {
    const r = findMyIconRoute()
    const ic = r?.meta?.icon
    const fill = getIconColor(r?.meta?.iconColor)
    return ic ? iconToCssUrl(ic, fill) : undefined
  })

  /**
   * Additional inline style for the .pachi-layout-bg div.
   * Allows customizing opacity, background-size, etc. per route.
   * Example in meta: bgStyle: { opacity: '0.12', backgroundSize: 'cover' }
   */
  const layoutBgStyle = computed<Record<string, string>>(() => {
    const r = findMyIconRoute()
    return (r?.meta?.bgStyle as Record<string, string>) ?? {}
  })
  const routeIcon = computed(() => routeMeta.value.icon)
  const routeIconOrParent = computed(() => {
    if (routeIcon.value) return routeIcon.value
    const parentRoute = findMyIconRoute()
    return parentRoute?.meta?.icon
  })

  const appBarComponents = computed<unknown[]>(
    () => (routeMeta.value.appBarComponents as unknown[]) ?? []
  )

  return {
    routeMeta,
    title,
    description,
    icon,
    isHome,
    crumbs,
    parentTo,
    hasParent,
    parentLabel,
    hideTitle,
    goHome,
    goParent,
    layoutBgImage,
    layoutBgStyle,
    routeIcon,
    routeIconOrParent,
    appBarComponents
  }
}
