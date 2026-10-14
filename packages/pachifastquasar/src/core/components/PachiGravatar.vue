<template>
  <div class="pachi-gravatar" :style="dimension">
    <img
      v-if="url && !failed"
      class="pachi-gravatar__img"
      :src="url"
      :alt="fullName"
      referrerpolicy="no-referrer"
      @error="failed = true"
    />
    <span v-else class="pachi-gravatar__initials">{{ initials }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { getPachiConfig } from '../config'
import { gravatarHash, gravatarUrl, initialsOf } from '../../helpers/gravatar-helper'

const appConfig = getPachiConfig()

/**
 * Avatar dell'utente: immagine Gravatar (SHA-256 dell'email) con fallback alle iniziali.
 */
const props = withDefaults(
  defineProps<{
    /** email dell'utente */
    email?: string
    /** nome completo, usato per le iniziali di fallback */
    fullName?: string
    /** lato in pixel; se omesso riempie il contenitore */
    size?: number | string
  }>(),
  {
    email: '',
    fullName: '',
    size: ''
  }
)

const url = ref<string | null>(null)
const failed = ref(false)

const initials = computed(
  () => initialsOf(props.fullName) || initialsOf(props.email.split('@')[0] ?? '')
)

const dimension = computed(() => {
  if (props.size === '') return { width: '100%', height: '100%' }
  const px = `${Number(props.size)}px`
  return { width: px, height: px }
})

watch(
  () => [props.email, props.size] as const,
  async ([email, size]) => {
    failed.value = false
    // Gravatar è opt-in (QCLI_APP_GRAVATAR=true): di default nessuna richiesta esterna, solo iniziali
    const hash = appConfig.app.gravatar !== true ? null : await gravatarHash(email)
    const px = size === '' ? 200 : Math.max(1, Number(size)) * 2
    url.value = hash ? gravatarUrl(hash, px) : null
  },
  { immediate: true }
)
</script>

<style lang="scss">
.pachi-gravatar {
  display: grid;
  place-items: center;
  overflow: hidden;
  border-radius: 50%;

  &__img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  &__initials {
    font-weight: 600;
    line-height: 1;
  }
}
</style>
