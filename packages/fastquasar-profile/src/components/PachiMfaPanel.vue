<template>
  <section v-if="available" class="pachi-profile-sec-card" :aria-labelledby="titleId">
    <div class="pachi-profile-sec-head">
      <span :id="titleId">{{ t('pachiProfile.security.mfa.title') }}</span>
      <span
        v-if="status"
        class="pachi-profile-sec-badge"
        :class="status.enabled ? 'pachi-profile-sec-badge--on' : 'pachi-profile-sec-badge--off'"
      >{{ status.enabled ? t('pachiProfile.security.mfa.statusOn') : t('pachiProfile.security.mfa.statusOff') }}</span>
    </div>

    <div class="pachi-profile-sec-body" :aria-busy="busy">
      <p class="pachi-profile-sec-hint">{{ t('pachiProfile.security.mfa.description') }}</p>

      <div v-if="notice" class="pachi-profile-sec-banner pachi-profile-sec-banner--ok" role="status" aria-live="polite">
        {{ notice }}
      </div>
      <div v-if="error" class="pachi-profile-sec-banner pachi-profile-sec-banner--error" role="alert">{{ error }}</div>
      <div
        v-if="countdown.active.value"
        class="pachi-profile-sec-banner pachi-profile-sec-banner--warn pachi-profile-sec-banner--dense pachi-profile-retry"
        role="alert"
      >{{ t('pachiProfile.security.retryAfter', { time: countdown.text.value }) }}</div>
      <div v-if="locked" class="pachi-profile-sec-banner pachi-profile-sec-banner--warn" role="alert">
        {{ t('pachiProfile.security.mfa.tooManyAttempts') }}
      </div>

      <div v-if="!status" class="pachi-profile-sec-hint">{{ t('pachiProfile.security.mfa.loading') }}</div>

      <!-- Freshly generated backup codes (regenerate / email) -->
      <div v-else-if="view === 'backup'" class="pachi-profile-sec-stack">
        <h3 class="pachi-profile-sec-sub">{{ t('pachiProfile.security.mfa.newBackupCodes') }}</h3>
        <p class="pachi-profile-sec-banner pachi-profile-sec-banner--warn">{{ t('pachiProfile.security.mfa.backupWarning') }}</p>
        <ul class="pachi-profile-codes" :aria-label="t('pachiProfile.security.mfa.backupTitle')">
          <li v-for="c in backupCodes" :key="c">{{ c }}</li>
        </ul>
        <div class="pachi-profile-sec-actions">
          <q-btn flat no-caps :icon="mdiContentCopy" :label="t('pachiProfile.security.mfa.copyAll')" @click="copy(backupCodes.join('\n'))" />
          <q-btn color="primary" unelevated no-caps :label="t('pachiProfile.security.mfa.saved')" @click="closeView" />
        </div>
      </div>

      <!-- Setup TOTP -->
      <div v-else-if="view === 'totp' && totp" class="pachi-profile-sec-stack">
        <template v-if="!confirmed">
          <h3 class="pachi-profile-sec-sub">{{ t('pachiProfile.security.mfa.scanTitle') }}</h3>
          <p class="pachi-profile-sec-hint">{{ t('pachiProfile.security.mfa.scanHelp') }}</p>
          <pachi-mfa-qr-code :value="totp.otpauthUri" :label="t('pachiProfile.security.mfa.qrAlt')" />
          <div class="pachi-profile-secret">
            <span class="pachi-profile-secret__label">{{ t('pachiProfile.security.mfa.secretLabel') }}</span>
            <code class="pachi-profile-secret__value">{{ formatSecret(totp.secret) }}</code>
            <q-btn
              flat
              dense
              no-caps
              :icon="mdiContentCopy"
              :label="t('pachiProfile.security.mfa.copy')"
              @click="copy(totp.secret)"
            />
            <a class="pachi-profile-sec-link" :href="totp.otpauthUri">{{ t('pachiProfile.security.mfa.openApp') }}</a>
          </div>
        </template>

        <h3 class="pachi-profile-sec-sub">{{ t('pachiProfile.security.mfa.backupTitle') }}</h3>
        <p class="pachi-profile-sec-banner pachi-profile-sec-banner--warn">{{ t('pachiProfile.security.mfa.backupWarning') }}</p>
        <ul class="pachi-profile-codes" :aria-label="t('pachiProfile.security.mfa.backupTitle')">
          <li v-for="c in totp.backupCodes" :key="c">{{ c }}</li>
        </ul>
        <div class="pachi-profile-sec-actions">
          <q-btn flat no-caps :icon="mdiContentCopy" :label="t('pachiProfile.security.mfa.copyAll')" @click="copy(totp.backupCodes.join('\n'))" />
        </div>

        <q-form v-if="!confirmed" class="pachi-profile-sec-stack" novalidate @submit.prevent="confirmTotp">
          <h3 class="pachi-profile-sec-sub">{{ t('pachiProfile.security.mfa.confirmTitle') }}</h3>
          <p class="pachi-profile-sec-hint">{{ t('pachiProfile.security.mfa.confirmHelp') }}</p>
          <q-input
            v-model="code"
            :label="t('pachiProfile.security.mfa.code')"
            :error="!!codeError"
            :error-message="codeError"
            :disable="busy"
            inputmode="numeric"
            autocomplete="one-time-code"
            maxlength="6"
            outlined
            dense
            no-error-icon
          />
          <div class="pachi-profile-sec-actions">
            <q-btn flat no-caps :label="t('pachiProfile.security.mfa.cancel')" :disable="busy" @click="closeView" />
            <q-btn type="submit" color="primary" unelevated no-caps :label="t('pachiProfile.security.mfa.confirm')" :loading="busy" :disable="countdown.active.value" />
          </div>
        </q-form>
        <div v-else class="pachi-profile-sec-actions">
          <q-btn color="primary" unelevated no-caps :label="t('pachiProfile.security.mfa.saved')" @click="closeView" />
        </div>
      </div>

      <!-- Email MFA confirmation: the code was sent in the previous step -->
      <q-form v-else-if="view === 'email'" class="pachi-profile-sec-stack" novalidate @submit.prevent="confirmEmail">
        <h3 class="pachi-profile-sec-sub">{{ t('pachiProfile.security.mfa.emailConfirmTitle') }}</h3>
        <p class="pachi-profile-sec-hint">{{ t('pachiProfile.security.mfa.emailConfirmHelp') }}</p>
        <q-input
          v-model="code"
          :label="t('pachiProfile.security.mfa.code')"
          :error="!!codeError"
          :error-message="codeError"
          :disable="busy"
          inputmode="numeric"
          autocomplete="one-time-code"
          maxlength="6"
          outlined
          dense
          no-error-icon
        />
        <div class="pachi-profile-sec-actions">
          <q-btn flat no-caps :label="t('pachiProfile.security.mfa.cancel')" :disable="busy" @click="closeView" />
          <q-btn flat no-caps :label="resendLabel" :disable="busy || sendCooldown.active.value" @click="setupEmail" />
          <q-btn type="submit" color="primary" unelevated no-caps :label="t('pachiProfile.security.mfa.confirm')" :loading="busy" :disable="countdown.active.value" />
        </div>
      </q-form>

      <!-- SMS MFA, step 1: phone number -->
      <q-form v-else-if="view === 'smsPhone'" class="pachi-profile-sec-stack" novalidate @submit.prevent="setupSms">
        <h3 class="pachi-profile-sec-sub">{{ t('pachiProfile.security.mfa.smsPhoneTitle') }}</h3>
        <p class="pachi-profile-sec-hint">{{ t('pachiProfile.security.mfa.smsPhoneHelp') }}</p>
        <q-input
          v-model="phone"
          type="tel"
          :label="t('pachiProfile.security.mfa.smsPhone')"
          :error="!!phoneError"
          :error-message="phoneError"
          :disable="busy"
          inputmode="tel"
          autocomplete="tel"
          outlined
          dense
          no-error-icon
        />
        <div class="pachi-profile-sec-actions">
          <q-btn flat no-caps :label="t('pachiProfile.security.mfa.cancel')" :disable="busy" @click="closeView" />
          <q-btn type="submit" color="primary" unelevated no-caps :label="t('pachiProfile.security.mfa.smsSend')" :loading="busy" :disable="sendCooldown.active.value" />
        </div>
      </q-form>

      <!-- SMS MFA, step 2: received code -->
      <q-form v-else-if="view === 'sms'" class="pachi-profile-sec-stack" novalidate @submit.prevent="confirmSms">
        <h3 class="pachi-profile-sec-sub">{{ t('pachiProfile.security.mfa.smsConfirmTitle') }}</h3>
        <p class="pachi-profile-sec-hint">{{ t('pachiProfile.security.mfa.smsConfirmHelp') }}</p>
        <q-input
          v-model="code"
          :label="t('pachiProfile.security.mfa.code')"
          :error="!!codeError"
          :error-message="codeError"
          :disable="busy"
          inputmode="numeric"
          autocomplete="one-time-code"
          maxlength="6"
          outlined
          dense
          no-error-icon
        />
        <div class="pachi-profile-sec-actions">
          <q-btn flat no-caps :label="t('pachiProfile.security.mfa.cancel')" :disable="busy" @click="closeView" />
          <q-btn flat no-caps :label="resendLabel" :disable="busy || sendCooldown.active.value" @click="setupSms" />
          <q-btn type="submit" color="primary" unelevated no-caps :label="t('pachiProfile.security.mfa.confirm')" :loading="busy" :disable="countdown.active.value" />
        </div>
      </q-form>

      <!-- Password to disable / regenerate -->
      <q-form v-else-if="view === 'disable' || view === 'regenerate'" class="pachi-profile-sec-stack" novalidate @submit.prevent="submitPassword">
        <h3 class="pachi-profile-sec-sub">
          {{ view === 'disable' ? t('pachiProfile.security.mfa.disable') : t('pachiProfile.security.mfa.regenerateTitle') }}
        </h3>
        <p class="pachi-profile-sec-hint">
          {{ view === 'disable' ? t('pachiProfile.security.mfa.disableHelp') : t('pachiProfile.security.mfa.regenerateHelp') }}
        </p>
        <q-input
          v-model="password"
          type="password"
          :label="t('pachiProfile.security.mfa.password')"
          :error="!!passwordError"
          :error-message="passwordError"
          :disable="busy"
          autocomplete="current-password"
          outlined
          dense
          no-error-icon
        />
        <div class="pachi-profile-sec-actions">
          <q-btn flat no-caps :label="t('pachiProfile.security.mfa.cancel')" :disable="busy" @click="closeView" />
          <q-btn
            type="submit"
            :color="view === 'disable' ? 'negative' : 'primary'"
            unelevated
            no-caps
            :label="view === 'disable' ? t('pachiProfile.security.mfa.disable') : t('pachiProfile.security.mfa.regenerate')"
            :loading="busy"
            :disable="countdown.active.value"
          />
        </div>
      </q-form>

      <!-- Initial view -->
      <div v-else-if="status.enabled" class="pachi-profile-sec-actions">
        <span v-if="status.method" class="pachi-profile-sec-hint">
          {{ t('pachiProfile.security.mfa.method') }}: {{ methodLabel(status.method) }}
        </span>
        <q-btn flat no-caps :icon="mdiKeyChange" :label="t('pachiProfile.security.mfa.regenerate')" @click="openView('regenerate')" />
        <q-btn flat no-caps color="negative" :icon="mdiShieldOff" :label="t('pachiProfile.security.mfa.disable')" @click="openView('disable')" />
      </div>
      <div v-else class="pachi-profile-sec-actions">
        <q-btn v-if="offered.includes('totp')" color="primary" unelevated no-caps :icon="mdiShieldLock" :label="t('pachiProfile.security.mfa.enableTotp')" :loading="busy" @click="startTotp" />
        <q-btn v-if="offered.includes('email')" flat no-caps :icon="mdiEmailOutline" :label="t('pachiProfile.security.mfa.enableEmail')" :loading="busy" :disable="sendCooldown.active.value" @click="setupEmail" />
        <q-btn v-if="offered.includes('sms')" flat no-caps :icon="mdiCellphoneMessage" :label="t('pachiProfile.security.mfa.enableSms')" :loading="busy" @click="openView('smsPhone')" />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import {
  mdiCellphoneMessage,
  mdiContentCopy,
  mdiEmailOutline,
  mdiKeyChange,
  mdiShieldLock,
  mdiShieldOff,
} from '@quasar/extras/mdi-v7'
import { computed, onMounted, ref } from 'vue'
import { usePachiI18n } from '@ilpachi/pachi-i18n'
import '../styles/security.scss'
import { messages } from '../locales'
import { parseApiError } from '../helpers/api-error'
import { SEND_COOLDOWN_SECONDS, isSendRateLimited, sendCooldownSeconds } from '../helpers/cooldown'
import { useRetryCountdown } from '../helpers/use-retry-countdown'
import { translateApiError } from '../helpers/use-error-message'
import { DEFAULT_API_BASE, FORM_REQUEST, SILENT_REQUEST, resolvePachiProfileHttp } from '../helpers/http'
import {
  classifyMfaError,
  emailSetupNeedsConfirm,
  formatSecret,
  isValidPhoneNumber,
  isValidTotpCode,
  normalizePhoneNumber,
  normalizeTotpCode,
  parseBackupCodes,
  parseMfaStatus,
  parseTotpSetup,
  smsSetupNeedsConfirm,
} from '../helpers/mfa'
import type { IMfaStatus, ITotpSetup } from '../helpers/mfa'
import type { PachiMfaMethod } from '../types/security'
import PachiMfaQrCode from './PachiMfaQrCode.vue'

/**
 * Profile MFA panel. It appears only if `GET {apiBase}/mfa/status` answers 2xx (404/403/errors: no
 * section and no dialog). It allows enabling TOTP (QR code, key, backup codes, code confirmation),
 * email or SMS, regenerating the backup codes and disabling MFA (with the password).
 */
const props = withDefaults(defineProps<{
  /** API base URL (default `/api`). */
  apiBase?: string
  /** Methods offered for activation. */
  methods?: PachiMfaMethod[]
}>(), {
  apiBase: DEFAULT_API_BASE,
  methods: () => ['totp'],
})

const { t } = usePachiI18n(messages)
const http = resolvePachiProfileHttp(props.apiBase)
const countdown = useRetryCountdown()
/** Pause between two email/SMS code sends (30 s after each send, `Retry-After` on 429). */
const sendCooldown = useRetryCountdown()
const resendLabel = computed(() =>
  sendCooldown.active.value
    ? t('pachiProfile.security.mfa.resendIn', { time: sendCooldown.text.value })
    : t('pachiProfile.security.mfa.resend'),
)

type View = 'idle' | 'totp' | 'email' | 'smsPhone' | 'sms' | 'backup' | 'disable' | 'regenerate'

/** Offered methods (default: TOTP only). */
const offered = computed<PachiMfaMethod[]>(() => props.methods ?? ['totp'])

const titleId = `pachi-profile-mfa-${Math.random().toString(36).slice(2, 8)}`
const available = ref(false)
const status = ref<IMfaStatus | null>(null)
const view = ref<View>('idle')
const busy = ref(false)
const error = ref('')
const notice = ref('')
const locked = ref(false)
const totp = ref<ITotpSetup | null>(null)
const confirmed = ref(false)
const backupCodes = ref<string[]>([])
const code = ref('')
const codeError = ref('')
const phone = ref('')
const phoneError = ref('')
const password = ref('')
const passwordError = ref('')

/**
 * Label of the active MFA method.
 *
 * @param method - `totp`, `email` or other
 */
function methodLabel(method: string): string {
  return ['totp', 'email', 'sms'].includes(method) ? t(`pachiProfile.security.mfa.methods.${method}`) : method
}

/** Clears messages and sensitive fields. */
function resetMessages(): void {
  error.value = ''
  notice.value = ''
  locked.value = false
  codeError.value = ''
  passwordError.value = ''
  phoneError.value = ''
}

/**
 * Opens a view (clearing fields and messages).
 *
 * @param next - view to show
 */
function openView(next: View): void {
  resetMessages()
  code.value = ''
  password.value = ''
  if (next === 'idle' || next === 'smsPhone') phone.value = ''
  view.value = next
}

/** Returns to the initial view and discards the setup data (secret and codes do not stay in memory). */
function closeView(): void {
  openView('idle')
  totp.value = null
  confirmed.value = false
  backupCodes.value = []
}

/** Reads the MFA status; if unavailable the section stays hidden (no error shown). */
async function loadStatus(silent = false): Promise<void> {
  try {
    const body = await http.Get<unknown>('/mfa/status', SILENT_REQUEST)
    const parsed = parseMfaStatus(body)
    status.value = parsed
    available.value = parsed !== null
  } catch {
    if (!silent) available.value = false
  }
}

/**
 * Copies a text to the clipboard (never logging it).
 *
 * @param text - text to copy
 */
async function copy(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text)
    notice.value = t('pachiProfile.security.mfa.copied')
  } catch {
    // clipboard unavailable (insecure context or permission denied): warn, the user can select the text by hand
    notice.value = t('pachiProfile.security.mfa.copyFailed')
  }
}

/**
 * Shows an error of an MFA request: 429 with a lock notice, 409 with a status reload.
 *
 * @param err - error thrown by the request
 * @param onField - optional handling of the error on a field (for `codeInvalid`/`passwordIncorrect`)
 * @param isSend - `true` when sending an email/SMS code: a 429 is the pause between sends, not a lock
 */
async function handleError(
  err: unknown,
  onField?: (kind: ReturnType<typeof classifyMfaError>, message: string) => boolean,
  isSend = false,
): Promise<void> {
  const parsed = await parseApiError(err)
  if (isSend && isSendRateLimited(parsed)) {
    // pause between two sends: resend button disabled for Retry-After (fallback 30 s)
    sendCooldown.start(sendCooldownSeconds(parsed))
    error.value = translateApiError(parsed, t)
    return
  }
  const kind = classifyMfaError(parsed)
  if (kind === 'tooManyAttempts' && parsed.retryAfter !== undefined) {
    // account locked with a known time: countdown instead of the generic message
    countdown.start(parsed.retryAfter)
    return
  }
  const message = translateApiError(parsed, t)
  if (kind === 'tooManyAttempts') locked.value = true
  if (kind === 'mfaDisabled') {
    // MFA turned off on the server (`MFA_ENABLED=false`): the section no longer makes sense
    error.value = t('pachiProfile.security.mfa.serverDisabled')
    available.value = false
    return
  }
  if (kind === 'alreadyEnabled') {
    error.value = t('pachiProfile.security.mfa.alreadyEnabled')
    await loadStatus(true)
    return
  }
  if (onField?.(kind, message)) return
  error.value = message
}

/** Starts the TOTP setup. */
async function startTotp(): Promise<void> {
  resetMessages()
  busy.value = true
  try {
    const body = await http.Post<unknown>('/mfa/totp/setup', undefined, FORM_REQUEST)
    const setup = parseTotpSetup(body)
    if (!setup) {
      error.value = t('pachiProfile.security.genericError')
      return
    }
    totp.value = setup
    confirmed.value = false
    code.value = ''
    view.value = 'totp'
  } catch (err) {
    await handleError(err)
  } finally {
    busy.value = false
  }
}

/** Confirms the TOTP setup with the 6-digit code. */
async function confirmTotp(): Promise<void> {
  if (countdown.active.value) return
  resetMessages()
  if (!isValidTotpCode(code.value)) {
    codeError.value = t('pachiProfile.security.mfa.codeInvalid')
    return
  }
  busy.value = true
  try {
    await http.Post('/mfa/totp/confirm', { code: normalizeTotpCode(code.value) }, FORM_REQUEST)
    confirmed.value = true
    code.value = ''
    notice.value = t('pachiProfile.security.mfa.enabledDone')
    await loadStatus(true)
  } catch (err) {
    await handleError(err, (kind) => {
      if (kind !== 'codeInvalid') return false
      codeError.value = t('pachiProfile.security.mfa.codeWrong')
      return true
    })
  } finally {
    busy.value = false
  }
}

/**
 * First step of email MFA: the backend sends the code to the user's address and leaves the method inactive
 * until it is confirmed. With an older backend (setup that activates immediately and returns the backup codes)
 * the codes are shown directly.
 */
async function setupEmail(): Promise<void> {
  if (sendCooldown.active.value) return
  resetMessages()
  busy.value = true
  try {
    const body = await http.Post<unknown>('/mfa/email/setup', undefined, FORM_REQUEST)
    sendCooldown.start(SEND_COOLDOWN_SECONDS)
    const legacyCodes = parseBackupCodes(body)
    if (!emailSetupNeedsConfirm(body) && legacyCodes.length > 0) {
      backupCodes.value = legacyCodes
      notice.value = t('pachiProfile.security.mfa.emailDone')
      view.value = 'backup'
      await loadStatus(true)
      return
    }
    code.value = ''
    view.value = 'email'
    notice.value = t('pachiProfile.security.mfa.emailSent')
  } catch (err) {
    await handleError(err, undefined, true)
  } finally {
    busy.value = false
  }
}

/** Second step: confirms email MFA with the received code and shows any backup codes. */
async function confirmEmail(): Promise<void> {
  if (countdown.active.value) return
  resetMessages()
  if (!isValidTotpCode(code.value)) {
    codeError.value = t('pachiProfile.security.mfa.codeInvalid')
    return
  }
  busy.value = true
  try {
    const body = await http.Post<unknown>('/mfa/email/confirm', { code: normalizeTotpCode(code.value) }, FORM_REQUEST)
    code.value = ''
    const codes = parseBackupCodes(body)
    notice.value = t('pachiProfile.security.mfa.emailDone')
    if (codes.length > 0) {
      backupCodes.value = codes
      view.value = 'backup'
    } else {
      closeView()
      notice.value = t('pachiProfile.security.mfa.emailDone')
    }
    await loadStatus(true)
  } catch (err) {
    await handleError(err, (kind) => {
      if (kind === 'codeInvalid') {
        codeError.value = t('pachiProfile.security.mfa.codeWrong')
        return true
      }
      if (kind === 'noEmailSetup') {
        // setup expired or never started: go back to the start and send the code again
        closeView()
        error.value = t('pachiProfile.security.mfa.emailSetupExpired')
        return true
      }
      return false
    })
  } finally {
    busy.value = false
  }
}

/**
 * First step of SMS MFA: the backend sends the code to the given number and leaves the method inactive until
 * it is confirmed. From the second send ("Send the code again") the number stays the one already typed.
 */
async function setupSms(): Promise<void> {
  if (sendCooldown.active.value) return
  resetMessages()
  if (!isValidPhoneNumber(phone.value)) {
    phoneError.value = t('pachiProfile.security.mfa.smsPhoneInvalid')
    return
  }
  busy.value = true
  try {
    const body = await http.Post<unknown>('/mfa/sms/setup', { phone_number: normalizePhoneNumber(phone.value) }, FORM_REQUEST)
    sendCooldown.start(SEND_COOLDOWN_SECONDS)
    if (!smsSetupNeedsConfirm(body)) {
      // a backend that activates the method immediately: show the backup codes, if any
      const codes = parseBackupCodes(body)
      closeView()
      notice.value = t('pachiProfile.security.mfa.smsDone')
      if (codes.length > 0) {
        backupCodes.value = codes
        view.value = 'backup'
      }
      await loadStatus(true)
      return
    }
    code.value = ''
    view.value = 'sms'
    notice.value = t('pachiProfile.security.mfa.smsSent')
  } catch (err) {
    await handleError(err, undefined, true)
  } finally {
    busy.value = false
  }
}

/** Second step: confirms SMS MFA with the received code and shows any backup codes. */
async function confirmSms(): Promise<void> {
  if (countdown.active.value) return
  resetMessages()
  if (!isValidTotpCode(code.value)) {
    codeError.value = t('pachiProfile.security.mfa.codeInvalid')
    return
  }
  busy.value = true
  try {
    const body = await http.Post<unknown>('/mfa/sms/confirm', { code: normalizeTotpCode(code.value) }, FORM_REQUEST)
    code.value = ''
    const codes = parseBackupCodes(body)
    if (codes.length > 0) {
      backupCodes.value = codes
      view.value = 'backup'
    } else {
      closeView()
    }
    notice.value = t('pachiProfile.security.mfa.smsDone')
    await loadStatus(true)
  } catch (err) {
    await handleError(err, (kind) => {
      if (kind === 'codeInvalid') {
        codeError.value = t('pachiProfile.security.mfa.codeWrong')
        return true
      }
      if (kind === 'noSmsSetup') {
        // setup expired or never started: go back to the phone number
        openView('smsPhone')
        error.value = t('pachiProfile.security.mfa.smsSetupExpired')
        return true
      }
      return false
    })
  } finally {
    busy.value = false
  }
}

/** Disables MFA or regenerates the backup codes, depending on the view, asking for the password. */
async function submitPassword(): Promise<void> {
  if (countdown.active.value) return
  resetMessages()
  if (!password.value) {
    passwordError.value = t('pachiProfile.security.mfa.passwordRequired')
    return
  }
  const disabling = view.value === 'disable'
  busy.value = true
  try {
    const body = { password: password.value }
    if (disabling) {
      await http.Post('/mfa/disable', body, FORM_REQUEST)
      password.value = ''
      closeView()
      notice.value = t('pachiProfile.security.mfa.disabledDone')
      await loadStatus(true)
    } else {
      const res = await http.Post<unknown>('/mfa/backup-codes/regenerate', body, FORM_REQUEST)
      password.value = ''
      backupCodes.value = parseBackupCodes(res)
      view.value = 'backup'
    }
  } catch (err) {
    await handleError(err, (kind, message) => {
      if (kind !== 'passwordIncorrect') return false
      passwordError.value = message
      return true
    })
  } finally {
    busy.value = false
  }
}

onMounted(() => { void loadStatus() })
</script>
