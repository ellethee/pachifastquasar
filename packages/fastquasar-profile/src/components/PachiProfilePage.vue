<template>
  <div v-if="!user" class="pachi-profile-layout" aria-busy="true">
    <!-- Skeleton mostrato finché `user` non è disponibile -->
    <div class="pachi-profile-identity">
      <div class="pachi-profile-skeleton pachi-profile-skeleton--avatar"></div>
      <div class="pachi-profile-skeleton pachi-profile-skeleton--line"></div>
      <div class="pachi-profile-skeleton pachi-profile-skeleton--line pachi-profile-skeleton--short"></div>
    </div>
    <div class="pachi-profile-form">
      <div class="pachi-profile-section-head">
        <span>{{ t('pachiProfile.personalInfo') }}</span>
      </div>
      <div class="pachi-profile-form__fields">
        <div v-for="n in 4" :key="n" class="pachi-profile-skeleton pachi-profile-skeleton--field"></div>
      </div>
    </div>
  </div>
  <div v-else class="pachi-profile-layout">
    <!-- Identity card -->
    <div class="pachi-profile-identity">
      <div class="pachi-profile-identity__glow"></div>

      <div class="pachi-profile-identity__avatar-wrap">
        <div class="pachi-profile-identity__avatar">
          <slot
            name="avatar"
            :user="user"
            :initials="initials"
          >
            <img
              v-if="avatarUrl && !avatarFailed"
              :src="avatarUrl"
              :alt="initials"
              class="pachi-profile-identity__avatar-img"
              @error="avatarFailed = true"
            >
            <template v-else>{{ initials }}</template>
          </slot>
        </div>
      </div>

      <div class="pachi-profile-identity__name">{{ user.firstName }} {{ user.lastName }}</div>
      <div class="pachi-profile-identity__id">{{ t('pachiProfile.userId') }} · #{{ user.id }}</div>

      <div class="pachi-profile-identity__badges">
        <span
          v-if="user.isActive"
          class="pachi-profile-badge pachi-profile-badge--active"
        >● {{ t('pachiProfile.active') }}</span>
        <span
          v-if="user.isStaff"
          class="pachi-profile-badge pachi-profile-badge--staff"
        >● {{ t('pachiProfile.staff') }}</span>
        <span
          v-if="user.isSuperuser"
          class="pachi-profile-badge pachi-profile-badge--superuser"
        >● {{ t('pachiProfile.superuser') }}</span>
        <span
          v-if="user.emailVerifiedAt"
          class="pachi-profile-badge pachi-profile-badge--verified"
        >● {{ t('pachiProfile.emailVerified') }}</span>
      </div>

      <div class="pachi-profile-identity__meta">
        <div class="pachi-profile-identity__meta-item">
          <div class="pachi-profile-identity__meta-label">{{ t('pachiProfile.lastLogin') }}</div>
          <div class="pachi-profile-identity__meta-value">{{ lastLoginText ?? t('pachiProfile.none') }}</div>
        </div>
        <div class="pachi-profile-identity__meta-item">
          <div class="pachi-profile-identity__meta-label">{{ t('pachiProfile.memberSince') }}</div>
          <div class="pachi-profile-identity__meta-value">{{ memberSinceText ?? t('pachiProfile.none') }}</div>
        </div>
      </div>
    </div>

    <!-- Form card -->
    <div class="pachi-profile-form">
      <div class="pachi-profile-section-head">
        <span>{{ t('pachiProfile.personalInfo') }}</span>
        <q-btn
          v-if="canEdit && !editing"
          flat
          dense
          no-caps
          :icon="mdiPencil"
          :label="t('pachiProfile.edit.edit')"
          @click="startEdit"
        />
      </div>
      <div v-if="notice" class="pachi-profile-sec-banner pachi-profile-sec-banner--ok" role="status" aria-live="polite">
        {{ notice }}
      </div>
      <pachi-profile-edit-form
        v-if="editing"
        :user="user"
        :api-base="editOptions.apiBase"
        @updated="onUpdated"
        @cancel="editing = false"
      />
      <div v-else class="pachi-profile-form__fields">
        <q-input
          :model-value="user.firstName"
          :label="t('pachiProfile.firstName')"
          outlined
          dense
          disable
        />
        <q-input
          :model-value="user.lastName"
          :label="t('pachiProfile.lastName')"
          outlined
          dense
          disable
        />
        <div class="pachi-profile-form__full">
          <q-input
            :model-value="user.username"
            :label="t('pachiProfile.username')"
            outlined
            dense
            disable
          >
            <template #append>
              <q-icon
                :name="mdiLock"
                size="xs"
                color="grey"
              />
            </template>
          </q-input>
        </div>
        <div class="pachi-profile-form__full">
          <q-input
            :model-value="user.email ?? ''"
            :label="t('pachiProfile.email')"
            outlined
            dense
            disable
          />
        </div>
      </div>
    </div>

    <!-- Sicurezza: cambio password e MFA -->
    <pachi-profile-security :security="security ?? true" @password-changed="emit('password-changed')" />
  </div>
</template>

<script setup lang="ts">
import { mdiLock, mdiPencil } from '@quasar/extras/mdi-v7'
import { computed, inject, ref, watch } from 'vue'
import { usePachiI18n } from '@ilpachi/pachi-i18n'
import type { IPachiProfileUser } from '../types/profile'
import type { IPachiProfileEditOptions } from '../types/edit'
import type { IPachiProfileSecurityOptions } from '../types/security'
import PachiProfileEditForm from './PachiProfileEditForm.vue'
import PachiProfileSecurity from './PachiProfileSecurity.vue'
import { messages } from '../locales'
import { getInitials } from '../helpers/initials'
import { resolveProfileDate } from '../helpers/format-date'
import { resolveEditOptions } from '../helpers/edit-options'
import '../styles/security.scss'

/**
 * Pagina profilo utente (sola lettura). L'utente e l'eventuale avatar sono iniettati dall'app.
 */
const props = withDefaults(defineProps<{
  /** Utente corrente da mostrare; se `null`/`undefined` (es. in caricamento) si mostra uno skeleton. */
  user?: IPachiProfileUser | null
  /** Testo per "Ultimo accesso"; se assente si usa `user.lastLoginAt` formattato (altrimenti "—"). */
  lastLogin?: string
  /** Testo per "Account dal"; se assente si usa `user.createdAt` formattato (altrimenti "—"). */
  memberSince?: string
  /**
   * Sezione «Sicurezza»: `false` la nasconde; un oggetto sceglie i blocchi (`password`, `mfa`) e le opzioni
   * (`minPasswordLength`, `apiBase`, `mfaMethods`, `onPasswordChanged`). Default: solo il cambio password.
   */
  security?: boolean | IPachiProfileSecurityOptions
  /**
   * Modifica di nome, cognome ed email (`PATCH /auth/user`): `true` mostra il pulsante «Modifica»; un oggetto
   * ne imposta le opzioni (`apiBase`, `onUpdated`). Default `false` (pagina in sola lettura).
   */
  editable?: boolean | IPachiProfileEditOptions
}>(), {
  security: true,
  editable: false,
})

const emit = defineEmits<{
  /** Password cambiata: la shell (`pachiLogout`) o l'app devono fare logout e nuovo login. */
  (e: 'password-changed'): void
  /** Profilo modificato: `user` è la risposta del backend; l'app deve aggiornare la propria copia dell'utente. */
  (e: 'updated', user: IPachiProfileUser): void
}>()

const { t, locale } = usePachiI18n(messages)

defineSlots<{
  /** Avatar dell'utente (es. Gravatar). Default: iniziali. */
  avatar?: (props: { user: IPachiProfileUser | null | undefined, initials: string }) => unknown
}>()

const editOptions = computed(() => resolveEditOptions(props.editable))
const canEdit = computed(() => editOptions.value.enabled)
const editing = ref(false)
const notice = ref('')

/** Apre il form di modifica. */
function startEdit(): void {
  notice.value = ''
  editing.value = true
}

/**
 * Profilo salvato: chiude il form, avvisa l'app (`onUpdated` e evento `updated`).
 *
 * @param updated - utente restituito dal backend
 */
async function onUpdated(updated: IPachiProfileUser): Promise<void> {
  editing.value = false
  notice.value = t('pachiProfile.edit.saved')
  emit('updated', updated)
  await editOptions.value.onUpdated?.(updated)
}

const initials = computed(() => getInitials(props.user))

/**
 * Avatar: la shell (`@ilpachi/pachifastquasar`, `createPachiApp`) fornisce con `provide('pachiAvatarUrl', ...)`
 * una funzione `(email, size) => Promise<string | null>` (Gravatar, o `null` se disattivato). Senza, o se
 * l'immagine non esiste (Gravatar `d=404`), restano le iniziali.
 */
const resolveAvatar = inject<
  ((email: string | null | undefined, size?: number) => Promise<string | null>) | null
>('pachiAvatarUrl', null)
const avatarUrl = ref<string | null>(null)
const avatarFailed = ref(false)

watch(
  () => props.user?.email,
  async (email) => {
    avatarFailed.value = false
    avatarUrl.value = null
    if (!resolveAvatar || !email) return
    try {
      avatarUrl.value = await resolveAvatar(email, 216)
    } catch {
      avatarUrl.value = null
    }
  },
  { immediate: true }
)

const lastLoginText = computed(() =>
  resolveProfileDate(props.lastLogin, props.user?.lastLoginAt, locale.value, { withTime: true }))

const memberSinceText = computed(() =>
  resolveProfileDate(props.memberSince, props.user?.createdAt, locale.value))
</script>

<style lang="scss">
.pachi-profile-layout {
  max-width: 1080px;
  margin: 0 auto;
  width: 100%;
  display: grid;
  grid-template-columns: 340px 1fr;
  gap: 16px;
  padding: 16px;
  // il layout della shell è alto un viewport e non scrolla: la pagina scrolla da sé entro lo spazio utile
  // (`--pachi-page-height` è definita dalla shell; senza, nessun limite)
  max-height: var(--pachi-page-height, none);
  overflow-y: auto;
  align-content: start;
}

// ── Identity card ─────────────────────────────────────────────────────────────
.pachi-profile-identity {
  background: var(--pachi-surface);
  border: 1px solid var(--pachi-border);
  border-radius: var(--pachi-card-r);
  padding: 28px 22px;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;

  &__glow {
    position: absolute;
    top: -40px;
    left: 50%;
    transform: translateX(-50%);
    width: 240px;
    height: 240px;
    border-radius: 50%;
    background: radial-gradient(circle, color-mix(in srgb, var(--pachi-accent) 10%, transparent), transparent 70%);
    pointer-events: none;
  }

  &__avatar-wrap {
    position: relative;
    z-index: 1;
  }

  &__avatar {
    width: 108px;
    height: 108px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--pachi-accent), var(--pachi-accent-deep));
    display: grid;
    place-items: center;
    font-size: 38px;
    font-weight: 600;
    color: var(--pachi-bg);
    letter-spacing: -0.02em;
    box-shadow:
      0 0 0 4px var(--pachi-surface),
      0 0 0 5px var(--pachi-border),
      0 12px 32px color-mix(in srgb, var(--pachi-accent) 20%, transparent);
    overflow: hidden;
  }

  &__avatar-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  &__name {
    margin-top: 18px;
    font-family: var(--pachi-font);
    font-size: 18px;
    font-weight: 600;
    color: var(--pachi-ink);
    position: relative;
    z-index: 1;
  }

  &__id {
    font-family: var(--pachi-mono);
    font-size: 11px;
    color: var(--pachi-muted);
    margin-top: 3px;
    position: relative;
    z-index: 1;
  }

  &__badges {
    display: flex;
    gap: 6px;
    margin-top: 14px;
    flex-wrap: wrap;
    justify-content: center;
    position: relative;
    z-index: 1;
  }

  &__meta {
    width: 100%;
    margin-top: 24px;
    padding-top: 18px;
    border-top: 1px solid var(--pachi-border);
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    text-align: left;
    position: relative;
    z-index: 1;
  }

  &__meta-label {
    font-size: 10px;
    color: var(--pachi-muted);
    letter-spacing: 0.06em;
    text-transform: uppercase;
    font-weight: 600;
  }

  &__meta-value {
    font-family: var(--pachi-mono);
    font-size: 12px;
    color: var(--pachi-ink);
    margin-top: 3px;
  }
}

// Badges colorati
.pachi-profile-badge {
  padding: 3px 9px;
  font-size: 10.5px;
  font-weight: 600;
  border-radius: 11px;

  &--active {
    background: color-mix(in srgb, var(--pachi-green) 12%, transparent);
    color: var(--pachi-green);
    border: 1px solid color-mix(in srgb, var(--pachi-green) 30%, transparent);
  }

  &--staff {
    background: var(--pachi-amber-soft);
    color: var(--pachi-amber);
    border: 1px solid color-mix(in srgb, var(--pachi-amber) 33%, transparent);
  }

  &--verified {
    background: color-mix(in srgb, var(--pachi-blue) 12%, transparent);
    color: var(--pachi-blue);
    border: 1px solid color-mix(in srgb, var(--pachi-blue) 30%, transparent);
  }

  &--superuser {
    background: color-mix(in srgb, var(--pachi-violet, #a78bfa) 14%, transparent);
    color: var(--pachi-violet, #a78bfa);
    border: 1px solid color-mix(in srgb, var(--pachi-violet, #a78bfa) 33%, transparent);
  }
}

// ── Form card ─────────────────────────────────────────────────────────────────
.pachi-profile-form {
  background: var(--pachi-surface);
  border: 1px solid var(--pachi-border);
  border-radius: var(--pachi-card-r);
  overflow: hidden;
}

.pachi-profile-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  border-bottom: 1px solid var(--pachi-border);
  background: var(--pachi-surface-2);
  font-family: var(--pachi-font);
  font-size: 13px;
  font-weight: 600;
  color: var(--pachi-ink);
}

.pachi-profile-form__fields {
  padding: 22px 24px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.pachi-profile-form__full {
  grid-column: span 2;
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
.pachi-profile-skeleton {
  border-radius: 6px;
  background: linear-gradient(90deg, var(--pachi-surface-2), var(--pachi-surface-3), var(--pachi-surface-2));
  background-size: 200% 100%;
  animation: pachi-profile-shimmer 1.4s infinite;

  &--avatar {
    width: 108px;
    height: 108px;
    border-radius: 50%;
  }

  &--line {
    width: 60%;
    height: 16px;
    margin-top: 16px;
  }

  &--short {
    width: 40%;
  }

  &--field {
    height: 40px;
  }
}

@keyframes pachi-profile-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

// ── Responsive: una colonna sotto i 760px ─────────────────────────────────────
@media (max-width: 760px) {
  .pachi-profile-layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .pachi-profile-form__fields {
    grid-template-columns: minmax(0, 1fr);
    padding: 18px 16px;
  }

  .pachi-profile-form__full {
    grid-column: auto;
  }
}
</style>
