<template>
  <q-dialog
    ref="dialogRef"
    @hide="onDialogHide"
  >
    <div :class="['pachi-confirm-dialog', `pachi-confirm-dialog--${tone}`]">
      <!-- Top accent line -->
      <div class="pachi-confirm-dialog__accent" ></div>

      <div class="pachi-confirm-dialog__body">
        <div class="pachi-confirm-dialog__header">
          <div class="pachi-confirm-dialog__icon"><q-icon :name="mdiAlert" /></div>
          <div class="pachi-confirm-dialog__text">
            <div class="pachi-confirm-dialog__meta">{{ metaLabel ?? t('pachiUi.confirmDialog.meta') }}</div>
            <h3 class="pachi-confirm-dialog__title">{{ title }}</h3>
            <p class="pachi-confirm-dialog__desc">{{ description }}</p>
          </div>
        </div>

        <!-- Warning rail -->
        <div
          v-if="warning"
          class="pachi-confirm-dialog__warning"
        >
          <span class="pachi-confirm-dialog__warning-icon"><q-icon :name="mdiInformationOutline" /></span>
          <div class="pachi-confirm-dialog__warning-text">
            {{ warning }}
          </div>
        </div>

        <!-- Confirmation input -->
        <div class="pachi-confirm-dialog__confirm">
          <div class="pachi-confirm-dialog__confirm-label">
            {{ t('pachiUi.confirmDialog.typePrefix') }}
            <code class="pachi-confirm-dialog__confirm-word">{{ resolvedConfirmWord }}</code>
            {{ t('pachiUi.confirmDialog.typeSuffix') }}
          </div>
          <q-input
            v-model="confirmText"
            dense
            outlined
            autofocus
            :placeholder="t('pachiUi.confirmDialog.placeholder')"
            :aria-label="t('pachiUi.confirmDialog.inputLabel', { word: resolvedConfirmWord })"
            class="pachi-confirm-dialog__input"
            @keyup.enter="onConfirm"
          />
        </div>
      </div>

      <div class="pachi-confirm-dialog__footer">
        <div class="pachi-confirm-dialog__shortcut">
          <kbd>{{ t('pachiUi.confirmDialog.escKey') }}</kbd> {{ t('pachiUi.confirmDialog.escCancel') }}
        </div>
        <div class="pachi-confirm-dialog__footer-actions">
          <q-btn
            flat
            no-caps
            dense
            size="13px"
            :label="t('pachiUi.confirmDialog.cancel')"
            class="pachi-confirm-dialog__btn"
            @click="onDialogCancel"
          />
          <q-btn
            unelevated
            no-caps
            dense
            size="13px"
            :label="submitLabel ?? t('pachiUi.confirmDialog.submit')"
            :disable="!canSubmit"
            class="pachi-confirm-dialog__btn pachi-confirm-dialog__submit"
            @click="onConfirm"
          />
        </div>
      </div>
    </div>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useDialogPluginComponent } from 'quasar'
import { mdiAlert, mdiInformationOutline } from '@quasar/extras/mdi-v7'
import { usePachiI18n } from '@ilpachi/pachi-i18n'
import { matchesConfirmWord, resolveConfirmWord } from './helper/confirm-word'
import { messages } from './locales'

const props = withDefaults(defineProps<{
  title: string
  description: string
  warning?: string
  confirmWord?: string
  /** Text of the confirm button (default: the translated "Delete"): for non-destructive confirmations pass a suitable text. */
  submitLabel?: string
  /** Text of the line above the title (default: the translated "destructive action"). */
  metaLabel?: string
  /** Action tone: `danger` (default, red), `warning` (amber) or `info` (blue) for non-destructive confirmations. */
  tone?: 'danger' | 'warning' | 'info'
}>(), {
  warning: '',
  tone: 'danger',
})

defineEmits([...useDialogPluginComponent.emits])

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()

const { t } = usePachiI18n(messages)
const resolvedConfirmWord = computed(() => resolveConfirmWord(props.confirmWord, t('pachiUi.confirmDialog.confirmWord')))
const confirmText = ref('')
const canSubmit = computed(() => matchesConfirmWord(confirmText.value, resolvedConfirmWord.value))

function onConfirm() {
  if (canSubmit.value) onDialogOK()
}
</script>

<style lang="scss">
.pachi-confirm-dialog {
  // tone (red by default): the local variables follow `tone`
  --pachi-confirm-tone: var(--pachi-red);
  --pachi-confirm-tone-soft: var(--pachi-red-soft);
  --pachi-confirm-tone-border: var(--pachi-red-border, rgba(248, 113, 113, 0.2));
  --pachi-confirm-on-tone: var(--pachi-on-red, #fff);


  width: 440px;
  max-width: 100%;
  background: var(--pachi-surface);
  border: 1px solid var(--pachi-border-hi);
  border-radius: 14px;
  box-shadow: 0 24px 60px var(--pachi-shadow, rgba(0, 0, 0, 0.6)), 0 0 0 1px var(--pachi-shadow-edge, rgba(0, 0, 0, 0.4));
  overflow: hidden;

  &--warning {
    --pachi-confirm-tone: var(--pachi-amber);
    --pachi-confirm-tone-soft: var(--pachi-amber-soft);
    --pachi-confirm-tone-border: var(--pachi-amber-border, rgba(251, 191, 36, 0.33));
    --pachi-confirm-on-tone: var(--pachi-on-amber, #1a1a1a);
  }

  &--info {
    --pachi-confirm-tone: var(--pachi-blue);
    --pachi-confirm-tone-soft: var(--pachi-blue-soft);
    --pachi-confirm-tone-border: var(--pachi-blue-border, rgba(96, 165, 250, 0.33));
    --pachi-confirm-on-tone: var(--pachi-on-blue, #0b1220);
  }

  // Top accent: tone gradient
  &__accent {
    height: 3px;
    background: linear-gradient(90deg, transparent, var(--pachi-confirm-tone), transparent);
  }

  &__body {
    padding: 24px 24px 18px;
  }

  // Header: icon + text
  &__header {
    display: flex;
    align-items: flex-start;
    gap: 14px;
  }

  &__icon {
    width: 42px;
    height: 42px;
    border-radius: 10px;
    background: var(--pachi-confirm-tone-soft);
    color: var(--pachi-confirm-tone);
    border: 1px solid var(--pachi-confirm-tone-border);
    display: grid;
    place-items: center;
    font-size: 20px;
    flex-shrink: 0;
  }

  &__text {
    flex: 1;
    min-width: 0;
  }

  &__meta {
    font-family: var(--pachi-mono);
    font-size: 11px;
    color: var(--pachi-muted);
    letter-spacing: 0.06em;
  }

  &__title {
    margin: 2px 0 6px;
    font-family: var(--pachi-font);
    font-size: 17px;
    font-weight: 600;
    color: var(--pachi-ink);
    letter-spacing: -0.01em;
  }

  &__desc {
    margin: 0;
    font-family: var(--pachi-font);
    font-size: 13px;
    color: var(--pachi-muted);
    line-height: 1.5;
  }

  // Warning rail
  &__warning {
    margin-top: 18px;
    padding: 10px 14px;
    background: var(--pachi-amber-soft);
    border: 1px solid var(--pachi-amber-border, rgba(251, 191, 36, 0.33));
    border-radius: 7px;
    display: flex;
    gap: 10px;
    font-size: 11.5px;
    color: var(--pachi-ink-2);
    align-items: flex-start;
  }

  &__warning-icon {
    color: var(--pachi-amber);
    font-size: 13px;
    margin-top: 1px;
    flex-shrink: 0;
  }

  &__warning-text {
    flex: 1;
    line-height: 1.5;
    font-family: var(--pachi-font);
  }

  // Confirmation input
  &__confirm {
    margin-top: 14px;
  }

  &__confirm-label {
    font-family: var(--pachi-font);
    font-size: 11px;
    color: var(--pachi-muted);
    margin-bottom: 6px;
  }

  &__confirm-word {
    font-family: var(--pachi-mono);
    color: var(--pachi-confirm-tone);
    font-weight: 600;
    background: transparent;
    padding: 0;
    border: none;
  }

  &__input {
    .q-field__native {
      font-family: var(--pachi-mono);
      font-size: 13px;
    }
  }

  // Footer
  &__footer {
    padding: 12px 24px;
    border-top: 1px solid var(--pachi-border);
    background: var(--pachi-surface-2);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }

  &__shortcut {
    font-family: var(--pachi-mono);
    font-size: 10px;
    color: var(--pachi-faint);

    kbd {
      padding: 1px 5px;
      border: 1px solid var(--pachi-border);
      border-radius: 3px;
      background: var(--pachi-surface);
      font-family: var(--pachi-mono);
    }
  }

  &__btn {
    height: 32px;
    padding: 0 14px;
  }

  &__submit {
    background: var(--pachi-confirm-tone);
    color: var(--pachi-confirm-on-tone);
  }

  &__footer-actions {
    display: flex;
    gap: 8px;
  }
}
</style>
