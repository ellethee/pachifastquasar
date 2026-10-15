<template>
  <div class="pachi-login-bg">
    <!-- Blueprint grid -->
    <div class="pachi-login-bg__grid"></div>
    <!-- Teal glow -->
    <div class="pachi-login-bg__glow"></div>

    <!-- Top-left wordmark -->
    <div class="pachi-login-wordmark">
      <slot name="logo">
        <pachi-logo class="text-primary" />
      </slot>
      <span class="pachi-login-wordmark__text">{{ title ?? appConfig.app.title }}</span>
    </div>

    <!-- Top-right theme toggle -->
    <toggle-theme-button class="pachi-login-theme-btn" />

    <!-- Login card -->
    <div class="pachi-login-card">
      <div class="pachi-login-card__accent"></div>

      <div class="pachi-login-card__meta">{{ t('auth.login.meta') }}</div>
      <h1 class="pachi-login-card__title">
        {{ mfaStep ? t('auth.mfa.heading') : t('auth.login.heading') }}
      </h1>
      <p class="pachi-login-card__subtitle">
        {{ mfaStep ? t('auth.mfa.subtitle') : t('auth.login.subtitle') }}
      </p>

      <q-form v-if="!mfaStep" @submit.prevent="tryLogin">
        <div class="pachi-login-card__fields">
          <q-input
            v-model="username"
            :label="t('auth.login.username')"
            autocomplete="username"
            :disable="loading"
            outlined
            dense
            class="pachi-login-card__input"
          />
          <q-input
            v-model="password"
            :label="t('auth.login.password')"
            type="password"
            autocomplete="current-password"
            :disable="loading"
            outlined
            dense
            class="pachi-login-card__input"
          />
        </div>
        <p v-if="lockRemaining > 0" class="pachi-login-card__error" role="alert">
          {{ t('auth.lock.countdown', { time: lockTime }) }}
        </p>
        <p v-else-if="loginError" class="pachi-login-card__error" role="alert">{{ loginError }}</p>
        <p
          v-else-if="mfaNotice"
          :class="mfaNoticeInfo ? 'pachi-login-card__notice' : 'pachi-login-card__error'"
          :role="mfaNoticeInfo ? 'status' : 'alert'"
        >
          {{ mfaNotice }}
        </p>

        <q-btn
          type="submit"
          unelevated
          no-caps
          color="primary"
          class="pachi-login-card__btn"
          :loading="loading"
          :disable="!username || !password || loading || lockRemaining > 0"
        >
          {{ t('auth.login.submit') }}
          <kbd class="pachi-login-card__kbd">⏎</kbd>
        </q-btn>
      </q-form>

      <q-form v-else @submit.prevent="tryVerify">
        <div class="pachi-login-card__fields">
          <q-input
            v-model="mfaCode"
            :label="t('auth.mfa.code')"
            autocomplete="one-time-code"
            inputmode="text"
            autofocus
            :disable="loading || lockRemaining > 0"
            outlined
            dense
            class="pachi-login-card__input"
          />
        </div>
        <p v-if="lockRemaining > 0" class="pachi-login-card__error" role="alert">
          {{ t('auth.lock.countdown', { time: lockTime }) }}
        </p>
        <p v-else-if="mfaError" class="pachi-login-card__error" role="alert">{{ mfaError }}</p>

        <q-btn
          type="submit"
          unelevated
          no-caps
          color="primary"
          class="pachi-login-card__btn"
          :loading="loading"
          :disable="!mfaCode.trim() || loading || lockRemaining > 0"
        >
          {{ t('auth.mfa.verify') }}
          <kbd class="pachi-login-card__kbd">⏎</kbd>
        </q-btn>
        <q-btn
          flat
          no-caps
          class="pachi-login-card__back"
          :disable="loading"
          :label="t('auth.mfa.back')"
          @click="backToLogin"
        />
      </q-form>

      <div class="pachi-login-card__footer">
        <span class="pachi-login-card__footer-help">{{ t('auth.login.help') }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { AuthManager, getErrorCode } from '../../../services/auth-manager/auth-manager'
import { formatCountdown, retryAfterFromError } from '../../../helpers/retry-after'
import { getPachiConfig } from '../../config'
import ToggleThemeButton from '../../components/ToggleThemeButton.vue'
import PachiLogo from '../../components/PachiLogo.vue'

const appConfig = getPachiConfig()

/**
 * Shell login page. Customizable with the `title` prop (default: app title) and
 * the `logo` slot (default: app logo); to replace it entirely: `config.components.loginPage`.
 */
withDefaults(
  defineProps<{
    /** title shown next to the logo */
    title?: string | undefined
  }>(),
  { title: undefined }
)

const { t } = useI18n()
const username = ref('')
const password = ref('')
const mfaCode = ref('')
const loading = ref(false)
/** true during the second step (MFA code). */
const mfaStep = ref(false)
/** Inline error of the second step. */
const mfaError = ref('')
/** Notice shown at the first step when going back from the second (e.g. expired verification). */
const mfaNotice = ref('')
/** true if the notice is informational only (e.g. account unlocked), false if it is an error. */
const mfaNoticeInfo = ref(false)
/** Inline error of the first step (invalid credentials or generic error). */
const loginError = ref('')
const authManager = AuthManager.getInstance()

/** Seconds left until the account is unlocked (0 = no lock in progress). */
const lockRemaining = ref(0)
/** `mm:ss` countdown. */
const lockTime = computed(() => formatCountdown(lockRemaining.value))
let lockTimer: ReturnType<typeof setInterval> | null = null
let lockEnd = 0
/** Called when the lock expires. */
let lockDone: (() => void) | null = null

/** Stops the countdown timer (if active) and clears the lock. */
function stopLock(): void {
  if (lockTimer !== null) clearInterval(lockTimer)
  lockTimer = null
  lockDone = null
  lockRemaining.value = 0
}

/**
 * Starts the live countdown (updated every second, computed from the clock to avoid
 * accumulating drift); when it expires it stops the timer and calls `onDone`.
 *
 * @param seconds - seconds to wait (from `Retry-After`)
 * @param onDone - action to run on unlock
 */
function startLock(seconds: number, onDone: () => void): void {
  stopLock()
  if (seconds <= 0) {
    onDone()
    return
  }
  lockEnd = Date.now() + seconds * 1000
  lockRemaining.value = seconds
  lockDone = onDone
  lockTimer = setInterval(() => {
    const left = Math.ceil((lockEnd - Date.now()) / 1000)
    if (left > 0) {
      lockRemaining.value = left
      return
    }
    const done = lockDone
    stopLock()
    done?.()
  }, 1000)
}

onBeforeUnmount(stopLock)

/** Goes back to the first step discarding the MFA challenge (the password does not stay on the page longer than needed). */
function backToLogin(): void {
  stopLock()
  authManager.cancelMfa()
  mfaStep.value = false
  mfaCode.value = ''
  mfaError.value = ''
  password.value = ''
}

/** Performs the login (one request at a time); errors are shown inline below the fields. */
async function tryLogin(): Promise<void> {
  if (loading.value || lockRemaining.value > 0 || !username.value || !password.value) return
  loading.value = true
  mfaNotice.value = ''
  loginError.value = ''
  try {
    const result = await authManager.login(username.value, password.value)
    if (result.mfaRequired) {
      mfaStep.value = true
      mfaCode.value = ''
      mfaError.value = ''
    }
  } catch (error: unknown) {
    // error already logged by AuthManager; the request does not show the dialog (autoError false): inline message
    const status = (error as { status?: number } | null)?.status
    if (status === 429) {
      const wait = retryAfterFromError(error)
      if (wait) startLock(wait, () => {})
      else loginError.value = t('errors.http.tooManyRequests')
    } else if (status === 401) {
      loginError.value = t('auth.login.invalidCredentials')
    } else {
      loginError.value = t('errors.http.generic')
    }
  } finally {
    loading.value = false
  }
}

/**
 * Second step: verifies the code. Errors are shown inline: wrong code (retry), too many
 * attempts or expired challenge (back to the first step).
 */
async function tryVerify(): Promise<void> {
  if (loading.value || !mfaCode.value.trim()) return
  loading.value = true
  mfaError.value = ''
  try {
    await authManager.verifyMfa(mfaCode.value)
  } catch (error: unknown) {
    const status = (error as { status?: number } | null)?.status
    const code = await getErrorCode(error)
    if (status === 429 || code === 'mfa.too_many_attempts') {
      const wait = retryAfterFromError(error)
      // with Retry-After (account locked) we stay here with the countdown, then go back to login;
      // without it (challenge exhausted) we go back to login immediately
      if (wait) startLock(wait, () => leaveWith(t('auth.mfa.unlocked'), true))
      else leaveWith(t('auth.mfa.tooManyAttempts'))
    } else if (!authManager.hasPendingMfa) {
      leaveWith(t('auth.mfa.expired'))
    } else if (code === 'mfa.code_invalid' || code === 'mfa.totp_invalid') {
      mfaError.value = t('auth.mfa.codeInvalid')
      mfaCode.value = ''
    } else {
      mfaError.value = t('errors.http.generic')
    }
  } finally {
    loading.value = false
  }
}

/**
 * Goes back to the first step showing a notice.
 *
 * @param notice - notice text
 * @param info - true for an informational notice (not red), false (default) for an error
 */
function leaveWith(notice: string, info = false): void {
  backToLogin()
  mfaNotice.value = notice
  mfaNoticeInfo.value = info
}
</script>

<style lang="scss">
.pachi-login-bg {
  width: 100%;
  height: 100%;
  min-height: 100vh;
  background: var(--pachi-bg);
  color: var(--pachi-ink);
  font-family: var(--pachi-font);
  display: grid;
  place-items: center;
  position: relative;
  overflow: hidden;

  &__grid {
    position: absolute;
    inset: 0;
    pointer-events: none;
    opacity: 0.35;
    background-image:
      linear-gradient(var(--pachi-border) 1px, transparent 1px),
      linear-gradient(90deg, var(--pachi-border) 1px, transparent 1px);
    background-size: 40px 40px;
    mask-image: radial-gradient(circle at center, black, transparent 75%);
  }

  &__glow {
    position: absolute;
    inset: 0;
    pointer-events: none;
    opacity: 0.5;
    background: radial-gradient(800px 400px at 50% 60%, rgb(45 212 191 / 7%), transparent 60%);
  }
}

.pachi-login-wordmark {
  position: absolute;
  top: 28px;
  left: 32px;
  display: flex;
  align-items: center;
  gap: 10px;

  &__text {
    font-size: 14px;
    font-weight: 600;
    color: var(--pachi-ink);
    letter-spacing: -0.01em;
  }
}

.pachi-login-theme-btn {
  position: absolute !important;
  top: 28px;
  right: 32px;
}

.pachi-login-card {
  width: 420px;
  padding: 36px 36px 28px;
  position: relative;
  background: var(--pachi-surface);
  border: 1px solid var(--pachi-border);
  border-radius: 14px;
  box-shadow:
    0 20px 60px rgb(0 0 0 / 45%),
    0 0 0 1px var(--pachi-border-hi);

  // Top accent line
  &__accent {
    position: absolute;
    top: -1px;
    left: 24px;
    right: 24px;
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--pachi-accent), transparent);
  }

  &__meta {
    font-family: var(--pachi-mono);
    font-size: 11px;
    color: var(--pachi-muted);
    letter-spacing: 0.06em;
    margin-bottom: 6px;
  }

  &__title {
    margin: 0;
    font-size: 22px;
    font-weight: 600;
    letter-spacing: -0.02em;
    color: var(--pachi-ink);
  }

  &__subtitle {
    margin: 4px 0 26px;
    font-size: 13px;
    color: var(--pachi-muted);
  }

  &__fields {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  &__input {
    // No rounded — global quasar-hacks handle 7px radius
  }

  &__btn {
    width: 100%;
    height: 40px;
    margin-top: 22px;
    font-size: 13px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }

  &__kbd {
    font-family: var(--pachi-mono);
    font-size: 10px;
    padding: 1px 5px;
    background: rgb(10 13 18 / 20%);
    border-radius: 3px;
    border: none;
    color: inherit;
    cursor: default;
  }

  &__error {
    margin: 12px 0 0;
    font-size: 12px;
    color: var(--q-negative);
  }

  &__notice {
    margin: 12px 0 0;
    font-size: 12px;
    color: var(--q-info, var(--pachi-muted));
  }

  &__back {
    width: 100%;
    margin-top: 8px;
    font-size: 13px;
  }

  &__footer {
    margin-top: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__footer-help {
    font-size: 11px;
    color: var(--pachi-muted);
  }
}
</style>
