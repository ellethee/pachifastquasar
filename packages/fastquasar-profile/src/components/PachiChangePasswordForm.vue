<template>
  <section class="pachi-profile-sec-card" :aria-labelledby="titleId">
    <div class="pachi-profile-sec-head">
      <span :id="titleId">{{ t('pachiProfile.security.password.title') }}</span>
    </div>
    <q-form class="pachi-profile-sec-body" novalidate @submit.prevent="submit">
      <p class="pachi-profile-sec-hint">{{ t('pachiProfile.security.password.description') }}</p>

      <div
        v-if="success"
        class="pachi-profile-sec-banner pachi-profile-sec-banner--ok"
        role="status"
        aria-live="polite"
      >{{ t('pachiProfile.security.password.success') }}</div>
      <div
        v-else-if="countdown.active.value"
        class="pachi-profile-sec-banner pachi-profile-sec-banner--warn pachi-profile-sec-banner--dense pachi-profile-retry"
        role="alert"
      >{{ t('pachiProfile.security.retryAfter', { time: countdown.text.value }) }}</div>
      <div
        v-else-if="formError"
        class="pachi-profile-sec-banner pachi-profile-sec-banner--error"
        role="alert"
      >{{ formError }}</div>

      <q-input
        v-model="current"
        :type="showCurrent ? 'text' : 'password'"
        :label="t('pachiProfile.security.password.current')"
        :error="!!currentError"
        :error-message="currentError"
        :disable="busy || success"
        autocomplete="current-password"
        outlined
        dense
        no-error-icon
      >
        <template #append>
          <q-btn
            flat
            round
            dense
            size="sm"
            :icon="showCurrent ? mdiEyeOff : mdiEye"
            :aria-label="t(showCurrent ? 'pachiProfile.security.password.hide' : 'pachiProfile.security.password.show')"
            @click="showCurrent = !showCurrent"
          />
        </template>
      </q-input>

      <q-input
        v-model="next"
        :type="showNext ? 'text' : 'password'"
        :label="t('pachiProfile.security.password.next')"
        :hint="t('pachiProfile.security.password.minHint', { min: minLength })"
        :error="!!nextError"
        :error-message="nextError"
        :disable="busy || success"
        autocomplete="new-password"
        outlined
        dense
        no-error-icon
      >
        <template #append>
          <q-btn
            flat
            round
            dense
            size="sm"
            :icon="showNext ? mdiEyeOff : mdiEye"
            :aria-label="t(showNext ? 'pachiProfile.security.password.hide' : 'pachiProfile.security.password.show')"
            @click="showNext = !showNext"
          />
        </template>
      </q-input>

      <q-input
        v-model="confirm"
        :type="showNext ? 'text' : 'password'"
        :label="t('pachiProfile.security.password.confirm')"
        :error="!!confirmError"
        :error-message="confirmError"
        :disable="busy || success"
        autocomplete="new-password"
        outlined
        dense
        no-error-icon
      />

      <div class="pachi-profile-sec-actions">
        <q-btn
          type="submit"
          color="primary"
          unelevated
          no-caps
          :label="t('pachiProfile.security.password.submit')"
          :loading="busy"
          :disable="success || countdown.active.value"
        />
      </div>
    </q-form>
  </section>
</template>

<script setup lang="ts">
import { mdiEye, mdiEyeOff } from '@quasar/extras/mdi-v7'
import { computed, inject, ref, watch } from 'vue'
import { usePachiI18n } from '@ilpachi/pachi-i18n'
import '../styles/security.scss'
import { messages } from '../locales'
import { parseApiError } from '../helpers/api-error'
import { useRetryCountdown } from '../helpers/use-retry-countdown'
import { translateApiError } from '../helpers/use-error-message'
import { DEFAULT_API_BASE, FORM_REQUEST, resolvePachiProfileHttp } from '../helpers/http'
import {
  DEFAULT_MIN_PASSWORD_LENGTH,
  isPasswordFormValid,
  minLengthFromError,
  passwordErrorTarget,
  validatePasswordForm,
} from '../helpers/password'
import type { IPasswordFormErrors } from '../helpers/password'

/**
 * Change password form (`POST {apiBase}/auth/user/password`). After success the backend revokes all tokens:
 * a message is shown and then `afterChange` is called, otherwise `pachiLogout` provided by the shell via
 * `provide('pachiLogout')`. The `password-changed` event is always emitted. Passwords are never logged.
 */
const props = withDefaults(defineProps<{
  /** Initial minimum length of the new password. */
  minPasswordLength?: number
  /** API base URL (default `/api`). */
  apiBase?: string
  /** Called after success, instead of `pachiLogout`. */
  afterChange?: () => void | Promise<void>
  /** Delay in ms between the success message and the logout/callback. */
  logoutDelay?: number
}>(), {
  minPasswordLength: DEFAULT_MIN_PASSWORD_LENGTH,
  apiBase: DEFAULT_API_BASE,
  logoutDelay: 2500,
})

const emit = defineEmits<{
  /** Password changed: the session is no longer valid and a new login is required. */
  (e: 'password-changed'): void
}>()

const { t } = usePachiI18n(messages)
const http = resolvePachiProfileHttp(props.apiBase)
const pachiLogout = inject<(() => Promise<void> | void) | null>('pachiLogout', null)

const countdown = useRetryCountdown()
const titleId = `pachi-profile-pwd-${Math.random().toString(36).slice(2, 8)}`
const current = ref('')
const next = ref('')
const confirm = ref('')
const showCurrent = ref(false)
const showNext = ref(false)
const busy = ref(false)
const success = ref(false)
const submitted = ref(false)
const minLength = ref(props.minPasswordLength)
const serverErrors = ref<{ current?: string, next?: string, form?: string }>({})

watch(() => props.minPasswordLength, (n) => { minLength.value = n })

/** Client validation errors (shown only after the first submit). */
const validation = computed<IPasswordFormErrors>(() =>
  submitted.value
    ? validatePasswordForm({ current: current.value, next: next.value, confirm: confirm.value }, minLength.value)
    : {})

/**
 * Translated text for a validation error.
 *
 * @param key - field error key
 */
function validationText(key: string | undefined): string {
  return key ? t(`pachiProfile.security.password.validation.${key}`, { min: minLength.value }) : ''
}

const currentError = computed(() => validationText(validation.value.current) || serverErrors.value.current || '')
const nextError = computed(() => validationText(validation.value.next) || serverErrors.value.next || '')
const confirmError = computed(() => validationText(validation.value.confirm))
const formError = computed(() => serverErrors.value.form ?? '')

// editing a field clears the related server error
watch(current, () => { serverErrors.value = { ...serverErrors.value, current: '', form: '' } })
watch(next, () => { serverErrors.value = { ...serverErrors.value, next: '', form: '' } })

/** Clears the fields (passwords do not stay in memory after success). */
function clearFields(): void {
  current.value = ''
  next.value = ''
  confirm.value = ''
  showCurrent.value = false
  showNext.value = false
}

/**
 * Performs the request; on success shows the message and, after `logoutDelay`, calls the callback or logout.
 */
async function submit(): Promise<void> {
  submitted.value = true
  serverErrors.value = {}
  const errors = validatePasswordForm({ current: current.value, next: next.value, confirm: confirm.value }, minLength.value)
  if (!isPasswordFormValid(errors) || busy.value || countdown.active.value) return
  busy.value = true
  try {
    await http.Post('/auth/user/password', { currentPassword: current.value, newPassword: next.value }, FORM_REQUEST)
  } catch (err) {
    const parsed = await parseApiError(err)
    if (parsed.status === 429 && parsed.retryAfter !== undefined) {
      // account locked: warning with countdown, submit disabled until it expires
      countdown.start(parsed.retryAfter)
      busy.value = false
      return
    }
    // 422 with `params.min_length`: update the minimum and revalidate
    minLength.value = minLengthFromError(parsed, minLength.value)
    const message = translateApiError(parsed, t)
    const target = passwordErrorTarget(parsed)
    // if the new minimum already invalidates the password, revalidation is enough («at least N characters»)
    if (!(target === 'next' && next.value.length < minLength.value)) serverErrors.value = { [target]: message }
    busy.value = false
    return
  }
  busy.value = false
  clearFields()
  submitted.value = false
  success.value = true
  emit('password-changed')
  const run = props.afterChange ?? pachiLogout
  if (run) {
    setTimeout(() => {
      void Promise.resolve(run()).catch(() => undefined)
    }, props.logoutDelay)
  }
}
</script>
