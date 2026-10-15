<template>
  <q-form class="pachi-profile-edit" novalidate @submit.prevent="submit">
    <div v-if="formError" class="pachi-profile-sec-banner pachi-profile-sec-banner--error" role="alert">{{ formError }}</div>
    <div
      v-if="countdown.active.value"
      class="pachi-profile-sec-banner pachi-profile-sec-banner--warn pachi-profile-sec-banner--dense"
      role="alert"
    >{{ t('pachiProfile.security.retryAfter', { time: countdown.text.value }) }}</div>

    <div class="pachi-profile-form__fields">
      <q-input
        v-model="values.firstName"
        :label="t('pachiProfile.firstName')"
        :error="!!fieldError('firstName')"
        :error-message="fieldError('firstName')"
        :disable="busy"
        autocomplete="given-name"
        outlined
        dense
        no-error-icon
      />
      <q-input
        v-model="values.lastName"
        :label="t('pachiProfile.lastName')"
        :error="!!fieldError('lastName')"
        :error-message="fieldError('lastName')"
        :disable="busy"
        autocomplete="family-name"
        outlined
        dense
        no-error-icon
      />
      <div class="pachi-profile-form__full">
        <q-input
          :model-value="user.username"
          :label="t('pachiProfile.username')"
          outlined
          dense
          disable
        />
      </div>
      <div class="pachi-profile-form__full">
        <q-input
          v-model="values.email"
          type="email"
          :label="t('pachiProfile.email')"
          :error="!!fieldError('email')"
          :error-message="fieldError('email')"
          :disable="busy"
          autocomplete="email"
          outlined
          dense
          no-error-icon
        />
      </div>
      <div v-if="needsPassword" class="pachi-profile-form__full">
        <q-input
          v-model="currentPassword"
          type="password"
          :label="t('pachiProfile.edit.currentPassword')"
          :hint="t('pachiProfile.edit.currentPasswordHelp')"
          :error="!!fieldError('currentPassword')"
          :error-message="fieldError('currentPassword')"
          :disable="busy"
          autocomplete="current-password"
          outlined
          dense
          no-error-icon
        />
      </div>
    </div>

    <div class="pachi-profile-sec-actions">
      <q-btn flat no-caps :label="t('pachiProfile.edit.cancel')" :disable="busy" @click="emit('cancel')" />
      <q-btn
        type="submit"
        color="primary"
        unelevated
        no-caps
        :label="t('pachiProfile.edit.save')"
        :loading="busy"
        :disable="countdown.active.value"
      />
    </div>
  </q-form>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { usePachiI18n } from '@ilpachi/pachi-i18n'
import '../styles/security.scss'
import { messages } from '../locales'
import { parseApiError } from '../helpers/api-error'
import { translateApiError } from '../helpers/use-error-message'
import { useRetryCountdown } from '../helpers/use-retry-countdown'
import { DEFAULT_API_BASE, FORM_REQUEST, resolvePachiProfileHttp } from '../helpers/http'
import {
  buildProfilePatch,
  emailChanged,
  parseProfileUser,
  profileEditValues,
  profileErrorTarget,
  validateProfileForm,
} from '../helpers/profile-update'
import type { IProfileEditErrors, ProfileFieldError } from '../helpers/profile-update'
import type { IPachiProfileUser } from '../types/profile'

/**
 * Profile edit form (`PATCH {apiBase}/auth/user`): first name, last name and email. Changing the email requires
 * the current password. Sends only the changed fields and emits `updated` with the user returned by the backend: the app
 * must update its own copy (e.g. `authManager.refreshUserInfo()`).
 */
const props = withDefaults(defineProps<{
  /** Current user (initial form values). */
  user: IPachiProfileUser
  /** API base URL (default `/api`). */
  apiBase?: string
}>(), {
  apiBase: DEFAULT_API_BASE,
})

const emit = defineEmits<{
  /** Profile saved: `user` is the backend response (or the updated local user if the response is not readable). */
  (e: 'updated', user: IPachiProfileUser): void
  /** Edit cancelled, or nothing to save. */
  (e: 'cancel'): void
}>()

const { t } = usePachiI18n(messages)
const countdown = useRetryCountdown()

const values = reactive(profileEditValues(props.user))
const currentPassword = ref('')
const submitted = ref(false)
const busy = ref(false)
const serverErrors = ref<{ email?: string, currentPassword?: string, form?: string }>({})

const needsPassword = computed(() => emailChanged(props.user, values))
const validation = computed<IProfileEditErrors>(() =>
  submitted.value ? validateProfileForm(props.user, values, currentPassword.value) : {})
const formError = computed(() => serverErrors.value.form ?? '')

/**
 * Error message for a field: client validation (after the first submit) or server error.
 *
 * @param field - field name
 * @returns text, or empty string
 */
function fieldError(field: keyof IProfileEditErrors): string {
  const key: ProfileFieldError | undefined = validation.value[field]
  if (key) return t(`pachiProfile.edit.validation.${key}`)
  if (field === 'email' || field === 'currentPassword') return serverErrors.value[field] ?? ''
  return ''
}

// editing the fields clears the server errors
watch([() => values.firstName, () => values.lastName, () => values.email, currentPassword], () => {
  serverErrors.value = {}
})

/** Validates and sends the `PATCH`. */
async function submit(): Promise<void> {
  if (busy.value || countdown.active.value) return
  submitted.value = true
  serverErrors.value = {}
  const errors = validateProfileForm(props.user, values, currentPassword.value)
  if (Object.keys(errors).length > 0) return
  const body = buildProfilePatch(props.user, values, currentPassword.value)
  if (Object.keys(body).length === 0) {
    emit('cancel')
    return
  }
  const http = resolvePachiProfileHttp(props.apiBase)
  if (!http.Patch) {
    serverErrors.value = { form: t('pachiProfile.security.genericError') }
    return
  }
  busy.value = true
  try {
    const res = await http.Patch<unknown>('/auth/user', body, FORM_REQUEST)
    currentPassword.value = ''
    // response shaped like `GET /auth/user`; if not readable, the form values are applied to the local user
    emit('updated', parseProfileUser(res) ?? { ...props.user, ...values, email: values.email.trim() })
  } catch (err) {
    const parsed = await parseApiError(err)
    if (parsed.status === 429 && parsed.retryAfter !== undefined) {
      countdown.start(parsed.retryAfter)
      return
    }
    const message = translateApiError(parsed, t)
    const target = profileErrorTarget(parsed)
    serverErrors.value = target === 'form' ? { form: message } : { [target]: message }
  } finally {
    busy.value = false
  }
}
</script>

<style lang="scss">
.pachi-profile-edit {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
</style>
