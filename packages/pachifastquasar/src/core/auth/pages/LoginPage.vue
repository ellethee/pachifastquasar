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
 * Pagina di login della shell. Personalizzabile con la prop `title` (default: titolo dell'app) e
 * lo slot `logo` (default: logo dell'app); per sostituirla del tutto: `config.components.loginPage`.
 */
withDefaults(
  defineProps<{
    /** titolo mostrato accanto al logo */
    title?: string | undefined
  }>(),
  { title: undefined }
)

const { t } = useI18n()
const username = ref('')
const password = ref('')
const mfaCode = ref('')
const loading = ref(false)
/** true durante il secondo step (codice MFA). */
const mfaStep = ref(false)
/** Errore inline del secondo step. */
const mfaError = ref('')
/** Avviso mostrato al primo step quando si torna indietro dal secondo (es. verifica scaduta). */
const mfaNotice = ref('')
/** true se l'avviso è solo informativo (es. account sbloccato), false se è un errore. */
const mfaNoticeInfo = ref(false)
/** Errore inline del primo step (credenziali non valide o errore generico). */
const loginError = ref('')
const authManager = AuthManager.getInstance()

/** Secondi rimasti allo sblocco dell'account (0 = nessun blocco in corso). */
const lockRemaining = ref(0)
/** Conto alla rovescia `mm:ss`. */
const lockTime = computed(() => formatCountdown(lockRemaining.value))
let lockTimer: ReturnType<typeof setInterval> | null = null
let lockEnd = 0
/** Chiamata allo scadere del blocco. */
let lockDone: (() => void) | null = null

/** Ferma il timer del conto alla rovescia (se attivo) e azzera il blocco. */
function stopLock(): void {
  if (lockTimer !== null) clearInterval(lockTimer)
  lockTimer = null
  lockDone = null
  lockRemaining.value = 0
}

/**
 * Avvia il conto alla rovescia live (aggiornato ogni secondo, calcolato sull'orologio per non
 * accumulare deriva); allo scadere ferma il timer e chiama `onDone`.
 *
 * @param seconds - secondi di attesa (da `Retry-After`)
 * @param onDone - azione da eseguire allo sblocco
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

/** Torna al primo step scartando la sfida MFA (la password non resta in pagina oltre il necessario). */
function backToLogin(): void {
  stopLock()
  authManager.cancelMfa()
  mfaStep.value = false
  mfaCode.value = ''
  mfaError.value = ''
  password.value = ''
}

/** Esegue il login (una sola richiesta alla volta); gli errori sono mostrati inline sotto i campi. */
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
    // errore già loggato da AuthManager; la richiesta non mostra il dialog (autoError false): messaggio inline
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
 * Secondo step: verifica il codice. Gli errori sono mostrati inline: codice errato (si riprova), troppi
 * tentativi o sfida scaduta (si torna al primo step).
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
      // con Retry-After (account bloccato) si resta qui col conto alla rovescia, poi si torna al login;
      // senza (sfida esaurita) si torna subito al login
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
 * Torna al primo step mostrando un avviso.
 *
 * @param notice - testo dell'avviso
 * @param info - true per un avviso informativo (non rosso), false (default) per un errore
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
