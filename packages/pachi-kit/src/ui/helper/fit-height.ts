import type { Directive } from 'vue'

/** Options of `v-fit-height` (a plain number is the `offset`). */
export interface IFitHeightOptions {
  /** Fixed space (px) left below the element; default: 8 + height of the following siblings. */
  offset?: number | undefined
  /** Minimum height (px). */
  min?: number | undefined
  /** Debounce (ms) of the recalculation. Default 100. */
  delay?: number | undefined
}

/** CSS height that makes `el` end at the bottom of the window: 100vh - top - space below. */
export function fitHeightValue(el: HTMLElement, offset?: number, min?: number): string {
  let bottom = offset
  if (bottom === undefined) {
    bottom = 8
    for (let sib = el.nextElementSibling; sib; sib = sib.nextElementSibling) {
      bottom += sib.getBoundingClientRect().height
    }
  }
  const px = el.getBoundingClientRect().top + bottom
  return min === undefined ? `calc(100vh - ${px}px)` : `max(${min}px, calc(100vh - ${px}px))`
}

/**
 * Keeps `el` within the window height; recalculates on window resize, on parent resize
 * (ResizeObserver) and on `refresh()`. Returns the cleanup.
 */
export function fitHeight(el: HTMLElement, options: IFitHeightOptions = {}) {
  let timer: ReturnType<typeof setTimeout> | undefined
  function refresh() {
    clearTimeout(timer)
    timer = setTimeout(() => {
      const height = fitHeightValue(el, options.offset, options.min)
      if (el.style.height !== height) el.style.height = height
    }, options.delay ?? 100)
  }
  refresh()
  window.addEventListener('resize', refresh)
  let observer: ResizeObserver | undefined
  if (el.parentElement && typeof ResizeObserver !== 'undefined') {
    observer = new ResizeObserver(refresh)
    observer.observe(el.parentElement)
  }
  return {
    refresh,
    stop() {
      clearTimeout(timer)
      window.removeEventListener('resize', refresh)
      observer?.disconnect()
    },
  }
}

type Handle = ReturnType<typeof fitHeight>
const handles = new WeakMap<HTMLElement, Handle>()
const norm = (v: number | IFitHeightOptions | undefined): IFitHeightOptions =>
  typeof v === 'number' ? { offset: v } : v ?? {}

/** `v-fit-height` / `v-fit-height="{ offset: 16, min: 300 }"` (or a number = offset). */
export const vFitHeight: Directive<HTMLElement, number | IFitHeightOptions | undefined> = {
  mounted(el, { value }) { handles.set(el, fitHeight(el, norm(value))) },
  updated(el, { value, oldValue }) {
    if (JSON.stringify(value) === JSON.stringify(oldValue)) return handles.get(el)?.refresh()
    handles.get(el)?.stop()
    handles.set(el, fitHeight(el, norm(value)))
  },
  unmounted(el) { handles.get(el)?.stop(); handles.delete(el) },
}
