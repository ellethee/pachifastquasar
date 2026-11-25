<template>
  <section class="q-mb-xl" :data-test="`gallery-${id}`">
    <h2 class="text-h6 q-my-none">{{ title }}</h2>
    <p class="text-caption text-grey-7 q-mt-xs q-mb-md">{{ caption }}</p>
    <div class="row q-gutter-md items-start"><slot /></div>
  </section>
</template>

<script setup lang="ts">
/** Titled section of the gallery: heading, short caption and the variants side by side. */
defineProps<{ id: string; title: string; caption: string }>()
</script>
