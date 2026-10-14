<template>
  <div class="pachi-admin">
    <aside class="pachi-admin__models" :aria-label="t('pachiAdmin.models.title')">
      <div class="pachi-admin__models-title">{{ t('pachiAdmin.models.title') }}</div>
      <div v-if="loading" class="pachi-admin-state pachi-admin-state--small">
        <q-spinner size="20px" color="primary" />
      </div>
      <template v-else>
        <button
          v-for="m in models"
          :key="`${m.app}.${m.model}`"
          type="button"
          class="pachi-admin__model"
          :class="{ 'pachi-admin__model--active': isActive(m) }"
          :aria-current="isActive(m) ? 'page' : undefined"
          @click="select(m)"
        >
          <span class="pachi-admin__model-name">{{ modelTitle(m) }}</span>
          <span class="pachi-admin__model-app">{{ m.app }}</span>
        </button>
      </template>
    </aside>

    <section class="pachi-admin__main">
      <pachi-admin-model-view v-if="routeSelection" :key="`${routeSelection.app}.${routeSelection.model}`" :app="routeSelection.app" :model="routeSelection.model" />
      <div v-else-if="loading" class="pachi-admin-state">
        <q-spinner size="32px" color="primary" />
        <div>{{ t('pachiAdmin.models.loading') }}</div>
      </div>
      <div v-else-if="errorText" class="pachi-admin-state" role="alert">
        <q-icon :name="mdiAlertCircleOutline" size="40px" color="negative" />
        <div class="pachi-admin-state__title">{{ errorText }}</div>
        <q-btn flat no-caps type="button" color="primary" :label="t('pachiAdmin.common.retry')" @click="loadModels(true)" />
      </div>
      <div v-else-if="!models.length" class="pachi-admin-state">
        <q-icon :name="mdiShieldOffOutline" size="40px" color="grey" />
        <div class="pachi-admin-state__title">{{ t('pachiAdmin.models.empty') }}</div>
        <div>{{ t('pachiAdmin.models.emptyDesc') }}</div>
      </div>
      <div v-else class="pachi-admin-state">
        <div class="pachi-admin-state__title">{{ t('pachiAdmin.models.select') }}</div>
        <div>{{ t('pachiAdmin.models.selectDesc') }}</div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { mdiAlertCircleOutline, mdiShieldOffOutline } from '@quasar/extras/mdi-v7'
import { computed, getCurrentInstance, onMounted, ref, watch } from 'vue'
import { usePachiI18n } from '@ilpachi/pachi-i18n'
import type { IAdminModelInfo } from '../types/admin'
import PachiAdminModelView from './PachiAdminModelView.vue'
import { messages } from '../locales'
import { fetchAdminModels, setAdminModels, visibleModels } from '../helpers/models-state'
import { modelTitle } from '../helpers/schema-text'
import { describeRequestError, provideAdminApi } from '../helpers/use-admin'

/**
 * Pagina Admin: elenco dei modelli visibili a sinistra, vista del modello selezionato a destra.
 * La selezione segue la route (`/admin/:app/:model`, passata come props) o, senza router, lo stato locale.
 */
const props = withDefaults(defineProps<{
  /** App del modello selezionato (parametro di route). */
  app?: string | undefined
  /** Modello selezionato (parametro di route). */
  model?: string | undefined
  /** Prefisso delle route per la navigazione. Default `/admin`. */
  basePath?: string | undefined
}>(), { app: undefined, model: undefined, basePath: '/admin' })

const { t } = usePachiI18n(messages)
const api = provideAdminApi()

/** Router dell'app (nessuna dipendenza da vue-router: si usa `$router` se c'è). */
const router = (getCurrentInstance()?.proxy as unknown as { $router?: { push: (to: string) => unknown } } | null)?.$router as { push: (to: string) => unknown, replace: (to: string) => unknown } | undefined

const models = ref<IAdminModelInfo[]>([])
const loading = ref(true)
const errorText = ref('')
const local = ref<{ app: string, model: string } | null>(null)

/** Selezione da route o locale. */
const routeSelection = computed(() => {
  if (props.app && props.model) return { app: props.app, model: props.model }
  return local.value
})

/** Modello attivo nella lista. */
function isActive(m: IAdminModelInfo): boolean {
  const sel = routeSelection.value
  return !!sel && sel.app === m.app && sel.model === m.model
}

/**
 * Seleziona un modello (aggiorna la route se c'è un router).
 *
 * @param m - modello scelto
 */
function select(m: IAdminModelInfo): void {
  local.value = { app: m.app, model: m.model }
  const to = `${props.basePath}/${encodeURIComponent(m.app)}/${encodeURIComponent(m.model)}`
  if (router) void router.push(to)
}

/** Carica l'elenco dei modelli visibili. */
async function loadModels(force = false): Promise<void> {
  loading.value = true
  errorText.value = ''
  try {
    models.value = visibleModels(await fetchAdminModels(api, force))
    setAdminModels(models.value)
  } catch (err) {
    errorText.value = (await describeRequestError(err, (k, p) => t(k, p ?? {}))).message
  } finally {
    loading.value = false
  }
}

watch(() => [props.app, props.model], () => { local.value = null })
onMounted(() => void loadModels())
</script>

<style lang="scss" src="../styles/admin.scss"></style>
