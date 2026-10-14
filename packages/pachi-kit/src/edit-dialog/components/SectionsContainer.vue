<template>
  <div class="column">
    <template
      v-for="section in orderedSections"
      :key="section.key"
    >
      <component
        :is="section.container.component"
        v-if="section.container"
        v-bind="section.container.props"
      >
        <component
          :is="section.component"
          v-bind="{ ...section.props, ...commonProps }"
          :ref="sectionRefSetter(section.key)"
          :initial-value="section.initialValue"
        />
      </component>
      <component
        :is="section.component"
        v-else
        v-bind="{ ...section.props, ...commonProps }"
        :ref="sectionRefSetter(section.key)"
        :initial-value="section.initialValue"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, shallowReactive } from 'vue'
import type { ComponentPublicInstance } from 'vue'
import type {
  IContainerComponent,
  ISectionDefinition,
  ISectionExpose
} from '../types/sections'
import { QCard, QExpansionItem } from 'quasar'
const { sections, commonProps } = defineProps<{ sections: ISectionDefinition[], commonProps: Record<string, unknown> }>()

// reattivo (shallow): sezioni aggiunte/attivate dopo il mount rendono `hasChanges` aggiornato
const sectionRefs = shallowReactive<Record<string, ISectionExpose>>({})

function setSectionRef(
  key: string,
  el: Element | ComponentPublicInstance | null
) {
  if (el) {
    if (sectionRefs[key] as unknown !== el) sectionRefs[key] = el as unknown as ISectionExpose
  }
  else delete sectionRefs[key]
}

// setter stabili per chiave: con una funzione nuova a ogni render Vue chiamerebbe prima `null` poi `el`
// a ogni patch, invalidando di continuo i computed che leggono `sectionRefs`
const setters = new Map<string, (el: Element | ComponentPublicInstance | null) => void>()
function sectionRefSetter(key: string) {
  let fn = setters.get(key)
  if (!fn) {
    fn = (el) => setSectionRef(key, el)
    setters.set(key, fn)
  }
  return fn
}

const orderedSections = computed(() => {
  return [...sections]
    .filter(section => section.enabled !== false)
    .sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
    .map(section => ({
      ...section,
      container: getContainer(section)
    }))
})
/**
 * Costruisce il componente contenitore di una sezione. `type` non viene passato come attributo DOM;
 * `title`/`icon` sono mappati su `label`/`icon` solo per `expansion` (QExpansionItem), per `card`
 * e `div` non sono renderizzati.
 */
function getContainer(section: ISectionDefinition<unknown>): IContainerComponent | undefined {
  if (!section.container) return undefined
  const { type, title, icon, ...rest } = section.container
  const container: IContainerComponent = { props: rest, component: 'div' }
  switch (type) {
    case 'card':
      container.component = QCard
      break
    case 'expansion':
      container.component = QExpansionItem
      container.props = {
        ...(title !== undefined && !('label' in rest) ? { label: title } : {}),
        ...(icon !== undefined ? { icon } : {}),
        ...rest,
      }
      break
  }
  return container
}
async function resetAll() {
  for (const section of Object.values(sectionRefs)) {
    await section?.reset()
  }
}

/** Rifà il baseline di tutte le sezioni dallo stato corrente (dopo un salvataggio riuscito). */
function commitAll() {
  for (const section of Object.values(sectionRefs)) {
    section?.commit?.()
  }
}

async function validateAll() {
  for (const section of Object.values(sectionRefs)) {
    if (section?.validate) {
      const valid = await section.validate()
      if (!valid) {
        return false
      }
    }
  }
  return true
}

async function getResults() {
  const results: Record<string, unknown> = {}

  for (const [key, section] of Object.entries(sectionRefs)) {
    if (!section?.getResults) continue
    results[key] = await section.getResults()
  }

  return results
}

function hasChanges() {
  return Object.values(sectionRefs).some(section => section?.hasChanges?.() === true)
}

defineExpose({
  resetAll,
  commitAll,
  validateAll,
  getResults,
  hasChanges,
  name: 'SectionsContainer'
})
</script>
