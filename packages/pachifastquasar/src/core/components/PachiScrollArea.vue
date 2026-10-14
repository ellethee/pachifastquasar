<template>
  <component :is="tag" ref="root" class="pachi-scroll-area" :style="{ maxHeight }">
    <slot />
  </component>
</template>
<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, onUpdated, ref } from 'vue'

/**
 * Area scrollabile che occupa lo spazio rimasto sotto di essa e non supera il limite inferiore della pagina.
 * Da usare dentro una pagina attorno al contenuto alto (card, form, liste): il resto della pagina (titoli,
 * intestazioni) resta fermo sopra. L'altezza massima è calcolata dalla posizione dell'elemento e si aggiorna
 * al resize della finestra e quando cambia la dimensione del contenitore.
 */
const props = withDefaults(
  defineProps<{
    /** Elemento HTML da renderizzare. */
    tag?: string
    /** Spazio in px da lasciare sotto l'area, oltre al padding della pagina. */
    offset?: number
    /** Altezza minima in px sotto la quale l'area non scende (la pagina scorrerà oltre il limite). */
    minHeight?: number
  }>(),
  { tag: 'div', offset: 0, minHeight: 120 },
)

const root = ref<HTMLElement | null>(null)
const maxHeight = ref<string | undefined>(undefined)
let observer: ResizeObserver | null = null

/** Ricalcola l'altezza massima: fondo del viewport meno padding della pagina, meno il bordo superiore dell'area. */
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
