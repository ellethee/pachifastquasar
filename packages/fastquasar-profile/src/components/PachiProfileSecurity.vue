<template>
  <div v-if="showPassword || showMfa" class="pachi-profile-security">
    <pachi-change-password-form
      v-if="showPassword"
      :min-password-length="minLength"
      :api-base="apiBase"
      v-bind="afterChangeProp"
      @password-changed="emit('password-changed')"
    />
    <pachi-mfa-panel v-if="showMfa" :api-base="apiBase" :methods="mfaMethods" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import '../styles/security.scss'
import { DEFAULT_API_BASE } from '../helpers/http'
import { DEFAULT_MIN_PASSWORD_LENGTH } from '../helpers/password'
import { resolveSecurityOptions } from '../helpers/security-options'
import type { IPachiProfileSecurityOptions } from '../types/security'
import PachiChangePasswordForm from './PachiChangePasswordForm.vue'
import PachiMfaPanel from './PachiMfaPanel.vue'

/**
 * "Security" section of the profile: password change (on by default) and MFA panel (opt-in, visible only
 * if the backend exposes it).
 */
const props = withDefaults(defineProps<{
  /** `false` hides the section; an object chooses the blocks and options. Default: password only. */
  security?: boolean | IPachiProfileSecurityOptions
}>(), {
  security: true,
})

const emit = defineEmits<{
  /** Password changed: a new login is required. */
  (e: 'password-changed'): void
}>()

const resolved = computed(() => resolveSecurityOptions(props.security))
const showPassword = computed(() => resolved.value.password)
const showMfa = computed(() => resolved.value.mfa)
const minLength = computed(() => resolved.value.minPasswordLength ?? DEFAULT_MIN_PASSWORD_LENGTH)
const apiBase = computed(() => resolved.value.apiBase ?? DEFAULT_API_BASE)
const mfaMethods = computed(() => resolved.value.mfaMethods ?? ['totp' as const])
const afterChangeProp = computed(() =>
  resolved.value.onPasswordChanged ? { afterChange: resolved.value.onPasswordChanged } : {})
</script>
