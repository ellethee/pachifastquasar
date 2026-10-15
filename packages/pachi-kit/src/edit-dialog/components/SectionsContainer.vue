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

// reactive (shallow): sections added/activated after mount keep `hasChanges` up to date
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

// stable setters per key: with a new function on every render Vue would call `null` first, then `el`,
// on every patch, continuously invalidating the computeds that read `sectionRefs`
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
 * Builds the container component of a section. `type` is not passed as a DOM attribute;
 * `title`/`icon` are mapped to `label`/`icon` only for `expansion` (QExpansionItem); for `card`
 * and `div` they are not rendered.
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

/** Rebuilds the baseline of all sections from the current state (after a successful save). */
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
