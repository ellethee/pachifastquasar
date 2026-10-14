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

      <!-- Codici di backup appena generati (regenerate / email) -->
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

      <!-- Conferma MFA via email: il codice è stato inviato al passo precedente -->
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

      <!-- MFA via SMS, passo 1: numero di telefono -->
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

      <!-- MFA via SMS, passo 2: codice ricevuto -->
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

      <!-- Password per disattivare / rigenerare -->
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

      <!-- Vista iniziale -->
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
 * Pannello MFA del profilo. Compare solo se `GET {apiBase}/mfa/status` risponde 2xx (404/403/errori: nessuna
 * sezione e nessun dialog). Permette di attivare TOTP (QR code, chiave, backup code, conferma del codice),
 * email o SMS, di rigenerare i backup code e di disattivare l'MFA (con la password).
 */
const props = withDefaults(defineProps<{
  /** Base URL delle API (default `/api`). */
  apiBase?: string
  /** Metodi offerti per l'attivazione. */
  methods?: PachiMfaMethod[]
}>(), {
  apiBase: DEFAULT_API_BASE,
  methods: () => ['totp'],
})

const { t } = usePachiI18n(messages)
const http = resolvePachiProfileHttp(props.apiBase)
const countdown = useRetryCountdown()
/** Pausa tra due invii di codice email/SMS (30 s dopo ogni invio, `Retry-After` su 429). */
const sendCooldown = useRetryCountdown()
const resendLabel = computed(() =>
  sendCooldown.active.value
    ? t('pachiProfile.security.mfa.resendIn', { time: sendCooldown.text.value })
    : t('pachiProfile.security.mfa.resend'),
)

type View = 'idle' | 'totp' | 'email' | 'smsPhone' | 'sms' | 'backup' | 'disable' | 'regenerate'

/** Metodi offerti (default solo TOTP). */
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
 * Etichetta del metodo MFA attivo.
 *
 * @param method - `totp`, `email` o altro
 */
function methodLabel(method: string): string {
  return ['totp', 'email', 'sms'].includes(method) ? t(`pachiProfile.security.mfa.methods.${method}`) : method
}

/** Azzera messaggi e campi sensibili. */
function resetMessages(): void {
  error.value = ''
  notice.value = ''
  locked.value = false
  codeError.value = ''
  passwordError.value = ''
  phoneError.value = ''
}

/**
 * Apre una vista (azzerando campi e messaggi).
 *
 * @param next - vista da mostrare
 */
function openView(next: View): void {
  resetMessages()
  code.value = ''
  password.value = ''
  if (next === 'idle' || next === 'smsPhone') phone.value = ''
  view.value = next
}

/** Torna alla vista iniziale e scarta i dati del setup (secret e codici non restano in memoria). */
function closeView(): void {
  openView('idle')
  totp.value = null
  confirmed.value = false
  backupCodes.value = []
}

/** Legge lo stato MFA; se non disponibile la sezione resta nascosta (nessun errore mostrato). */
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
 * Copia un testo negli appunti (senza mai loggarlo).
 *
 * @param text - testo da copiare
 */
async function copy(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text)
    notice.value = t('pachiProfile.security.mfa.copied')
  } catch {
    // appunti non disponibili (contesto non sicuro o permesso negato): si avvisa, l'utente può selezionare il testo a mano
    notice.value = t('pachiProfile.security.mfa.copyFailed')
  }
}

/**
 * Mostra un errore di una richiesta MFA: 429 con avviso di blocco, 409 con ricarica dello stato.
 *
 * @param err - errore lanciato dalla richiesta
 * @param onField - gestione opzionale dell'errore su un campo (per `codeInvalid`/`passwordIncorrect`)
 * @param isSend - `true` per l'invio di un codice email/SMS: un 429 è la pausa tra invii, non un blocco
 */
async function handleError(
  err: unknown,
  onField?: (kind: ReturnType<typeof classifyMfaError>, message: string) => boolean,
  isSend = false,
): Promise<void> {
  const parsed = await parseApiError(err)
  if (isSend && isSendRateLimited(parsed)) {
    // pausa tra due invii: pulsante di reinvio disattivato per Retry-After (ripiego 30 s)
    sendCooldown.start(sendCooldownSeconds(parsed))
    error.value = translateApiError(parsed, t)
    return
  }
  const kind = classifyMfaError(parsed)
  if (kind === 'tooManyAttempts' && parsed.retryAfter !== undefined) {
    // account bloccato con tempo noto: conto alla rovescia al posto del messaggio generico
    countdown.start(parsed.retryAfter)
    return
  }
  const message = translateApiError(parsed, t)
  if (kind === 'tooManyAttempts') locked.value = true
  if (kind === 'mfaDisabled') {
    // MFA spenta sul server (`MFA_ENABLED=false`): la sezione non ha più senso
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

/** Avvia il setup TOTP. */
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

/** Conferma il setup TOTP con il codice a 6 cifre. */
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
 * Primo passo dell'MFA via email: il backend invia il codice all'indirizzo dell'utente e lascia il metodo inattivo
 * finché non è confermato. Con un backend precedente (setup che attiva subito e restituisce i backup code) si
 * mostrano direttamente i codici.
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

/** Secondo passo: conferma l'MFA via email con il codice ricevuto e mostra gli eventuali backup code. */
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
        // setup scaduto o mai avviato: si torna all'inizio e si invia di nuovo il codice
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
 * Primo passo dell'MFA via SMS: il backend invia il codice al numero indicato e lascia il metodo inattivo finché
 * non è confermato. Dal secondo invio («Invia di nuovo il codice») il numero resta quello già digitato.
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
      // un backend che attiva subito il metodo: si mostrano i backup code, se ci sono
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

/** Secondo passo: conferma l'MFA via SMS con il codice ricevuto e mostra gli eventuali backup code. */
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
        // setup scaduto o mai avviato: si torna al numero di telefono
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

/** Disattiva l'MFA o rigenera i backup code, in base alla vista, chiedendo la password. */
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
