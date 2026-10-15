<template>
  <component :is="tag" ref="root" class="pachi-scroll-area" :style="{ maxHeight }">
    <slot />
  </component>
</template>
<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, onUpdated, ref } from 'vue'

/**
 * Scrollable area that takes up the space left below it and does not exceed the bottom limit of the page.
 * To be used inside a page around tall content (cards, forms, lists): the rest of the page (titles,
 * headings) stays fixed above. The maximum height is computed from the element position and is updated
 * on window resize and when the container size changes.
 */
const props = withDefaults(
  defineProps<{
    /** HTML element to render. */
    tag?: string
    /** Space in px to leave below the area, in addition to the page padding. */
    offset?: number
    /** Minimum height in px below which the area does not shrink (the page will scroll past the limit). */
    minHeight?: number
  }>(),
  { tag: 'div', offset: 0, minHeight: 120 },
)

const root = ref<HTMLElement | null>(null)
const maxHeight = ref<string | undefined>(undefined)
let observer: ResizeObserver | null = null

/** Recomputes the maximum height: viewport bottom minus page padding, minus the top edge of the area. */
function measure(): void {
  const el = root.value
  if (!el) return
  const page = el.closest('.q-page') as HTMLElement | null
  const padBottom = page ? parseFloat(getComputedStyle(page).paddingBottom) || 0 : 0
  const top = el.getBoundingClientRect().top
  const available = window.innerHeight - padBottom - props.offset - top
  const next = `${Math.max(props.minHeight, Math.floor(available))}px`
  if (next !== maxHeight.value) maxHeight.value = next
}

onMounted(() => {
  void nextTick(measure)
  window.addEventListener('resize', measure)
  if (typeof ResizeObserver !== 'undefined' && root.value?.parentElement) {
    observer = new ResizeObserver(measure)
    observer.observe(root.value.parentElement)
  }
})
onUpdated(measure)
onBeforeUnmount(() => {
  window.removeEventListener('resize', measure)
  observer?.disconnect()
})

defineExpose({ measure })
</script>
<style lang="scss">
.pachi-scroll-area {
  overflow-y: auto;
  min-height: 0;
}
</style>
