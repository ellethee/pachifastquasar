<template>
  <q-item-label v-if="item.header" header class="pachi-side-menu__header">
    {{ item.label }}
  </q-item-label>
  <q-expansion-item
    v-else-if="item.children?.length"
    v-model="expanded"
    :icon="item.icon"
    :label="item.label"
    :content-inset-level="0.3"
    dense-toggle
    class="pachi-side-menu__group"
    header-class="pachi-side-menu__item"
    :class="{ 'pachi-side-menu__group--active': active }"
  >
    <pachi-side-menu-item v-for="child in item.children" :key="child.to ?? child.label" :item="child" />
  </q-expansion-item>
  <q-item
    v-else
    clickable
    :to="item.to"
    :active="active"
    class="pachi-side-menu__item"
    active-class="pachi-side-menu__item--active"
    :aria-current="active ? 'page' : undefined"
  >
    <q-item-section v-if="item.icon" avatar>
      <q-icon :name="item.icon" size="20px" />
    </q-item-section>
    <q-item-section>{{ item.label }}</q-item-section>
  </q-item>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { isNavItemActive } from '../menu/nav-tree'
import type { PachiNavItem } from '../menu/nav-tree'

const { item } = defineProps<{ item: PachiNavItem }>()

const route = useRoute()
/** True when this item (or a descendant) is the current route. */
const active = computed(() => isNavItemActive(item, route.path))
/** Groups containing the current route are open, and open themselves when navigating into them. */
const expanded = ref(active.value)
watch(active, value => {
  if (value) expanded.value = true
})
</script>
